/*
    for card.html

    Shows everything about one card: a big picture, the set it's from, a table of details,
    the weakness and resistance, and its attacks.
    Flow: read the card's id from the address (like /card/swsh3-136), ask our server for that
    card (GET /cards/:id in server.js), then fill in the page.

    Elements this file needs from card.html:
        id="cardName"    the big heading, filled in with the card's number and name
        id="message"     the line of text under the heading, only used for errors
        id="layout"      the three columns, hidden until the card has loaded
        id="setName"     left box: the name of the set the card is from
        id="setNumber"   left box: the card's number in that set, like 136/189
        id="details"     the empty table that the detail rows get added into
        id="traitsBox"   the weakness and resistance box, shown only if the card has either one
        id="traitLabels" the row of labels in that box (Weakness, Resistance)
        id="traitValues" the row of values under those labels
        id="picture"     the empty div the card's picture goes into
        id="moves"       the empty div that abilities and attacks get added into
        id="summary"     right box: pokedex number, type, stage and hp
        id="backLink"    the button at the bottom right, changed to go back to this card's set
*/

let cardName = document.getElementById("cardName");
let message = document.getElementById("message");
let layout = document.getElementById("layout");
let setName = document.getElementById("setName");
let setNumber = document.getElementById("setNumber");
let detailsTable = document.getElementById("details");
let traitsBox = document.getElementById("traitsBox");
let traitLabels = document.getElementById("traitLabels");
let traitValues = document.getElementById("traitValues");
let pictureDiv = document.getElementById("picture");
let movesDiv = document.getElementById("moves");
let summaryDiv = document.getElementById("summary");
let backLink = document.getElementById("backLink");

// The address looks like /card/swsh3-136, and window.location.pathname is the part after the website name.
// split("/") cuts it at every slash into ["", "card", "swsh3-136"], so [2] is the card's id.
// If the address has no id, [2] doesn't exist and cardId is undefined.
let cardId = window.location.pathname.split("/")[2];

// Cards don't all have every detail (a Trainer card has no hp), so anything with nothing to show is skipped.
// 0 is a real value, so it is not skipped.
function hasValue(value) {
    return !(value === null || value === undefined || value === "");
}

// Adds one row to the details table, like  Rarity | Uncommon
function addRow(label, value) {
    if (!hasValue(value)) {
        return;
    }

    let row = document.createElement("tr");

    let head = document.createElement("th");
    head.textContent = label;
    row.appendChild(head);

    // textContent (not innerHTML) so weird text from the card can never be treated as HTML
    let cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);

    detailsTable.appendChild(row);
}

// Adds one line to the box on the right, like  Type: Metal
function addLine(label, value) {
    if (!hasValue(value)) {
        return;
    }

    let line = document.createElement("p");
    line.textContent = label + ": " + value;
    summaryDiv.appendChild(line);
}

// Adds one column to the battle traits box: the label on top and its value underneath.
// The box starts hidden, so the first trait that is added shows it.
function addTrait(label, value) {
    if (!hasValue(value)) {
        return;
    }

    let head = document.createElement("td");
    head.textContent = label;
    traitLabels.appendChild(head);

    let cell = document.createElement("td");
    cell.textContent = value;
    traitValues.appendChild(cell);

    traitsBox.hidden = false;
}

// Adds an ability or an attack to the moves section, like:
//     Tail Smash                                   90
//     Cost: Colorless
//     Flip a coin. If tails, this attack does nothing.
// name is the heading, damage is shown on the right (abilities and some attacks have none),
// cost is a list like ["Colorless"] (abilities have none), effect is the description
function addMove(name, damage, cost, effect) {
    let box = document.createElement("div");

    // the heading holds two pieces, the name and the damage, which the CSS puts at opposite ends
    let heading = document.createElement("h3");
    let nameText = document.createElement("span");
    nameText.textContent = name;
    heading.appendChild(nameText);

    if (damage) {
        let damageText = document.createElement("span");
        damageText.textContent = damage;
        heading.appendChild(damageText);
    }
    box.appendChild(heading);

    // join turns ["Colorless", "Fire"] into "Colorless, Fire"
    if (cost.length > 0) {
        let costLine = document.createElement("p");
        costLine.className = "cost";
        costLine.textContent = "Cost: " + cost.join(", ");
        box.appendChild(costLine);
    }

    if (effect) {
        let effectLine = document.createElement("p");
        effectLine.textContent = effect;
        box.appendChild(effectLine);
    }

    movesDiv.appendChild(box);
}

