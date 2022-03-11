const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite = require('sqlite3');
const path = require('path');
const { addDocumentAndTrain, classify } = require('./ai2');
const crypto = require('crypto');
const { getSystemErrorMap } = require('util');
const performance = require('perf_hooks');

const db = new sqlite.Database(process.env.NODE_ENV === 'test' ? ':memory:' : './website.db');

const app = express();

app.use(express.json());

app.use(cookieParser());

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 16, (err, passwordHash) => {
        if (err) throw err;
        db.run('insert into users (username, passwordHash, salt) values (?, ?, ?)', [username, passwordHash.toString('hex'), salt.toString('hex')], (err) => {
            // console.log(username, passwordHash.toString('hex'), salt.toString('hex'));
            if (err) throw err;
            return res.json({ status: 'OK' });
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!(username && password)) return res.status(400).json({ status: 'Bad Request' });
    db.get('select passwordHash, salt from users where username = ?', [username], (err, passwordContent) => {
        if (err) throw err;
        if (!passwordContent) {
            return res.status(401).json({ status: 'Forbidden' }); 
        }
        else {
            // console.log(passwordContent.salt);
            const salt = Buffer.from(passwordContent.salt, 'hex');
            crypto.scrypt(password, salt, 16, (err, passwordHashConfirm) => {
                // console.log(passwordHashConfirm.toString('hex'));
                if (err) throw err;
                if (passwordHashConfirm.toString('hex') === passwordContent.passwordHash) {
                    
                    const sessionID = crypto.randomBytes(8).toString('hex');
                    const expiryTime = Date.now() + 999999;
                    db.all('insert into sessions (sessionID, expiresAt) values (?, ?)', [sessionID, expiryTime], (err) => {
                        if (err) throw err;
                        res.cookie('session', sessionID, { maxAge: 999999 });
                        return res.json({ status: 'OK' });
                    });
                }
                else { 
                    return res.status(401).json({ status: 'Forbidden' }); 
                };
            });
        };
    });
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
        db.all(`select question, answer, topic from qa ${where};`, [], (err, rows) => {
            if (err) throw err;
            return res.json(rows);
        });
    } else {
        // use classifier to classify user's query and determine what topic it's about
        // search database for answers which are from this topic
        const startTime = performance.performance.now();
        const classifications = await classify(terms);
        const endTime = performance.performance.now();
        const elapsed = endTime - startTime;
        const { label, value } = classifications[0];
        console.log({ terms, classifications, elapsed});
        
        db.all('select id, question, answer, topic from qa where topic = ?', [label], (err, matchesOnTopics) => {
            if (err) throw err;
            db.all('select id, question, answer, topic from qa where question like ? or answer like ?', [`%${terms}%`, `%${terms}%`], (err, matchesOnWords) => {
                if (err) throw err;
                return res.json([...matchesOnWords, ...matchesOnTopics].filter((row, i, arr) => {
                    if (topics.length > 0 && !topics.includes(row.topic)) return false;
                    return arr.findIndex((r) => r.id === row.id) === i;
                }));
            });
        });
    }
});

const checkLogin = (req, res, next) => {
    const sessionId = req.cookies && req.cookies.session;
    const currentTime = Date.now();
    console.log('Checking login');
    console.log({ sessionId, currentTime });
    if (!sessionId) {
        return res.status(401).json({ status: 'Forbidden' });
    } else { 
        db.all('select sessionID from sessions where sessionID = ? and expiresAt > ?', [sessionId, currentTime], (err, sessions) => {
            if (err) throw err;
            console.log('Found sessions', sessions);
            if (!(req.cookies && req.cookies.session && sessions.length > 0 && req.cookies.session === sessions[0].sessionID)) {
                return res.status(401).json({ status: 'Forbidden' });
            }
            next();
        });
    }
}

app.post('/insert', checkLogin, async (req, res) => {
    const { question, answer, topic } = req.body;
    if (!(question && answer && topic)) return res.status(400).json({ status: 'Bad Request' });
    // train the classifier here
    // persist the classifier to SQLite
    db.run('insert into qa (question, answer, topic) values (?, ?, ?)', [question, answer, topic], (err) => {
        if (err) throw err;
        return res.json({ status: 'OK' });
    });
});

app.get('/session', checkLogin, async (req, res) => {
    return res.json({ status: 'OK' });
})

app.use(express.static(path.join(__dirname, 'site')));


module.exports = function(cb) {
    db.run('create table if not exists sessions (id integer primary key, sessionID text, expiresAt integer, unique(sessionID))', (err) => {
        if (err) throw err; 
        db.run('create table if not exists users (id integer primary key, username text, passwordHash text, salt text)', (err) => {
            if (err) throw err;
            db.run('create table if not exists qa (id integer primary key, question text, answer text, topic text, unique(question))', (err) => {
                if (err) throw err;
                app.listen(3000, () => {
                    console.log('Server started on port 3000');
                    setInterval(() => {
                        db.all('delete from sessions where expiresAt < ?', [Date.now()], (err, sessions) => {
                            console.log('Deleted sessions', sessions);
                        }, 600000);
                    });
                    if (cb) cb();
                });
            }); 
        });
    });
}