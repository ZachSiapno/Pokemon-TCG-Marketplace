/*
    for card.html

    Shows everything about one card: a big picture, a table of details and its attacks.
    Flow: read the card's id from the address (like /card/swsh3-136), ask our server for that
    card (GET /cards/:id in server.js), then fill in the page.

    Elements this file needs from card.html:
        id="backLink"  the link at the top, changed to go back to this card's set
        id="cardName"  the big heading, filled in with the card's name
        id="message"   the line of text under the heading, only used for errors
        id="picture"   the empty div the card's picture goes into
        id="details"   the empty table that the detail rows get added into
        id="moves"     the empty div that abilities and attacks get added into
*/

let backLink = document.getElementById("backLink");
let cardName = document.getElementById("cardName");
let message = document.getElementById("message");
let pictureDiv = document.getElementById("picture");
let detailsTable = document.getElementById("details");
let movesDiv = document.getElementById("moves");

// The address looks like /card/swsh3-136, and window.location.pathname is the part after the website name.
// split("/") cuts it at every slash into ["", "card", "swsh3-136"], so [2] is the card's id.
// If the address has no id, [2] doesn't exist and cardId is undefined.
let cardId = window.location.pathname.split("/")[2];

// Adds one row to the details table, like  Rarity | Uncommon
// Cards don't all have every detail (a Trainer card has no hp), so rows with nothing to show are skipped.
function addRow(label, value) {
    if (value === null || value === undefined || value === "") {
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

// Adds an ability or an attack to the moves section, like:
//     Tail Smash - 90
//     Cost: Colorless
//     Flip a coin. If tails, this attack does nothing.
// title is the heading line, cost is a list like ["Colorless"] (abilities have none), effect is the description
function addMove(title, cost, effect) {
    let box = document.createElement("div");

    let heading = document.createElement("h3");
    heading.textContent = title;
    box.appendChild(heading);

    // join turns ["Colorless", "Fire"] into "Colorless, Fire"
    if (cost.length > 0) {
        let costLine = document.createElement("p");
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
    cardName.textContent = card.name;
    document.title = card.name;         // the browser tab's title

    // the back link goes to the card's own set instead of the list of every set
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

    // the number in the set, like 136/189. official is how many numbered cards the set has
    let number = card.localId;
    if (card.set.official) {
        number = card.localId + "/" + card.set.official;
    }

    // join turns a list like ["Colorless"] into text. An empty list becomes "", which addRow skips
    addRow("Set", card.set.name);
    addRow("Number", number);
    addRow("Rarity", card.rarity);
    addRow("Category", card.category);
    addRow("Stage", card.stage);
    addRow("Evolves from", card.evolveFrom);
    addRow("HP", card.hp);
    addRow("Type", card.types.join(", "));
    addRow("Weakness", typesText(card.weaknesses));
    addRow("Resistance", typesText(card.resistances));
    addRow("Illustrator", card.illustrator);
    addRow("Regulation mark", card.regulationMark);
    addRow("Pokedex number", card.dexId.join(", "));

    // abilities first, then attacks, in the order the card prints them
    for (let ability of card.abilities) {
        addMove("Ability: " + ability.name, [], ability.effect);
    }

    for (let attack of card.attacks) {
        let title = attack.name;
        // damage is missing on attacks that only have an effect, like drawing cards
        if (attack.damage) {
            title = attack.name + " - " + attack.damage;
        }
        addMove(title, attack.cost, attack.effect);
    }

    // the flavor text printed on the card, only some cards have it
    if (card.description) {
        let description = document.createElement("p");
        description.textContent = card.description;
        movesDiv.appendChild(description);
    }
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
