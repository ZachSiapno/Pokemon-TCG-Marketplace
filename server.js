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

app.post("/signup", (req, res) => {
  const { username, email, password, confirmPassword } = req.body || {};

// FUTURE NOTE CHECK FOR DUPLICATE ACCOUNTS NOT ADDED YET!!!!!!!!!
// FUTURE NOTE 2 ADD VALIDATION FOR EMAILS ETC

  if (password !== confirmPassword) {
    console.log("Password does not match the confirmed password")
    return res.status(400).send("Passwords do not match");
  }

  pool.query(
    `INSERT INTO users (username, email, password) VALUES($1, $2, $3)`,
    [username, email, password]
  )

  console.log("Account created!");
  return res.status(200).send();
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});