// for market.html
//
// Shows every Pokemon TCG set, grouped by series (Sword & Shield, Sun & Moon ...).
// Flow: ask our server for the list of sets (GET /sets in server.js). Every set says which series
// it is in, so as each set is added this file makes the series' heading and box the first time it
// sees that series, and puts the set into it.
// market.css lines the set boxes up five to a row.
//
// Elements this file needs from market.html:
//     id="message"  the line of text at the top: "Loading sets...", then "N sets in N series", or a red error
//     id="series"   the empty div that the series sections get added into

let seriesDiv = document.getElementById("series");
let message = document.getElementById("message");

// Finds the box where a set belongs, which is the box of the series it is in.
// The first time a series shows up there is no box for it yet, so this makes one:
//     <section> <h2>Sword & Shield</h2> <div id="sets-swsh" class="sets"> (set boxes go here) </div> </section>
// set looks like { id: "swsh3", name: "Darkness Ablaze", serieId: "swsh", serie: "Sword & Shield", ... }
function getSeriesRow(set) {
    // each series' div has an id made from the series id, so we can find it again for its other sets
    let row = document.getElementById("sets-" + set.serieId);
    if (row) {
        return row;
    }

    let section = document.createElement("section");

    // textContent (not innerHTML) so a weird series name can never be treated as HTML
    let heading = document.createElement("h2");
    heading.textContent = set.serie;
    section.appendChild(heading);

    // this div holds the set boxes. The "sets" class is what market.css lines up five to a row
    row = document.createElement("div");
    row.id = "sets-" + set.serieId;
    row.className = "sets";
    section.appendChild(row);

    seriesDiv.appendChild(section);
    return row;
}

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

    // add completed box to the box of its series.
    getSeriesRow(set).appendChild(box);
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

    for (let set of sets) {
        addSet(set);
    }

    // every series that has at least one set has a section now, so counting the sections counts the series
    message.textContent = sets.length + " sets in " + seriesDiv.children.length + " series";
}).catch((error) => {
    // fetch itself failed, so there was no answer from our server at all
    message.style.color = "red";
    message.textContent = "Bad request";
    console.log(error);
});
