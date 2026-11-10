ALTER TABLE users ADD COLUMN access_profile TEXT NOT NULL DEFAULT 'full' CHECK(access_profile IN ('full','editor','production','finance','viewer'));
ALTER TABLE users ADD COLUMN can_publish INTEGER NOT NULL DEFAULT 1;
ALTER TABLE records ADD COLUMN created_by TEXT;
ALTER TABLE records ADD COLUMN created_at TEXT;
ALTER TABLE records ADD COLUMN completed_by TEXT;
ALTER TABLE records ADD COLUMN completed_at TEXT;
CREATE TABLE record_activity (
 id INTEGER PRIMARY KEY,
 record_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 title TEXT NOT NULL,
 actor TEXT NOT NULL,
 event TEXT NOT NULL,
 detail TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX record_activity_record ON record_activity(record_id,id DESC);
CREATE INDEX record_activity_kind ON record_activity(kind,id DESC);
CREATE TABLE presence (
 username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
 last_seen INTEGER NOT NULL,
 area TEXT NOT NULL
);
UPDATE records SET created_by=(SELECT actor FROM audit_log WHERE record_id=records.id AND action='create' ORDER BY id LIMIT 1),created_at=COALESCE((SELECT strftime('%Y-%m-%dT%H:%M:%fZ',created_at) FROM audit_log WHERE record_id=records.id AND action='create' ORDER BY id LIMIT 1),updated_at);
INSERT INTO record_activity(record_id,kind,title,actor,event,detail,created_at)
 SELECT r.id,r.kind,json_extract(r.data,'$.title'),a.actor,a.action,CASE a.action WHEN 'create' THEN 'Criou este registro' ELSE 'Atualização anterior ao histórico detalhado' END,strftime('%Y-%m-%dT%H:%M:%fZ',a.created_at)
 FROM audit_log a JOIN records r ON r.id=a.record_id WHERE a.action IN ('create','update');
UPDATE records SET data=json_set(data,'$.published',json('true')),updated_by='publicacao-confirmada',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id='2ef72576-7591-5376-8259-ca8433b2c2b2' AND kind='shows';
INSERT INTO record_activity(record_id,kind,title,actor,event,detail) SELECT id,kind,json_extract(data,'$.title'),'sistema','publish','Show confirmado disponibilizado na agenda pública a pedido da banda' FROM records WHERE id='2ef72576-7591-5376-8259-ca8433b2c2b2';
