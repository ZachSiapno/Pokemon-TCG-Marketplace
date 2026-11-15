let express = require("express");
let axios = require("axios");
let { Pool } = require("pg");
let env = require("./env.json");
/* New inputs added to use for authentication based on the class notes. https://www.cs.drexel.edu/~nkl43/cs375/readings/5a_auth/ */
let cookieParser = require("cookie-parser");
let argon2 = require("argon2");
let crypto = require("crypto");

let hostname = "localhost";
let port = 3000;
let app = express();

//app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());   // lets us read cookies with req.cookies

app.use(express.static("public"));

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});

/*
  SESSIONS: TOKENS AND COOKIES
*/

let tokens = {};

let tokenLifetime = 60 * 60 * 1000;

let cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV == "production"
}

// Make a random 32 byte token; uses the exact line from https://www.cs.drexel.edu/~nkl43/cs375/readings/5a_auth/3_sessions/
function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Log a user in: make a token, save it, and put it in a cookie on the response
function startSession(res, userId) {
  let token = makeToken();
  tokens[token] = { userId: userId, createdAt: Date.now() };
  res.cookie("token", token, cookieOptions);
}


// Look up a token. Return the user's id, or null if the token is missing, fake or too old.
function getUserId(token) {
  if (token === undefined || !tokens.hasOwnProperty(token)) {
    return null;
  }

  // The cookie's own expiry can be edited by the user, so we check the age ourselves
  if (Date.now() - tokens[token].createdAt > tokenLifetime) {
    delete tokens[token];
    return null;
  }

  return tokens[token].userId;
}

// Middleware: put this before a route that needs a logged in user.
// If the user is not logged in, it sends 403 and the route never runs.
// If they are, it saves their id in req.userId and calls next() to continue to the route.
let authMiddleware = (req, res, next) => {
  let userId = getUserId(req.cookies.token);

  if (userId === null) {
    return res.status(403).send("Please log in first");
  }

  req.userId = userId;
  next();
};

// Every hour, a.k.a. when a user session expires, delete tokens that are too old.
setInterval(() => {
  for (let token in tokens) {
    if (Date.now() - tokens[token].createdAt > tokenLifetime) {
      delete tokens[token];
    }
  }
}, 60 * 60 * 1000);

/*
  SIGNUP AND LOGIN PAGES
*/

app.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body || {};

