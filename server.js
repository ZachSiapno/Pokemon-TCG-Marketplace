let express = require("express");
let axios = require("axios");
let { Pool } = require("pg");
let env = require("./env.json");

let hostname = "localhost";
let port = 3000;
let app = express();

//app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});

/*
  SIGNUP AND LOGIN PAGES
*/

app.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body || {};

// FUTURE NOTE CHECK FOR DUPLICATE ACCOUNTS NOT ADDED YET!!!!!!!!!
// FUTURE NOTE 2 ADD VALIDATION FOR EMAILS ETC
// ADD SESSION STORAGE WHEN SIMILAR TO LOGIN WHEN SIGNUP
  if (password !== confirmPassword) {
    console.log("Password does not match the confirmed password")
    return res.status(400).send("Passwords do not match");
  }

  // Account register
  try {
    await pool.query(
      `INSERT INTO users (username, email, password) VALUES($1, $2, $3)`,
      [username, email, password]
    )

  console.log("Account created!");
  const userData = await loginUser(username, password);

  // Account login
  try {
    if (!userData) { return res.status(401).send("Invalid username or password"); }
  
    return res.status(201).json(userData);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Login failed");
  }

  } catch (err) {
    console.log(err);
    return res.status(500).send("Failed to create account");
  }
});



app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  // FUTURE NOTE 2 ADD VALIDATION FOR LOGINS ETC
  const userData = await loginUser(username, password);

  try {
    if (!userData) { return res.status(401).send("Invalid username or password"); }
  
    return res.status(201).json(userData);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Login failed");
  }
});



async function loginUser(username, password) {
  try {
    const data = await pool.query(
      `SELECT id, username, password 
      FROM users 
      WHERE username=$1 
      AND password=$2 
      LIMIT 1`,
      [username, password]
    )  

    if (data.rows.length === 0) {
      return null;
    }
    const userConfirmed = data.rows[0];
    console.log("login confirmed");

    return {
        id: userConfirmed.id,
        username: userConfirmed.username,
    }
  } catch (err) {
    console.log(err);
  }
}

/*
  MARKETPLACE: SETS
*/

// TCGdex is the free Pokemon card database we get the sets from
// This is the base UrL we will use to access info.
let tcgdexUrl = "https://api.tcgdex.net/v2/en";

// GET /sets
// Return list of sets with information needed by the marketplace
app.get("/sets", (req, res) => {
  // Request list of sets from TCG API
    axios.get(`${tcgdexUrl}/sets`).then((response) => {
    // the list of sets is in response.data
    let sets = response.data.map((set) => {
      let logo = null;
      if (set.logo) {
        logo = set.logo + ".webp";
      }

      let cardCount = 0;
      if (set.cardCount) {
        cardCount = set.cardCount.total;
      }

      return { id: set.id, name: set.name, logo: logo, cardCount: cardCount };
    });

    return res.json(sets);
  }).catch((err) => {
    // runs if the request failed or anything inside the .then threw an error
    console.log(err);
    return res.status(500).send("Could not load the sets");
  });
});

/*
  MARKETPLACE: THE SET PAGE
*/

// GET /set/:id (for example /set/swsh3)
// Sends back set.html. It's the same page for every set, set.js reads the id from the address.
app.get("/set/:id", (req, res) => {
  res.sendFile(__dirname + "/public/set.html");
});

// GET /sets/:id/cards
// Returns the cards the complete list of cards belonging to a specific set, with an
app.get("/sets/:id/cards", (req, res) => {
  let setId = req.params.id;

  // represents the text typed into the search box,
  let search = req.query.name
  // use empty string if there's nothing.
  if (!search) {
    search = "";
  }
  // lowecase it so stuff like "PIKACHU" and "pikachu" match the same cards
  search = search.toLowerCase()

  axios.get(`${tcgdexUrl}/sets/${encodeURIComponent(setId)}`).then((response) => {
    let set = response.data;
    let allCards = set.cards || [];

    let cards = allCards.filter((card) => {
      // a card with no name just never matches a search
      let cardName = card.name

      if (!cardName) {
        cardName = "";
      }
      cardName = cardName.toLowerCase();
      
      return cardName.includes(search);
    }).map((card) => {
      let image = null;
      if (card.image) {
        // the image is a base address; a size and file type are added so that we can get an actual picture
        image = card.image + "/low.webp";
      }

      return { id: card.id, localId: card.localId, name: card.name, image: image };
    });

    return res.json({ id: set.id, name: set.name, total: allCards.length, cards: cards });
  }).catch((err) => {
    // Case where there is no id with the tcg set like that.
    if (err.response && err.response.status === 404) {
      return res.status(404).send("Set not found");
    }

    console.log(err);
    return res.status(500).send("Could not load the cards");
  });
});

