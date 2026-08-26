-- Placar dos jogos e mural de recados.
-- Rode uma vez: npx wrangler d1 execute kiq --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS placar (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  jogo   TEXT    NOT NULL,
  nome   TEXT    NOT NULL,
  pontos INTEGER NOT NULL,
  ip     TEXT    NOT NULL,   -- hash com sal, nunca o endereço em claro
  em     TEXT    NOT NULL    -- ISO 8601
);

CREATE INDEX IF NOT EXISTS placar_topo ON placar (jogo, pontos DESC);
CREATE INDEX IF NOT EXISTS placar_ip   ON placar (ip, em);

CREATE TABLE IF NOT EXISTS mural (
  id    TEXT    NOT NULL PRIMARY KEY,
  texto TEXT    NOT NULL,
  nome  TEXT    NOT NULL,
  cor   INTEGER NOT NULL,
  ip    TEXT    NOT NULL,   -- idem
  em    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS mural_em ON mural (em DESC);
CREATE INDEX IF NOT EXISTS mural_ip ON mural (ip, em);