// FUTURE NOTE CHECK FOR DUPLICATE ACCOUNTS NOT ADDED YET!!!!!!!!!
// FUTURE NOTE 2 ADD VALIDATION FOR EMAILS ETC
// ADD SESSION STORAGE WHEN SIMILAR TO LOGIN WHEN SIGNUP
  if (typeof username !== "string" || typeof password !== "string" ||
      username.length < 1 || username.length > 25 ||
      password.length < 1 || password.length > 100) {
    return res.status(400).send("Invalid username or password");
  }
  if (password !== confirmPassword) {
    console.log("Password does not match the confirmed password")
    return res.status(400).send("Passwords do not match");
  }

  // Before anything, we first check if the username is not already taken
  try {
    const existing = await pool.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).send("That username is already taken");
    }

    const passwordHash = await argon2.hash(password);

    const created = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username`,
      [username, email, password]
    );
    console.log("Account created!");

    const user = created.rows[0];
    startSession(res, user.id);

    return res.status(201).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Failed to create account");
  }
});


// POST /login
app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  // FUTURE NOTE 2 ADD VALIDATION FOR LOGINS ETC
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).send("Invalid username or password");
  }

  const userData = await loginUser(username, password);

  try {
    if (!userData) { return res.status(401).send("Invalid username or password"); }

    // Logged in: make a token and send it as a cookie
    startSession(res, userData.id);

    return res.status(201).json(userData);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Login failed");
  }
});


// POST /logout
app.post("/logout", (req, res) => {
  let token = req.cookies.token;

  if (token !== undefined) {
    delete tokens[token];
  }

  res.clearCookie("token", cookieOptions);
  res.json({ message: "Success" });
});

// GET /me
// This function the browser who is logged in, according to the token cookie.
// authMiddleware already made sure the user is logged in and saved their id in req.userId.
app.get("/me", authMiddleware, (req, res) => {
  pool.query("SELECT id, username FROM users WHERE id = $1", [req.userId])
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(403).send("Please log in first");
      }
      res.json(result.rows[0]);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Could not load your account");
    });
});



async function loginUser(username, password) {
  try {
    // Find user by username only.
    const data = await pool.query(
      `SELECT id, username, password_hash
      FROM users 
      WHERE username=$1 
      LIMIT 1`,
      [username]
    )  

    if (data.rows.length === 0) {
      return null;
    }
    const userConfirmed = data.rows[0];

    const matches = await argon2.verify(userConfirmed.password_hash, password);
    if (!matches) {
      return null;
    }
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



// Building the list of sets takes about 20 requests to TCGdex, so it is slow.
// After the first request finishes, the finished list is saved in this variable,
// and every later request from any visitor just gets the saved copy.
// The list stays the same until the server restarts.
let setsCache = null;

// GET /sets
// Return list of sets with information needed by the marketplace.
// Each set also says which series it is in (Base, Neo, Sword & Shield ...), so market.js can group them.
// Success: 200 and [{ id: "swsh3", name: "Darkness Ablaze", logo: "https://...webp", cardCount: 201, serieId: "swsh", serie: "Sword & Shield" }, ...]
// Failure: 500 and the text "Could not load the sets"
app.get("/sets", (req, res) => {
  if (setsCache) {
    return res.json(setsCache);
  }

  // TCGdex's list of sets doesn't say which series each set is in. Its list of series does:
  // asking for a single series (/series/swsh) gives that series' name and the sets inside it.
  // So first ask for the list of series, then ask for every series in it.
  axios.get(`${tcgdexUrl}/series`).then((response) => {
    let requests = response.data.map((serie) => {
      return axios.get(`${tcgdexUrl}/series/${encodeURIComponent(serie.id)}`);
    });

    // Promise.all sends all of those requests at the same time and waits until every one has answered.
    // The answers come back in the same order as the requests. If any one fails, it goes to the .catch below.
    return Promise.all(requests);
  }).then((responses) => {
    let sets = [];

    // one response per series, and each series has its own list of sets
    for (let response of responses) {
      let serie = response.data;

      for (let set of serie.sets || []) {
        let logo = null;
        if (set.logo) {
          logo = set.logo + ".webp";
        }

        let cardCount = 0;
        if (set.cardCount) {
          cardCount = set.cardCount.total;
        }

        // serieId and serie are what market.js uses to put the set under the right series heading.
        // The sets stay in TCGdex's order, which keeps the sets of a series next to each other.
        sets.push({
          id: set.id,
          name: set.name,
          logo: logo,
          cardCount: cardCount,
          serieId: serie.id,
          serie: serie.name
        });
      }
    }

    setsCache = sets;
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

// GET /cards/:id
// Returns the details of one card. Unlike the card list inside a set, one card from TCGdex has
// everything: rarity, hp, attacks and so on. TCGdex sends more than the page needs
// (like prices), so this builds a smaller object with only what card.js shows.

app.get("/cards/:id", (req, res) => {
  let cardId = req.params.id;

  axios.get(`${tcgdexUrl}/cards/${encodeURIComponent(cardId)}`).then((response) => {
    let card = response.data;

    // The set info inside a card doesn't say which series the set belongs to,
    // but the set's own page does (it has "serie": { id: "swsh", name: "Sword & Shield" }).
    // So this asks TCGdex for the set as well, and passes the card and the series name on together.
    if (!card.set || !card.set.id) {
      return { card: card, serie: null };
    }

    return axios.get(`${tcgdexUrl}/sets/${encodeURIComponent(card.set.id)}`).then((setResponse) => {
      let serie = null;
      if (setResponse.data.serie) {
        serie = setResponse.data.serie.name;
      }
      return { card: card, serie: serie };
    }).catch((err) => {
      // The series is one extra detail, not worth failing the whole card for.
      // The card is still sent, without a series.
      console.log(err);
      return { card: card, serie: null };
    });
  }).then((result) => {
    let card = result.card;

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

    // card.set is the set this card belongs to. cardCount.official is how many numbered cards it has.
    // serie is the series name we looked up above.
    let set = { id: null, name: null, official: null, serie: result.serie };
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