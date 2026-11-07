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
// This is the base requests
let tcgdexUrl = "https://api.tcgdex.net/v2/en";

// GET /sets
app.get("/sets", (req, res) => {
  // axios.get gives back a promise, and .then runs when TCGdex has answered
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


app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});