/*
  MARKETPLACE: How I want it to display a card's page
*/
// GET /card/:id (for example /card/swsh3-136)
// Sends back card.html. It's the same page for every card, card.js reads the id from the address.
app.get("/card/:id", (req, res) => {
  res.sendFile(__dirname + "/public/card.html");
});

// GET /cards/:id (for example /cards/swsh3-136)
// Returns the details of one card. Unlike the card list inside a set, one card from TCGdex has
// everything: rarity, hp, attacks and so on. TCGdex sends more than the page needs
// (like prices), so this builds a smaller object with only what card.js shows.
// Success: 200 and { id, name, rarity, hp, types, attacks, ... } (fields a card doesn't have are null or [])
// Failure: 404 "Card not found" if TCGdex has no card with that id, or 500 "Could not load the card"
app.get("/cards/:id", (req, res) => {
  let cardId = req.params.id;

  axios.get(`${tcgdexUrl}/cards/${encodeURIComponent(cardId)}`).then((response) => {
    let card = response.data;

    // Trainer and Energy cards have no hp, types or attacks, so every list falls back to
    // an empty list and every single value falls back to null instead of crashing.
    let attacks = (card.attacks || []).map((attack) => {
      return {
        name: attack.name,
        cost: attack.cost || [],
        damage: attack.damage || null,
        effect: attack.effect || null
      };
    });

    let abilities = (card.abilities || []).map((ability) => {
      return { type: ability.type || null, name: ability.name, effect: ability.effect || null };
    });

    let image = null;
    if (card.image) {
      // the image is a base address, so add a size and file type. high is bigger than the low one on the set page
      image = card.image + "/high.webp";
    }

    // card.set is the set this card belongs to. cardCount.official is how many numbered cards it has
    let set = { id: null, name: null, official: null };
    if (card.set) {
      set.id = card.set.id;
      set.name = card.set.name;
      if (card.set.cardCount) {
        set.official = card.set.cardCount.official;
      }
    }

    return res.json({
      id: card.id,
      localId: card.localId,
      name: card.name,
      image: image,
      category: card.category || null,
      rarity: card.rarity || null,
      hp: card.hp || null,
      types: card.types || [],
      stage: card.stage || null,
      evolveFrom: card.evolveFrom || null,
      description: card.description || null,
      illustrator: card.illustrator || null,
      regulationMark: card.regulationMark || null,
      dexId: card.dexId || [],
      attacks: attacks,
      abilities: abilities,
      weaknesses: card.weaknesses || [],
      resistances: card.resistances || [],
      set: set
    });
  }).catch((err) => {
    // TCGdex answered 404 because there is no card with that id. That's not our server breaking
    if (err.response && err.response.status === 404) {
      return res.status(404).send("Card not found");
    }
    console.log(err);
    return res.status(500).send("Could not load the card");
  });
});


app.get("/profile/:username", async (req, res) => {
  const user = req.params.username;

  try {
    const userData = await pool.query(
      `SELECT id, username
      FROM users
      WHERE username=$1
      `,
      [user]
    );

    if (userData.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const id = userData.rows[0].id;
    const username = userData.rows[0].username;

    const followerData = await pool.query( // YOUR NUMBER OF FOLLOWERS
      `SELECT COUNT(*) AS follower_count
      FROM follows
      WHERE following_id=$1
      `,
      [id]
    );

    const followingData  = await pool.query( // NUMBER OF PEOPLE YOU'RE FOLLOWING
      `SELECT COUNT(*) AS following_count
      FROM follows
      WHERE follower_id=$1
      `,
      [id]
    );


    const followerCount = followerData.rows[0].follower_count;
    const followingCount = followingData.rows[0].following_count;

    res.status(200).json({
      id: id,
      username: username,
      followerCount: followerCount,
      followingCount: followingCount
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send("Server error");
  }
});



app.get("/profile/:username", async (req, res) => {
  const user = req.params.username;

  try {
    const userData = await pool.query(
      `SELECT id, username
      FROM users
      WHERE username=$1
      `,
      [user]
    );

    if (userData.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const id = userData.rows[0].id;
    const username = userData.rows[0].username;

    const followerData = await pool.query( // YOUR NUMBER OF FOLLOWERS
      `SELECT COUNT(*) AS follower_count
      FROM follows
      WHERE following_id=$1
      `,
      [id]
    );

    const followingData  = await pool.query( // NUMBER OF PEOPLE YOU'RE FOLLOWING
      `SELECT COUNT(*) AS following_count
      FROM follows
      WHERE follower_id=$1
      `,
      [id]
    );


    const followerCount = followerData.rows[0].follower_count;
    const followingCount = followingData.rows[0].following_count;

    res.status(200).json({
      id: id,
      username: username,
      followerCount: followerCount,
      followingCount: followingCount
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send("Server error");
  }
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});