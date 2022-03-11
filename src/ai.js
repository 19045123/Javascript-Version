const natural = require('natural');
const classifier = new natural.BayesClassifier();
const dndData = [
    `Diabolical dangers await in this adventure for the world’s greatest roleplaying game. Welcome to Baldur's Gate, a city of ambition and corruption. You’ve just started your adventuring career, but already find yourself embroiled in a plot that sprawls from the shadows of Baldur's Gate to the front lines of the planes-spanning Blood War! Do you have what it takes to turn infernal war machines and nefarious contracts against the archdevil Zariel and her diabolical hordes? And can you ever hope to find your way home safely when pitted against the infinite evils of the Nine Hells?`,
    `Famed explorer Volothamp Geddarm needs you to complete a simple quest. Thus begins a mad romp through the wards of Waterdeep as you uncover a villainous plot involving some of the city’s most influential figures.`,
    `Rumors of demonic activity in the Underdark have reached the surface through whispers and hushed tales of violence. King Bruenor sends his friend Drizzt Do’Urden to find out what’s happening beneath the surface but it becomes all too clear when the demon lord Demogorgon ravages the drow city of Menzobarranzan. The Horned Lord Baphomet toys with victims in the vast maze of the Underdark and the Demon Queen of Fungi Zuggtmoy plans to join with a massive city-sized fungus in an insane marriage ceremony. Yeenoghu, the Demon Lord of Gnolls, wanders the dark, spawning new gnoll servants from his kills to continue the destruction, while the demon lords of lust and deception prey on the weak-willed peoples of the Underdark.`,
    `The talk of the streets and taverns has all been about the so-called death curse: a wasting disease afflicting everyone who’s ever been raised from the dead. Victims grow thinner and weaker each day, slowly but steadily sliding toward the death they once denied. When they finally succumb, they can’t be raised—and neither can anyone else, regardless of whether they’ve ever received that miracle in the past. Temples and scholars of divine magic are at a loss to explain a curse that has affected the entire region, and possibly the entire world. The cause is a necromantic artifact called the Soulmonger, which is located somewhere in Chult, a mysterious peninsula far to the south, ringed with mountains and choked with rainforests.`,
    `For years, the evil Cult of the Dragon has devoted itself to creating undead dragons in a vain attempt to fulfill an ancient prophecy. However, the cultists were misguided. They misunderstood. But now, under new leadership, the cult believes that the prophecy does not speak of undead dragons, but of a dragon empire that’s been extinct for 25,000 years. Tiamat, the queen of evil dragons, has languished in the Nine Hells for millennia. The cult believes that the time of her return is at hand.`,
];
const foodData = [
    `The Cheese Lover's Cookbook and Guide is her indispensable resource on buying, storing, cooking, and serving cheese, and even making your own cheese at home. In more than 150 recipes, Lambert presents a down-to-earth approach to cooking with many varieties, whether it's Gruyère, Camembert, or just tried-and-true Cheddar.`,
    `Jane's recipes are loved for being easy, customisable, and packed with your favourite flavours. Covering everything from gooey cookies and celebration cakes with a dreamy drip finish, to fluffy cupcakes and creamy no-bake cheesecakes, Jane's Patisserie is easy baking for everyone.`,
    `Sales of soup makers have increased recently as more and more of us discover how easy it is to create a tasty soup in under half an hour using one of these appliances. However, the instruction booklets sold with these soup makers often only include a restricted number of recipes. `,
];
for (let document of dndData) {
    classifier.addDocument(document, 'dnd');
}
for (let document of foodData) {
    classifier.addDocument(document, 'food');
}
let progress = 0;
let total = dndData.length + foodData.length;
let training = new Promise(res => {
    classifier.events.on('trainedWithDocument', (event) => {
        progress++;
        if (progress === total) {
            res();
        }
    });
});

classifier.train();

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