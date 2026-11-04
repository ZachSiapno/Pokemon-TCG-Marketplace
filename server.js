let express = require("express");
let { Pool } = require("pg");
let env = require("./env.json");

let hostname = "localhost";
let port = 3000;
let app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});

app.post("/signup", (req, res) => {
  const { username, email, password, confirmPassword } = req.body || {};

  if (password !== confirmPassword) {
    console.log("Password does not match the confirmed password")
    return res.status(500).send()
  }

  pool.query(
    `INSERT INTO users (username, email, password) VALUES($1, $2, $3)`,
    [username, email, password]
  )

  res.status(200).send("Account created!");
});


app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});