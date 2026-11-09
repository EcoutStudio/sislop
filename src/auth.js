const encoder = new TextEncoder();
const ITERATIONS = 100000;
const json = (data,status=200,headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const hex = buffer => Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async text => hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
export function validPassword(password) { return typeof password === 'string' && password.length >= 12 && password.length <= 128; }
export async function passwordHash(password,salt) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:ITERATIONS,hash:'SHA-256'},key,256));
}
function equal(a,b) { if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
const local = request => ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
const cookieName = request => local(request)?'sislop_local':'__Host-sislop';
function cookie(request,token,age=43200) { return `${cookieName(request)}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`; }
async function session(request,env,username,version=0) {
 const token=random();
 await env.DB.prepare('INSERT INTO sessions(token_hash,username,expires_at,auth_version) VALUES(?,?,?,?)').bind(await digest(token),username,Date.now()+43200000,version).run();
 return cookie(request,token);
}
function token(request) {
 return (request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(request)+'='))?.split('=')[1];
}
export async function identity(request,env) {
 if(env.DEV_AUTH==='true'&&local(request))return {username:'local-development',name:'Desenvolvimento local',role:'admin',must_change_password:0};
 const raw=token(request);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
 return env.DB.prepare('SELECT u.username,u.name,u.role,u.must_change_password FROM sessions s JOIN users u ON u.username=s.username WHERE s.token_hash=? AND s.expires_at>? AND u.enabled=1 AND s.auth_version=u.auth_version').bind(await digest(raw),Date.now()).first();
}
async function limited(request,env,username) {
 const now=Date.now();
 const ip=request.headers.get('CF-Connecting-IP')||'local';
 const keys=[['ip:'+await digest(ip),40],['user:'+await digest(username),10]];
 for(const [key,max]of keys){const row=await env.DB.prepare('INSERT INTO auth_limits(bucket,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts').bind(key,now+900000,now,now).first();if(row.attempts>max)return true;}
 await env.DB.batch([env.DB.prepare('DELETE FROM auth_limits WHERE reset_at<?').bind(now),env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now)]);
 return false;
}
export async function authRoute(request,env) {
 const path=new URL(request.url).pathname;
 if(path==='/api/auth/status'&&request.method==='GET'){
  const user=await env.DB.prepare("SELECT password_hash FROM users WHERE username='henrique'").first();
  return json({initialized:!!user?.password_hash});
 }
 if(!path.startsWith('/api/auth/')&&!path.startsWith('/api/admin/'))return null;
 if(request.method!=='GET'&&request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origem não permitida'},403);
 const actor=await identity(request,env);
 if(path==='/api/admin/users'&&request.method==='GET'){
  if(!actor)return json({error:'Entre no portal'},401);
  if(actor.role!=='admin'||actor.must_change_password)return json({error:'Acesso exclusivo do administrador'},403);
  const {results}=await env.DB.prepare('SELECT username,name,role,enabled,password_hash IS NOT NULL AS configured FROM users ORDER BY username').all();return json(results);
 }
 if(request.method!=='POST')return json({error:'Método não permitido'},405);
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'Envie JSON'},415);
 const raw=await request.text();if(raw.length>4096)return json({error:'Requisição muito grande'},413);
 let body;try{body=JSON.parse(raw);if(!body||typeof body!=='object')throw Error();}catch{return json({error:'Dados inválidos'},400);}
 if(path==='/api/auth/setup'||path==='/api/auth/login'){
  const username=typeof body.username==='string'?body.username.toLowerCase().trim().slice(0,80):'';
  if(await limited(request,env,path.endsWith('setup')?'setup':username))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429,{'Retry-After':'900'});
  if(path.endsWith('setup')){
   if(!env.SETUP_TOKEN||env.SETUP_TOKEN.length<32)return json({error:'A configuração inicial precisa ser habilitada pelo proprietário na Cloudflare.'},503);
   if(typeof body.setupToken!=='string'||!equal(await digest(body.setupToken),await digest(env.SETUP_TOKEN)))return json({error:'Chave de configuração inválida'},401);
   if(!validPassword(body.password))return json({error:'Use uma senha entre 12 e 128 caracteres'},400);
   const salt=random(),hash=await passwordHash(body.password,salt);
   const result=await env.DB.prepare("UPDATE users SET password_hash=?,salt=?,must_change_password=0 WHERE username='henrique' AND password_hash IS NULL").bind(hash,salt).run();
   if(!result.meta.changes)return json({error:'Administrador já configurado'},409);
   await env.DB.prepare("INSERT INTO audit_log(actor,action,record_id) VALUES('henrique','setup','henrique')").run();
   return json({ok:true},201,{'Set-Cookie':await session(request,env,'henrique')});
  }
  if(typeof body.password!=='string'||body.password.length>128)return json({error:'Usuário ou senha inválidos'},401);
  const user=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
  const hash=await passwordHash(body.password,user?.salt||'sislop-dummy-salt-not-an-account');
  if(!user?.enabled||!user.password_hash||!equal(hash,user.password_hash))return json({error:'Usuário ou senha inválidos'},401);
  return json({ok:true},200,{'Set-Cookie':await session(request,env,username,user.auth_version)});
 }
 if(!actor)return json({error:'Entre no portal'},401);
 if(path==='/api/auth/logout'){
  const raw=token(request);if(raw)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(raw)).run();
  return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
 }
 if(path==='/api/auth/password'){
  if(await limited(request,env,actor.username))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429,{'Retry-After':'900'});
  if(!validPassword(body.password)||body.password===body.currentPassword)return json({error:'Escolha uma nova senha entre 12 e 128 caracteres'},400);
  const user=await env.DB.prepare('SELECT password_hash,salt FROM users WHERE username=?').bind(actor.username).first();
  if(typeof body.currentPassword!=='string'||body.currentPassword.length>128||!user?.password_hash||!equal(await passwordHash(body.currentPassword,user.salt),user.password_hash))return json({error:'Senha atual inválida'},401);
  const salt=random();const hash=await passwordHash(body.password,salt);
  await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,salt=?,must_change_password=0,auth_version=auth_version+1 WHERE username=?').bind(hash,salt,actor.username),env.DB.prepare('DELETE FROM sessions WHERE username=?').bind(actor.username),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor.username,'password-change',actor.username)]);
  return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
 }
 const match=path.match(/^\/api\/admin\/users\/(antonio|breno|cassio)\/(reset|toggle)$/);
 if(match){
  if(actor.role!=='admin'||actor.must_change_password)return json({error:'Acesso exclusivo do administrador'},403);
  const [,username,action]=match;
  if(action==='reset'){
   const password=random().slice(0,24),salt=random(),hash=await passwordHash(password,salt);
   await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,salt=?,enabled=1,must_change_password=1,auth_version=auth_version+1 WHERE username=?').bind(hash,salt,username),env.DB.prepare('DELETE FROM sessions WHERE username=?').bind(username),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor.username,'password-reset',username)]);
   return json({username,temporaryPassword:password});
  }
  if(typeof body.enabled!=='boolean')return json({error:'Estado inválido'},400);
  await env.DB.batch([env.DB.prepare('UPDATE users SET enabled=?,auth_version=auth_version+1 WHERE username=?').bind(body.enabled?1:0,username),env.DB.prepare('DELETE FROM sessions WHERE username=?').bind(username),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor.username,body.enabled?'enable-user':'disable-user',username)]);
  return json({ok:true});
 }
 return json({error:'Rota inexistente'},404);
}
