import {identity,authRoute} from './auth.js';
const kinds = ['shows','tasks','contacts','finance','posts','media'];
const members = ['Henrique Melo','Antônio Anísio','Breno Phernan','Cassio Ledo'];
const json = (data, status=200) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validate(kind, data) {
 if (!kinds.includes(kind) || !data || typeof data !== 'object' || Array.isArray(data)) throw Error('Registro inválido');
 const allowed = ['title','body','date','location','owner','status','email','phone','notes','amount','direction','published','url','project','priority','category','channel','time','duration','eventType','origin','checklist'];
 for (const key of Object.keys(data)) if (!allowed.includes(key)) throw Error('Campo desconhecido');
 if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 180) throw Error('Informe um título de até 180 caracteres');
 for (const [key,value] of Object.entries(data)) {
  if (key === 'checklist') { if (!Array.isArray(value) || value.length > 40 || value.some(item=>!item || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 300 || typeof item.done !== 'boolean' || Object.keys(item).some(k=>!['text','done'].includes(k)))) throw Error('Checklist inválido'); }
  else if (key === 'published') { if (typeof value !== 'boolean') throw Error('Publicação inválida'); }
  else if (key === 'amount') { if (!Number.isSafeInteger(value) || value <= 0) throw Error('Valor deve ser positivo em centavos'); }
  else if (typeof value !== 'string' || value.length > 10000) throw Error('Campo inválido');
 }
 if (data.priority && !['Alta','Média','Baixa'].includes(data.priority)) throw Error('Prioridade inválida');
 if (data.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) throw Error('Horário inválido');
 if (data.duration && (!/^\d{1,3}$/.test(data.duration) || Number(data.duration)<1)) throw Error('Duração inválida');
 if (data.eventType && !['Show','Gravação','Ensaio','Reunião'].includes(data.eventType)) throw Error('Tipo de compromisso inválido');
 if (data.published && data.eventType && data.eventType !== 'Show') throw Error('Sessões internas não podem ser publicadas como shows');
 if (data.owner && !members.includes(data.owner)) throw Error('Responsável inválido');
 if (data.date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)))) throw Error('Data inválida');
 if (data.url) { const u = new URL(data.url); if (u.protocol !== 'https:') throw Error('Use links HTTPS'); }
 if (data.published && !['shows','posts','media'].includes(kind)) throw Error('Este registro é privado');
 if (kind === 'finance' && (!data.amount || !['income','expense'].includes(data.direction))) throw Error('Informe valor e tipo do lançamento');
 if (kind === 'tasks' && !members.includes(data.owner)) throw Error('Escolha um responsável');
 return {...data,title:data.title.trim()};
}
async function handle(request,env) {
 const url = new URL(request.url), path = url.pathname;
 const authResponse=await authRoute(request,env);if(authResponse)return authResponse;
 if (path === '/api/public') {
  if (request.method !== 'GET') return json({error:'Método não permitido'},405);
  const {results} = await env.DB.prepare("SELECT id,kind,data FROM records WHERE kind IN ('shows','posts','media') AND json_extract(data,'$.published') = 1 ORDER BY json_extract(data,'$.date') ASC").all();
  // Explicit projection: internal notes, owners and finance never leave the portal.
  return json(results.map(row=>{const d=JSON.parse(row.data); return {id:row.id,kind:row.kind,title:d.title,date:d.date,location:d.location,url:d.url,body:d.body,category:d.category,time:d.time,duration:d.duration};}));
 }
 if (path.startsWith('/api/internal')) {
  const actor = await identity(request,env);
  if (!actor) return json({error:'Acesso restrito à equipe. Entre com seu usuário e senha.'},401);
  if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) return json({error:'Origem não permitida'},403);
  if (path === '/api/internal/me' && request.method === 'GET') return json({...actor,members});
  if(actor.must_change_password)return json({error:'Troque a senha temporária antes de acessar os módulos'},403);
  const actorName=actor.username;
  const match = path.match(/^\/api\/internal\/(shows|tasks|contacts|finance|posts|media)(?:\/([a-f0-9-]{36}))?$/);
  if (!match) return json({error:'Rota inexistente'},404);
  const [,kind,id] = match;
  if (request.method === 'GET' && !id) {
   const {results} = await env.DB.prepare('SELECT id,data,updated_at FROM records WHERE kind=? ORDER BY updated_at DESC').bind(kind).all();
   return json(results.map(r=>({id:r.id,...JSON.parse(r.data),updated_at:r.updated_at})));
  }
  if (request.method === 'DELETE' && id) {
   const result = await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE kind=? AND id=?').bind(kind,id),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actorName,'delete',id)]);
   return result[0].meta.changes ? json({ok:true}) : json({error:'Registro não encontrado'},404);
  }
  if ((request.method === 'POST' && !id) || (request.method === 'PUT' && id)) {
   if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json({error:'Envie JSON'},415);
   const body = await request.text(); if (body.length > 20000) return json({error:'Registro muito grande'},413);
   let data; try { data=validate(kind,JSON.parse(body)); } catch(e) { return json({error:e.message},400); }
   const recordId=id || crypto.randomUUID();
   const expectedVersion=request.headers.get('If-Unmodified-Since');
   const statement = id ? env.DB.prepare("UPDATE records SET data=?,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND kind=? AND (? IS NULL OR updated_at=?)").bind(JSON.stringify(data),actorName,id,kind,expectedVersion,expectedVersion) : env.DB.prepare('INSERT INTO records(id,kind,data,updated_by) VALUES(?,?,?,?)').bind(recordId,kind,JSON.stringify(data),actorName);
   const result = await env.DB.batch([statement,env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actorName,id?'update':'create',recordId)]);
   if(!result[0].meta.changes){const exists=await env.DB.prepare('SELECT id FROM records WHERE id=? AND kind=?').bind(id,kind).first();return exists?json({error:'Outra pessoa atualizou este registro. Feche o formulário, atualize a área e revise a versão atual antes de salvar.'},409):json({error:'Registro não encontrado'},404);}
   return json({id:recordId,...data},id?200:201);
  }
  return json({error:'Método não permitido'},405);
 }
 if (path.startsWith('/api/')) return json({error:'Rota inexistente'},404);
 if (path === '/' || path === '/portal' || path === '/portal/' || path === '/midia-kit' || path === '/midia-kit/') {
  const target=new URL(path === '/' ? '/index.html' : path.startsWith('/midia-kit') ? '/midia-kit.html' : '/portal.html',url); return env.ASSETS.fetch(new Request(target,request));
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
