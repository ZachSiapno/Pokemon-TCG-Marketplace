CREATE DATABASE pokemontcg;
\c pokemontcg
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(30),
	email VARCHAR(255),
	password_hash TEXT
);

CREATE TABLE follows (
    follower_id INT REFERENCES users(id),
    following_id INT REFERENCES users(id),
    PRIMARY KEY (follower_id, following_id),

	CHECK (follower_id <> following_id)
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,

    user_id INT REFERENCES users(id),

    content TEXT NOT NULL,

    post_type VARCHAR(20)
        DEFAULT 'post',

    trade_offer TEXT,
    trade_want TEXT,

    trade_status VARCHAR(20)
        DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Every Pokemon card copied over from TCGdex (filled in by importCards.js)
CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    name TEXT,
    set_id TEXT,
    local_id TEXT,
    rarity TEXT,
    image TEXT
);

CREATE INDEX cards_set_rarity_index ON cards (set_id, rarity);

-- Which cards each user owns (one row per copy)
CREATE TABLE user_cards (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    card_id TEXT NOT NULL REFERENCES cards(id),
    obtained_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index so "show me this user's cards" is fast:
-- We can jump straight to one user's rows instead of checking every row in the table
CREATE INDEX user_cards_user_index ON user_cards (user_id);
