let express = require("express");
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

  try {
    await pool.query(
      `INSERT INTO users (username, email, password) VALUES($1, $2, $3)`,
      [username, email, password]
    )
  

  console.log("Account created!");
  return res.status(201).send();
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
  
  return res.status(200).json(userData);
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

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});