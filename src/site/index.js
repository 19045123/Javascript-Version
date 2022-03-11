function fetchQA(terms, boxGods, boxLASaga, boxMechanics, boxWorldbuilding) {
    $.ajax({
        type: 'POST',
        url: '/search',
        data: JSON.stringify({
            terms,
            boxGods,
            boxLASaga,
            boxMechanics,
            boxWorldbuilding,
        }),
        contentType: 'application/json',
        success: (qas) => {
            const list = $('#list');
            list.empty();
            list.append('<tr><th>Question</th><th>Answer</th><th>Topic</th></tr>');
            for (let qa of qas) {
                list.append(`<tr><td>${qa.question}</td><td>${qa.answer}</td><td>${qa.topic}</td></tr>`);
            }
        }
    });
}


function insertQA(question, answer, topic) {
    $.ajax({
        type: 'POST',
        url: '/insert',
        data: JSON.stringify({
            question,
            answer,
            topic,
        }),
        contentType: 'application/json',
        success: (res) => {
            $('#insert input[name="question"]').val('');
            $('#insert input[name="answer"]').val('');
            $('#insert input[name="topic"]').val('');
            fetchQA('');
        },
    });
}

function login(username, password) {
    $.ajax({
        type: 'POST',
        url: '/login',
        data: JSON.stringify({
            username,
            password,
        }),
        contentType: 'application/json',
        success: (res) => {
            $('#login').remove();
        },
    });
}

fetchQA('');
$('#insert').on('submit', (event) => {
    event.preventDefault();
    const question = $('#insert input[name="question"]').val();
    const answer = $('#insert input[name="answer"]').val();
    const topic = $('#insert select[name="topic"]').val();
    insertQA(question, answer, topic);
});
$('#login').on('submit', (event) => {
    event.preventDefault();
    const username = $('#login input[name="username"]').val();
    const password = $('#login input[name="password"]').val();
    login(username, password);
});
$('#search').on('submit', (event) => {
    event.preventDefault();
    const terms = $('#search input[name="terms"]').val();
    let boxGods = $('#search input[name="boxGods"]').is(':checked') ? "true" : "false";
    let boxLASaga = $('#search input[name="boxLASaga"]').is(':checked') ? "true" : "false";
    let boxMechanics = $('#search input[name="boxMechanics"]').is(':checked') ? "true" : "false";
    let boxWorldbuilding = $('#search input[name="boxWorldbuilding"]').is(':checked') ? "true" : "false";
    fetchQA(terms, boxGods, boxLASaga, boxMechanics, boxWorldbuilding);
});

let debounce;
$('#insert input').on('keydown', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        const question = $('#insert input[name="question"]').val();
        const answer = $('#insert input[name="answer"]').val();
        console.log('User has now stopped typing.', { question, answer });
        if (question && answer) {
            // call your new /classify endpoint with { question, answer }
            // get the result and do ????? with it
        }
    }, 250);
});