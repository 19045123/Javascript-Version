const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite = require('sqlite3');
const path = require('path');
const { addDocumentAndTrain, classify, loadClassifier, saveClassifier } = require('./ai2');
const crypto = require('crypto');
const performance = require('perf_hooks');
const { promisify } = require('util');

const db = new sqlite.Database(process.env.NODE_ENV === 'test' ? ':memory:' : './website.db');
db.run = promisify(db.run.bind(db));
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));
const scrypt = promisify(crypto.scrypt.bind(crypto));

const app = express();

app.use(express.json());

app.use(cookieParser());

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(password, salt, 16);
    await db.run('insert into users (username, passwordHash, salt) values (?, ?, ?)', [username, passwordHash.toString('hex'), salt.toString('hex')]);
    return res.json({ status: 'OK' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!(username && password)) return res.status(400).json({ status: 'Bad Request' });
    const passwordContent = await db.get('select passwordHash, salt from users where username = ?', [username]);
    if (!passwordContent) {
        return res.status(401).json({ status: 'Forbidden' }); 
    } else {
        // console.log(passwordContent.salt);
        const salt = Buffer.from(passwordContent.salt, 'hex');
        const passwordHashConfirm = await scrypt(password, salt, 16)
        if (passwordHashConfirm.toString('hex') === passwordContent.passwordHash) {
            const sessionID = crypto.randomBytes(8).toString('hex');
            const expiryTime = Date.now() + 999999;
            await db.all('insert into sessions (sessionID, expiresAt) values (?, ?)', [sessionID, expiryTime]);
            res.cookie('session', sessionID, { maxAge: 999999 });
            return res.json({ status: 'OK' });
        } else { 
            return res.status(401).json({ status: 'Forbidden' }); 
        };   
    };
});

app.post('/search', async (req, res) => {
    const { terms, boxGods, boxLASaga, boxMechanics, boxWorldbuilding } = req.body;
    const topics = [];
    if (boxGods === 'true') topics.push('gods');
    if (boxLASaga === 'true') topics.push('LASagaRules');
    if (boxMechanics === 'true') topics.push('mechanics');
    if (boxWorldbuilding === 'true') topics.push('worldbuilding');
    const topicOr = `(${topics.map(t => `topic = "${t}"`).join(' OR ')})`;

    if (!terms) {
        const where = topics.length > 0 ? ` where ${topicOr}` : '';
        const rows = await db.all(`select question, answer, topic from qa ${where};`, []);
        return res.json(rows);
    } else {
        // use classifier to classify user's query and determine what topic it's about
        // search database for answers which are from this topic
        const startTime = performance.performance.now();
        const classifications = await classify(terms);
        const endTime = performance.performance.now();
        const elapsed = endTime - startTime;
        const { label, value } = classifications[0];
        console.log({ terms, classifications, elapsed});
        
        const matchesOnTopics = await db.all('select id, question, answer, topic from qa where topic = ?', [label]);
        const matchesOnWords = await db.all('select id, question, answer, topic from qa where question like ? or answer like ?', [`%${terms}%`, `%${terms}%`]);
        return res.json([...matchesOnWords, ...matchesOnTopics].filter((row, i, arr) => {
            if (topics.length > 0 && !topics.includes(row.topic)) return false;
            return arr.findIndex((r) => r.id === row.id) === i;
        }));
    };
});

const checkLogin = async (req, res, next) => {
    const sessionId = req.cookies && req.cookies.session;
    const currentTime = Date.now();
    // console.log('Checking login');
    // console.log({ sessionId, currentTime });
    if (!sessionId) {
        return res.status(401).json({ status: 'Forbidden' });
    } else { 
        const sessions = await db.all('select sessionID from sessions where sessionID = ? and expiresAt > ?', [sessionId, currentTime]);
        // console.log('Found sessions', sessions);
        if (!(req.cookies && req.cookies.session && sessions.length > 0 && req.cookies.session === sessions[0].sessionID)) {
            return res.status(401).json({ status: 'Forbidden' });
        }
        // console.log("didn't break");
        next();
    };
};

app.post('/insert', checkLogin, async (req, res, next) => {
    const { question, answer, topic } = req.body;
    if (!(question && answer && topic)) return res.status(400).json({ status: 'Bad Request' });
    try {
        await db.run('insert into qa (question, answer, topic) values (?, ?, ?)', [question, answer, topic]);
    } catch (err) {
        // return next(err);
        return res.status(409).json({ status: 'Conflict' });
    }
    // train the classifier here
    // persist the classifier to SQLite
    await addDocumentAndTrain(`${question} ${answer}`, topic);
    await saveClassifier(db);
    return res.json({ status: 'OK' });
});

app.get('/session', checkLogin, async (req, res) => {
    return res.json({ status: 'OK' });
});

app.get('/logout', checkLogin, async (req, res) =>{
    const sessionId = req.cookies && req.cookies.session;
    if (!sessionId) {
        return res.status(401).json({ status: 'Forbidden' });
    } else { 
        const sessions = await db.all('delete from sessions where sessionID = ? ', [sessionId]);
        const check = await db.all('select * from sessions');
        console.log('Logged out.', check);
        return res.json({ status: 'OK' });
    }
});

app.post('/classify', async (req, res) => {
    const { question, answer } = req.body;
    const classification = await classify(`${question} ${answer}`);
    console.log(question, answer, classification);
    return res.json({ classification: classification[0] });
});

app.use(express.static(path.join(__dirname, 'site')));

module.exports = async function(cb) {
    await db.run('create table if not exists sessions (id integer primary key, sessionID text, expiresAt integer, unique(sessionID))');
    await db.run('create table if not exists users (id integer primary key, username text, passwordHash text, salt text)');
    await db.run('create table if not exists qa (id integer primary key, question text, answer text, topic text, unique(question))');
    await db.run('create table if not exists classifier (id integer primary key, classification text)');
    await loadClassifier(db);
    app.listen(3000, () => {
        console.log('Server started on port 3000');
        setInterval(async () => {
            const sessions = await db.all('delete from sessions where expiresAt < ?', [Date.now()]);
            console.log('Deleted sessions', sessions);
        }, 600000);
        if (cb) cb();
    });
};