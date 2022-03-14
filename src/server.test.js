const createServer = require('./server.js');
const assert = require('assert');
const axios = require('axios');
const performance = require('perf_hooks');

let cookie;

const fetch = async (endpoint, body) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    try {
        const method = body ? 'post' : 'get';
        const res = await axios[method](`http://localhost:3000/${endpoint}`, body, { headers });
        if (res.headers['set-cookie']) {
            cookie = res.headers['set-cookie'][0];
        }
        return res.data;
    } catch (err) {
        return;
    }
}

createServer(async function() {
    await fetch('register', { username: 'bob', password: 'jim' });
    console.log('Registered bob');

    await assert.strictEqual(await fetch('insert', { question: 'Can I hack this API?', answer: 'No' }), undefined);
    console.log('Cannot hack this');

    await assert.strictEqual(await fetch('login', { wrong: 'props' }), undefined);
    console.log('Cannot log in with invalid request');

    await assert.strictEqual(await fetch('login', { username: 'haha', password: 'nobody' }), undefined);
    console.log('Cannot log in with non-existent account');

    await assert.strictEqual(await fetch('login', { username: 'bob', password: 'wrongpassword' }), undefined);
    console.log('Cannot log in with wrong password');

    await fetch('login', { username: 'bob', password: 'jim' });
    console.log('Logged in as bob');

    await fetch('logout');
    console.log('Logged out bob');

    const startTime = performance.performance.now();
    const preload = require('./preload.json');
    for (const topic in preload) {
        for (const question in preload[topic]) {
            const answer = preload[topic][question];
            // console.log('Inserting', { question, answer, topic });
            await fetch('insert', { question, answer, topic });
        }
    }
    const endTime = performance.performance.now();
    const elapsed = endTime - startTime;
    console.log({ elapsed });
    process.exit(0);
});