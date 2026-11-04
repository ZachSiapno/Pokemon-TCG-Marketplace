let express = require("express");
let { Pool } = require("pg");
//let env = require("../env.json");

let hostname = "localhost";
let port = 3000;
let app = express();

app.use(express.json());
app.use(express.static("public"));

/*  
let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});
*/


app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});