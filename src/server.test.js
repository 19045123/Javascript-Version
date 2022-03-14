const createServer = require('./server.js');
const assert = require('assert');
const axios = require('axios');
const performance = require('perf_hooks');
const { get } = require('express/lib/response');

let cookie;

const post = async (endpoint, body) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    try {
        const res = await axios.post(`http://localhost:3000/${endpoint}`, body, { headers });
        if (res.headers['set-cookie']) {
            cookie = res.headers['set-cookie'][0];
        }
        return res.data;
    } catch (err) {
        return;
    }
}

createServer(async function() {
    await post('register', { username: 'bob', password: 'jim' });
    console.log('Registered bob');

    await assert.strictEqual(await post('insert', { question: 'Can I hack this API?', answer: 'No' }), undefined);
    console.log('Cannot hack this');

    await assert.strictEqual(await post('login', { wrong: 'props' }), undefined);
    console.log('Cannot log in with invalid request');

    await assert.strictEqual(await post('login', { username: 'haha', password: 'nobody' }), undefined);
    console.log('Cannot log in with non-existent account');

    await assert.strictEqual(await post('login', { username: 'bob', password: 'wrongpassword' }), undefined);
    console.log('Cannot log in with wrong password');

    await post('login', { username: 'bob', password: 'jim' });
    console.log('Logged in as bob');

    // await get('logout');
    // console.log('Logged out bob');

    const startTime = performance.performance.now();
    const preload = require('./preload.json');
    for (const topic in preload) {
        for (const question in preload[topic]) {
            const answer = preload[topic][question];
            // console.log('Inserting', { question, answer, topic });
            await post('insert', { question, answer, topic });
        }
    }
    const endTime = performance.performance.now();
    const elapsed = endTime - startTime;
    console.log({ elapsed });
    process.exit(0);
});