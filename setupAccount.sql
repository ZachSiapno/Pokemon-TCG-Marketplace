CREATE DATABASE pokemontcg;
\c pokemontcg
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(30),
	email VARCHAR(255),
	password VARCHAR(255)
);

CREATE TABLE follows (
    follower_id INT REFERENCES users(id),
    following_id INT REFERENCES users(id),
    PRIMARY KEY (follower_id, following_id)

	CHECK (follower_id <> following_id)
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);