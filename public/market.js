// for market.html

let setsDiv = document.getElementById("sets");
let message = document.getElementById("message");

// Create a box displaying a Pokemon TCG set's logo, name, and number of cards in it.
function addSet(set) {
    let box = document.createElement("div");
    // the box's id is the set's id, so later we can find the box for a set (clicking it, filtering it)
    box.id = set.id;

    // some sets don't have a logo, so skip the img in that case
    if (set.logo) {
        let logo = document.createElement("img");
        logo.src = set.logo;
        logo.alt = set.name + " logo";
        logo.height = 60;
        // Hide the image if its URL doesn't load.
        logo.addEventListener("error", () => {
            logo.style.display = "none";
        });
        box.appendChild(logo);
    }

    // Create a link to the set's page using it's id
    let name = document.createElement("h3");
    let link = document.createElement("a");
    link.href = "/set/" + encodeURIComponent(set.id);
    link.textContent = set.name;
    name.appendChild(link);
    box.appendChild(name);

    // Displays number of cards in set.
    let count = document.createElement("p");
    count.textContent = set.cardCount + " cards";
    box.appendChild(count);

    // add completed box to the page.
    setsDiv.appendChild(box);
}

// This runs as soon as the page loads, there's no button to click (at least not yet).
fetch("/sets").then(async (response) => {
    message.style.color = "black";

    // Display server's error message if request was unsuccessful.
    if (!response.ok) {
        message.style.color = "red";
        return response.text().then((text) => {
            message.textContent = text;
        });
    }

    // the list of sets sent by the /sets route
    const sets = await response.json();
    message.textContent = sets.length + " sets";

    for (let set of sets) {
        addSet(set);
    }
}).catch((error) => {
    // fetch itself failed, so there was no answer from our server at all
    message.style.color = "red";
    message.textContent = "Bad request";
    console.log(error);
});