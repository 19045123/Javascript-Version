const natural = require('natural');
const classifier = new natural.BayesClassifier();
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
        classifier.events.on('trainedWithDocument', event => {
            res();
        });
    });
    classifier.train();
    await training;
}

async function classify(doc) {
    await training;
    return classifier.getClassifications(doc);
}

module.exports = { addDocumentAndTrain, classify };