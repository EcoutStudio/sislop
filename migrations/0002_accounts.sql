CREATE TABLE users (
 username TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','member')),
 password_hash TEXT,
 salt TEXT,
 enabled INTEGER NOT NULL DEFAULT 1,
 must_change_password INTEGER NOT NULL DEFAULT 1
);
INSERT INTO users(username,name,role) VALUES
 ('henrique','Henrique Melo','admin'),
 ('antonio','Antônio Anísio','member'),
 ('breno','Breno Phernan','member'),
 ('cassio','Cassio Ledo','member');
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 username TEXT NOT NULL REFERENCES users(username),
 expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_username ON sessions(username);
CREATE TABLE auth_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
