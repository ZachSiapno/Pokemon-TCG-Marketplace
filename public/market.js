// for market.html

let setsDiv = document.getElementById("sets");
let message = document.getElementById("message");

// Makes one box for a set and adds it to the page.
// set looks like { id: "base1", name: "Base Set", logo: "https://...webp", cardCount: 102 }
// Each box ends up as:  <div id="base1"> <img> <h3>Base Set</h3> <p>102 cards</p> </div>
function addSet(set) {
    let box = document.createElement("div");
    // the box's id is the set's id, so later we can find the box for a set (clicking it, filtering it)
    box.id = set.id;

    // logo is null when TCGdex has no picture for the set, so skip the img in that case
    if (set.logo) {
        let logo = document.createElement("img");
        logo.src = set.logo;
        logo.alt = set.name + " logo";
        logo.height = 60;
        // a set can have a logo address that doesn't actually load (I tried looking at https://tcgdex.net/database and that didn't work at times),
        // so hide the broken image icon instead of showing it
        logo.addEventListener("error", () => {
            logo.style.display = "none";
        });
        box.appendChild(logo);
    }

    // textContent (not innerHTML) so a weird set name can never be treated as HTML
    let name = document.createElement("h3");
    name.textContent = set.name;
    box.appendChild(name);

    let count = document.createElement("p");
    count.textContent = set.cardCount + " cards";
    box.appendChild(count);

    // nothing shows up until the box is added to the page
    setsDiv.appendChild(box);
}

// This runs as soon as the page loads, there's no button to click (at least not yet).
fetch("/sets").then(async (response) => {
    message.style.color = "black";

    // the server answered but said something went wrong (like our 500 "Could not load the sets"), so show the server's own text in red and stop
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