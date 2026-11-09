import {readFileSync,writeFileSync} from 'node:fs';
const databaseId=process.env.CLOUDFLARE_DATABASE_ID?.trim();
if(!databaseId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId))throw Error('Configure CLOUDFLARE_DATABASE_ID com o UUID do banco D1 da Sislop');
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
config.d1_databases[0].database_id=databaseId;
writeFileSync('wrangler.deploy.json',JSON.stringify(config,null,2));