// Turns a list of weaknesses or resistances like [{ type: "Fighting", value: "×2" }] into "Fighting ×2"
function typesText(list) {
    return list.map((item) => {
        // value can be missing, so only add it if it's there
        if (item.value) {
            return item.type + " " + item.value;
        }
        return item.type;
    }).join(", ");
}

// Fills the whole page from the card the server sent.
// card looks like { id: "swsh3-136", name: "Furret", rarity: "Uncommon", hp: 110, types: ["Colorless"], attacks: [...], ... }
function showCard(card) {
    // the heading is the number then the name, like "136 - Furret"
    cardName.textContent = card.localId + " - " + card.name;
    document.title = card.name;         // the browser tab's title

    // the back button goes to the card's own set instead of the list of every set
    if (card.set.id) {
        backLink.href = "/set/" + encodeURIComponent(card.set.id);
        backLink.textContent = "Back to " + card.set.name;
    }

    // some cards have no picture, so skip the img in that case
    if (card.image) {
        let picture = document.createElement("img");
        picture.src = card.image;
        picture.alt = card.name;
        picture.height = 450;
        // hide the broken image icon if the picture address doesn't actually load
        picture.addEventListener("error", () => {
            picture.style.display = "none";
        });
        pictureDiv.appendChild(picture);
    }

    // LEFT COLUMN
    // the number in the set, like 136/189. official is how many numbered cards the set has
    let number = card.localId;
    if (card.set.official) {
        number = card.localId + "/" + card.set.official;
    }
    setName.textContent = card.set.name;
    setNumber.textContent = "No. " + number;

    addRow("Rarity", card.rarity);
    addRow("Category", card.category);
    addRow("Illustrator", card.illustrator);
    addRow("Regulation mark", card.regulationMark);

    // join turns a list like ["Colorless"] into text. An empty list becomes "", which is skipped
    addTrait("Weakness", typesText(card.weaknesses));
    addTrait("Resistance", typesText(card.resistances));

    // RIGHT COLUMN
    addLine("Pokedex No.", card.dexId.join(", "));
    addLine("Type", card.types.join(", "));
    addLine("Stage", card.stage);
    addLine("Evolves from", card.evolveFrom);

    // hp gets its own line so the number can be big: a small "HP" and then the number
    if (hasValue(card.hp)) {
        let hpLine = document.createElement("p");
        hpLine.className = "hp";
        hpLine.textContent = "HP ";
        let hpNumber = document.createElement("strong");
        hpNumber.textContent = card.hp;
        hpLine.appendChild(hpNumber);
        summaryDiv.appendChild(hpLine);
    }

    // MIDDLE COLUMN, under the picture
    // abilities first, then attacks, in the order the card prints them
    for (let ability of card.abilities) {
        addMove("Ability: " + ability.name, null, [], ability.effect);
    }

    // damage is missing on attacks that only have an effect, like drawing cards
    for (let attack of card.attacks) {
        addMove(attack.name, attack.damage, attack.cost, attack.effect);
    }

    // the flavor text printed on the card, only some cards have it
    if (card.description) {
        let description = document.createElement("p");
        description.textContent = card.description;
        movesDiv.appendChild(description);
    }

    // everything is filled in, so show the three columns
    layout.hidden = false;
}

// This runs as soon as the page loads.
// The inner .then handles the server answering (good or bad),
// and the outer .catch handles the request not getting through at all (server off, no connection)
function loadCard() {
    fetch("/cards/" + encodeURIComponent(cardId)).then(async (response) => {
        message.style.color = "black";

        // the server answered but said something went wrong (like our 404 "Card not found"),
        // so show the server's own text in red and stop
        if (!response.ok) {
            message.style.color = "red";

            return response.text().then((text) => {
                message.textContent = text;
            });
        }

        // the card sent by the /cards/:id route
        const card = await response.json();
        message.textContent = "";
        showCard(card);
    }).catch((error) => {
        // fetch itself failed, so there was no answer from our server at all
        message.style.color = "red";
        message.textContent = "Bad request";
        console.log(error);
    });
}

if (!cardId) {
    message.style.color = "red";
    message.textContent = "No card chosen. Go back to the sets and click one.";
} else {
    loadCard();
}
