CREATE DATABASE pokemontcg;
\c pokemontcg
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(30),
	email VARCHAR(255),
	password VARCHAR(255)
);
