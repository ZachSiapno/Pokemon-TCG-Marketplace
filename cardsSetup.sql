-- The cards table: one row for every Pokemon card we copy over from TCGdex.
-- Packs will pick cards from this table by rarity.
-- Run it once with:   npm run setupCards

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,      -- TCGdex card id, like "base1-4"
    name TEXT,                -- "Charizard"
    set_id TEXT,              -- which set it is in, like "base1"
    local_id TEXT,            -- the number printed on the card, like "4"
    rarity TEXT,              -- "Common", "Rare", ... (empty for a few cards)
    image TEXT                -- image address WITHOUT the ending (add "/low.webp" or "/high.webp")
);

-- Makes "give me a random Rare card from set X" fast
CREATE INDEX IF NOT EXISTS cards_set_rarity_index ON cards (set_id, rarity);
