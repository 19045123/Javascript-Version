const natural = require('natural');
let classifier = new natural.BayesClassifier();
const mechanicalRulesData = require('./training/mechanics.json');
const godsData = require('./training/gods.json');
const worldbuildingData = require('./training/worldbuilding.json');
const lasagaRulesData = require('./training/lasaga.json');
for (let document of mechanicalRulesData) {
    classifier.addDocument(document, 'mechanics');
}
for (let document of godsData) {
    classifier.addDocument(document, 'gods');
}
for (let document of worldbuildingData) {
    classifier.addDocument(document, 'worldbuilding');
}
for (let document of lasagaRulesData) {
    classifier.addDocument(document, 'LASagaRules');
}
let progress = 0;
let total = mechanicalRulesData.length + godsData.length + worldbuildingData.length + lasagaRulesData.length;
let training = new Promise(res => {
    classifier.events.on('trainedWithDocument', (event) => {
        progress++;
        if (progress === total) {
            res();
        }
    });
});

classifier.train();

// console.log(classifier.getClassifications("Okay I'm confused about the magic item loot rolls. Like are they the magic items I'm allowed to have available for players to find on the quest or are they just the magic items that become unlocked for people to buy after the quest."));

async function addDocumentAndTrain(doc, label) {
    await training;
    classifier.addDocument(doc, label);
    training = new Promise(res => {
        const cb = () => {
            classifier.events.removeListener('trainedWithDocument', cb);
            res();
        };
        classifier.events.on('trainedWithDocument', cb);
    });
    classifier.train();
    await training;
}

async function classify(doc) {
    await training;
    return classifier.getClassifications(doc);
}

async function saveClassifier(db) {
    // call this function every time a user adds a document
    const json = JSON.stringify(classifier);
    await db.all('insert into classifier (id, classification) values (?, ?) on conflict(id) do update set classification=excluded.classification', [1, json]);
    console.log("It saved.", json.slice(0, 32));
    // write this json to a table in the database where you store saved classifiers.
}

async function loadClassifier(db) {
    // call this function when the server starts up but before binding to the port
    const rows = await db.all('select classification from classifier'); // load the most recently saved classifier from the db
    if (rows.length > 0) {
        classifier = natural.BayesClassifier.restore(JSON.parse(rows[0].classification));
        console.log("Classifier loaded!");
    }    
    // if no saved classifier found, then do nothing.
}

module.exports = { addDocumentAndTrain, classify, saveClassifier, loadClassifier };