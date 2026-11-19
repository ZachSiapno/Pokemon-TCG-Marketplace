-- I created this database because we needed a way for the server to know what cards a logged in user owns
-- as well as how many coins are currently in their online balance
-- Every user gets a coin balance. Existing users start with 100 coins too.
-- CHECK (coins >= 0) makes Postgres refuse any change that would make a balance negative.
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT NOT NULL DEFAULT 100 CHECK (coins >= 0);

-- The inventory - one row for each card copy a user owns.
--    If you own 3 copies of a card, there are 3 rows.
--    user_id has to be a real user, and card_id has to be a real card in the cards table.
CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    card_id TEXT NOT NULL REFERENCES cards(id),
    obtained_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Makes "show me this user's cards" much more efficient
-- We don't have to check every single row in the table and instead jump to that user's rows for info on their card collection.
CREATE INDEX IF NOT EXISTS user_cards_user_index ON user_cards (user_id);
