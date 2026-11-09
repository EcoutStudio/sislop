CREATE TABLE records (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('shows','tasks','contacts','finance','posts','media')),
 data TEXT NOT NULL CHECK(json_valid(data)),
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX records_kind ON records(kind);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
