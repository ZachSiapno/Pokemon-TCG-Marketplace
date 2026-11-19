/*
we run "npm run importCards", though we only need to do it once thankfully

    This copies Pokemon cards from TCGdex into our own "cards" table, because our packs on Pokemon TCG Marketplace will
    randomly generate pick cards by their rarity, and TCGdex only tells us a card's rarity when we ask for
    that one card by itself.

How we do it:
- Decide which sets to import (i.e. for now for the sake of testing, I've limited it to importing 3 VGC card sets, will eventually do all of them).
- For each set, ask TCGdex for the set's list of cards.
- For each card, ask TCGdex for the full card (this is where rarity is) and save a row.

*/

let axios = require("axios");
let { Pool } = require("pg");
let env = require("./env.json");

let tcgdexUrl = "https://api.tcgdex.net/v2/en";

// Which sets to import: a list of set ids, or the word "all"
let setsToImport = ["base1", "base2", "swsh3"];   // for testing
// let setsToImport = "all";                      // for the full import

// How long to wait between requests to TCGdex, in milliseconds.
// The problem before I added this was that TCGdex is free, and answered "503" and refused to answer for some cases
// so we add this pause variable to not overwhelm the API.
let pauseMs = 300;

// When TCGdex refuses a request (like 503), we wait and try the same request again.
let maxTries = 4;         // how many times to try one request before giving up on it
let retryWaitMs = 5000;   // wait before the 2nd try. It doubles each time: 5s, 10s, 20s

// If this many cards in a row fail even after the retries, something is wrong
// (most likely TCGdex is blocking us), so we stop instead of piling up more failed
// requests. Wait a few minutes and run the script again.
let maxFailsInARow = 5;

let pool = new Pool(env);

// Wait for a number of milliseconds.
// "await pause(100)" below means "stop here for 100 milliseconds, then keep going".
function pause(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// Ask TCGdex for something (like "/sets/base1") and give back its data.
// If TCGdex says no (like 503 "try later"), wait a bit and try again, a few times.
async function getFromTcgdex(path) {
    let wait = retryWaitMs;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
        try {
            let response = await axios.get(tcgdexUrl + path, { timeout: 15000 });
            return response.data;
        } catch (error) {
            let status = null;
            if (error.response) {
                status = error.response.status;
            }

            // 404 means it truly does not exist, so trying again will not help.
            // Also give up if this was the last try.
            if (status === 404 || attempt === maxTries) {
                throw error;
            }

            console.log("  " + error.message + ". Waiting " + (wait / 1000) + "s, then trying again...");
            await pause(wait);
            wait = wait * 2;
        }
    }
}

// Give back the list of set ids to import
async function getSetIds() {
    // A short list was written at the top, so just use it
    if (setsToImport !== "all") {
        return setsToImport;
    }

    // "all": ask TCGdex for every set and keep just the ids
    let allSets = await getFromTcgdex("/sets");

    let ids = [];
    for (let set of allSets) {
        ids.push(set.id);
    }
    return ids;
}

// Import every card of one set.
// Returns how many cards were saved, skipped (already there) and failed,
// and "stopped: true" if TCGdex kept refusing us and we gave up early.
async function importSet(setId) {
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    let failsInARow = 0;
    let stopped = false;

    // The set request includes a short list of the set's cards (id, number, name, image)
    let set = await getFromTcgdex("/sets/" + setId);

    // Some sets could have no card list at all
    let cardList = set.cards;
    if (!cardList) {
        cardList = [];
    }

    console.log(set.name + " (" + setId + "): " + cardList.length + " cards");

    for (let brief of cardList) {
        try {
        // Already saved? Then skip it without asking TCGdex anything.
        let existing = await pool.query("SELECT id FROM cards WHERE id = $1", [brief.id]);
        if (existing.rows.length > 0) {
            skipped = skipped + 1;
            continue;
        }

        // Ask for the full card, because the short version does not have rarity
        let card = await getFromTcgdex("/cards/" + brief.id);

        // Some cards have no rarity or no image. Save those as empty (null) instead of crashing.
        let rarity = card.rarity;
        if (rarity === undefined) {
            rarity = null;
        }
        let image = card.image;
        if (image === undefined) {
            image = null;
        }

        await pool.query(
            `INSERT INTO cards (id, name, set_id, local_id, rarity, image)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING`,
            [card.id, card.name, setId, card.localId, rarity, image]
        );
        saved = saved + 1;
        failsInARow = 0;

        await pause(pauseMs);
        } catch (error) {
        // One bad card should not stop the whole import. Say which one, and move on.
        // Running the script again later will try this card again.
        console.log("  Could not save " + brief.id + ": " + error.message);
        failed = failed + 1;
        failsInARow = failsInARow + 1;

        // Too many failures in a row means TCGdex is blocking us. Stop here.
        if (failsInARow >= maxFailsInARow) {
            console.log("  Too many failures in a row, so stopping. TCGdex may be blocking us (wait a few minutes),");
            console.log("  or the database may not be reachable. Then run the script again.");
            stopped = true;
            break;
        }
        }
    }

    console.log("  saved " + saved + ", skipped " + skipped + ", failed " + failed);
    return { saved: saved, skipped: skipped, failed: failed, stopped: stopped };
}

// The main part. It is inside a function because async/await cannot be used at the top
// level of a script.
async function main() {
    let setIds = await getSetIds();
    console.log("Importing " + setIds.length + " set(s)...");

    let totalSaved = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let setId of setIds) {
        try {
        let result = await importSet(setId);
        totalSaved = totalSaved + result.saved;
        totalSkipped = totalSkipped + result.skipped;
        totalFailed = totalFailed + result.failed;

        // TCGdex was refusing us, so do not start the next set
        if (result.stopped) {
            break;
        }
        } catch (error) {
        console.log("Could not load set " + setId + ": " + error.message);

        // 404 means just this set id is wrong, so go on to the next set.
        // Anything else (like 503) means TCGdex is refusing us, so stop.
        let status = null;
        if (error.response) {
            status = error.response.status;
        }
        if (status !== 404) {
            console.log("TCGdex is not answering right now, so stopping. Wait a few minutes, then run the script again.");
            break;
        }
        }
        await pause(pauseMs);
    }

    console.log("");
    console.log("Done. Saved " + totalSaved + ", skipped " + totalSkipped + ", failed " + totalFailed);
    if (totalFailed > 0) {
        console.log("Run the script again to retry the cards that failed.");
    }

    // Show how many cards there are of each rarity. We will use this to design the packs.
    let counts = await pool.query(
        `SELECT rarity, COUNT(*) AS how_many
        FROM cards
        GROUP BY rarity
        ORDER BY how_many DESC`
    );
    console.log("");
    console.log("Cards in the table, by rarity:");
    for (let row of counts.rows) {
        let name = row.rarity;
        if (name === null) {
        name = "(no rarity)";
        }
        console.log("  " + name + ": " + row.how_many);
    }

    await pool.end();
}

main().catch((error) => {
    console.log("The import stopped: " + error.message);
    pool.end();
});