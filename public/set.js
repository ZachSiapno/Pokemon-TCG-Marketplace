/*
    This program is acts almost like a subbranch for the main marketplacd function
*/

let setName = document.getElementById("setName");
let searchBox = document.getElementById("search");
let searchButton = document.getElementById("searchButton");
let message = document.getElementById("message");
let cardsDiv = document.getElementById("cards");

// This uses the set ID from the page URL (e.g., set.html?id=swsh3 gets the Pokemon TCG set from "Sword & Shield—Darkness Ablaze")
let setId = window.location.pathname.split("/")[2];

// Creates one box for a card and adds it to the page.
function addCard(card) {
    let box = document.createElement("div");

    // Some cards won't have an image so only add one and display it if it exists.
    if (card.image) {
        let picture = document.createElement("img");
        picture.src = card.image;
        picture.alt = card.name;
        picture.height = 200;
        picture.loading = "lazy";
        // hide the broken image if a URL doesn't actually load the picture correctly
        picture.addEventListener("error", () => {
            picture.style.display = "none";
        });
        box.appendChild(picture);
    }

    let name = document.createElement("p");
    name.textContent = card.name;
    box.appendChild(name);

    // display the card's number within a set.
    let number = document.createElement("p");
    number.textContent = "No. " + card.localId;
    box.appendChild(number);
    // add completed box for a TCG card to page.
    cardsDiv.appendChild(box);
}

// The server will display cards in the set that match whatever is in the search box.
// The server will display every card in the set if the user searches nothing in the search box.
function loadCards() {
    fetch("/sets/" + encodeURIComponent(setId) + "/cards?name=" + encodeURIComponent(searchBox.value)).then(async (response) => {
        message.style.color = "black";

        // clear the previous search results first.
        cardsDiv.textContent = "";

        // Display the server's error mesage if the request was unsuccessful.
        if (!response.ok) {
            message.style.color = "red";

            return response.text().then((text) => {
                message.textContent = text;
            });
        }

        // update page with returned set information.
        const data = await response.json();
        setName.textContent = data.name;
        document.title = data.name;         // the browser tab's title
        if (data.cards.length === 0) {
            message.textContent = "No cards match that search";
            return;
        }

        message.textContent = "Showing " + data.cards.length + " of " + data.total + " cards";

        for (let card of data.cards) {
            addCard(card);
        }
    }).catch((error) => {
        // request itself failed, so there was no answer from our server at all
        message.style.color = "red";
        message.textContent = "Bad request";
        console.log(error);
    });
}

// load matching cards when "Search" is clicked.
searchButton.addEventListener("click", () => {
    loadCards();
});

// Load set if an ID was provided in the url.
if (!setId) {
    message.style.color = "red";
    message.textContent = "No set chosen. Go back to the sets and click one.";
} else {
    loadCards();
}
