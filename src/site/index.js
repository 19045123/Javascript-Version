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
            list.append('<tr><th>Question</th><th>Answer</th><th class="topicHeader">Topic</th><th class="deleteHeader">Delete?</th></tr>');
            console.log(qas);
            for (let qa of qas) {
                list.append(`<tr id="QA${qa.id}"><td>${qa.question}</td><td>${qa.answer}</td><td>${qa.topic}</td><td><button class="deleteButton" onclick="deleteQA(${qa.id})">Delete</button></td></tr>`);
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
            const insertion = $('#suggested-topic');
            insertion.empty();
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
            loggedInPageState();
        },
    });
}

function deleteQA(id) {
    $.ajax({
        type: 'delete',
        url: `/delete/${id}`,
        success: (res) => {
            $(`#QA${id}`).remove();
        },
    });
}

function notLoggedPageState() {
    // console.log("Not logged in!");
    $("body").removeClass('loggedIn');
    $("body").addClass('loggedOut');
    $("#login").hide();
    $("#loginAppear").show();
    $("#insert").hide();
    $("#QAappear").hide();
    $("#logoutButton").hide();
    $('.deleteButton').hide();
}

function loggedInPageState() {
    // console.log("Logged in!");
    $("body").removeClass('loggedOut');
    $("body").addClass('loggedIn');
    $('#login').hide();
    $("#loginAppear").hide();
    $("#insert").hide();
    $("#QAappear").show();
    $("#logoutButton").show();
    $('.deleteButton').show();
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

$("#loginAppear").click(function(){
    $("#login").toggle();
});
$("#QAappear").click(function(){
    $("#insert").toggle();
});

$.ajax({
    type: 'GET',
    url: '/session',
    success: (res) => {
        loggedInPageState();
    },
    error: (res) => {
        notLoggedPageState();
    },
});

function logOut() {
    $.ajax({
        type: 'GET',
        url: '/logout',
        success: (res) => {
            notLoggedPageState();
        },
        error: (res) => {
            loggedInPageState();
        },
    });
}


let debounce;
$('#insert input').on('keydown', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        const question = $('#insert input[name="question"]').val();
        const answer = $('#insert input[name="answer"]').val();
        // console.log('User has now stopped typing.', { question, answer });
        if (question && answer) {
            // call your new /classify endpoint with { question, answer }
            // get the result and do ????? with it
            $.ajax({
                type: 'POST',
                url: '/classify',
                data: JSON.stringify({
                    question,
                    answer,
                }),
                contentType: 'application/json',
                success: (qas) => {
                    // console.log(qas);
                    const insertion = $('#suggested-topic');
                    insertion.empty();
                    insertion.text(`Your question and answer seems to be classified as ${(qas.classification.label)}. Make sure your topic is right!`);
                }
            });
        };
    }, 250);
});