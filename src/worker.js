import { createRemoteJWKSet, jwtVerify } from 'jose';
const kinds = ['shows','tasks','contacts','finance','posts','media'];
const members = ['Henrique Melo','Antônio Anísio','Breno Phernan','Cassio Ledo'];
const json = (data, status=200) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validate(kind, data) {
 if (!kinds.includes(kind) || !data || typeof data !== 'object' || Array.isArray(data)) throw Error('Registro inválido');
 const allowed = ['title','body','date','location','owner','status','email','phone','notes','amount','direction','published','url'];
 for (const key of Object.keys(data)) if (!allowed.includes(key)) throw Error('Campo desconhecido');
 if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 180) throw Error('Informe um título de até 180 caracteres');
 for (const [key,value] of Object.entries(data)) {
  if (key === 'published') { if (typeof value !== 'boolean') throw Error('Publicação inválida'); }
  else if (key === 'amount') { if (!Number.isSafeInteger(value) || value <= 0) throw Error('Valor deve ser positivo em centavos'); }
  else if (typeof value !== 'string' || value.length > 10000) throw Error('Campo inválido');
 }
 if (data.owner && !members.includes(data.owner)) throw Error('Responsável inválido');
 if (data.date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)))) throw Error('Data inválida');
 if (data.url) { const u = new URL(data.url); if (u.protocol !== 'https:') throw Error('Use links HTTPS'); }
 if (data.published && !['shows','posts','media'].includes(kind)) throw Error('Este registro é privado');
 if (kind === 'finance' && (!data.amount || !['income','expense'].includes(data.direction))) throw Error('Informe valor e tipo do lançamento');
 if (kind === 'tasks' && !members.includes(data.owner)) throw Error('Escolha um responsável');
 return {...data,title:data.title.trim()};
}
async function identity(request, env) {
 // The development override is never accepted on a deployed hostname.
 const host = new URL(request.url).hostname;
 if (env.DEV_AUTH === 'true' && ['localhost','127.0.0.1','[::1]'].includes(host)) return 'local-development';
 if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.TEAM_EMAILS) return null;
 const token = request.headers.get('Cf-Access-Jwt-Assertion');
 if (!token || !/^[a-zA-Z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) return null;
 try {
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  const {payload} = await jwtVerify(token, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)), {issuer,audience:env.ACCESS_AUD,algorithms:['RS256']});
  const email = String(payload.email || '').toLowerCase();
  return env.TEAM_EMAILS.toLowerCase().split(',').map(x=>x.trim()).includes(email) ? email : null;
 } catch { return null; }
}
async function handle(request,env) {
 const url = new URL(request.url), path = url.pathname;
 if (path === '/api/public') {
  if (request.method !== 'GET') return json({error:'Método não permitido'},405);
  const {results} = await env.DB.prepare("SELECT id,kind,data FROM records WHERE kind IN ('shows','posts','media') AND json_extract(data,'$.published') = 1 ORDER BY json_extract(data,'$.date') ASC").all();
  // Explicit projection: internal notes, owners and finance never leave the portal.
  return json(results.map(row=>{const d=JSON.parse(row.data); return {id:row.id,kind:row.kind,title:d.title,date:d.date,location:d.location,url:d.url,body:d.body};}));
 }
 if (path.startsWith('/api/internal')) {
  const actor = await identity(request,env);
  if (!actor) return json({error:'Acesso restrito à equipe. Entre pelo Cloudflare Access.'},401);
  if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) return json({error:'Origem não permitida'},403);
  if (path === '/api/internal/me' && request.method === 'GET') return json({email:actor,members});
  const match = path.match(/^\/api\/internal\/(shows|tasks|contacts|finance|posts|media)(?:\/([a-f0-9-]{36}))?$/);
  if (!match) return json({error:'Rota inexistente'},404);
  const [,kind,id] = match;
  if (request.method === 'GET' && !id) {
   const {results} = await env.DB.prepare('SELECT id,data,updated_at FROM records WHERE kind=? ORDER BY updated_at DESC').bind(kind).all();
   return json(results.map(r=>({id:r.id,...JSON.parse(r.data),updated_at:r.updated_at})));
  }
  if (request.method === 'DELETE' && id) {
   const result = await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE kind=? AND id=?').bind(kind,id),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor,'delete',id)]);
   return result[0].meta.changes ? json({ok:true}) : json({error:'Registro não encontrado'},404);
  }
  if ((request.method === 'POST' && !id) || (request.method === 'PUT' && id)) {
   if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json({error:'Envie JSON'},415);
   const body = await request.text(); if (body.length > 20000) return json({error:'Registro muito grande'},413);
   let data; try { data=validate(kind,JSON.parse(body)); } catch(e) { return json({error:e.message},400); }
   const recordId=id || crypto.randomUUID();
   const statement = id ? env.DB.prepare("UPDATE records SET data=?,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND kind=?").bind(JSON.stringify(data),actor,id,kind) : env.DB.prepare('INSERT INTO records(id,kind,data,updated_by) VALUES(?,?,?,?)').bind(recordId,kind,JSON.stringify(data),actor);
   const result = await env.DB.batch([statement,env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor,id?'update':'create',recordId)]);
   return result[0].meta.changes ? json({id:recordId,...data},id?200:201) : json({error:'Registro não encontrado'},404);
  }
  return json({error:'Método não permitido'},405);
 }
 if (path.startsWith('/api/')) return json({error:'Rota inexistente'},404);
 if (path === '/' || path === '/portal' || path === '/portal/') {
  const target=new URL(path === '/' ? '/index.html' : '/portal.html',url); return env.ASSETS.fetch(new Request(target,request));
 }
 return env.ASSETS.fetch(request);
}
export default {async fetch(request,env) {
 try {
  const response=await handle(request,env); const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body,{status:response.status,headers});
 } catch(e) { console.error(e.name); return json({error:'Não foi possível concluir. Tente novamente.'},500); }
}};
