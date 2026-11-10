import {allowed,capabilities} from './permissions.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function collaborationRoute(request,env,actor){
 const path=new URL(request.url).pathname;
 if(path==='/api/internal/presence'){
  if(!['POST','GET'].includes(request.method))return json({error:'Método não permitido'},405);
  if(actor.username==='local-development')return json([{username:actor.username,name:actor.name,area:'overview',last_seen:Date.now()}]);
  if(request.method==='POST'){
   let body;try{body=await request.json();}catch{return json({error:'Dados inválidos'},400);}
   const area=typeof body.area==='string'&&['overview','people','calendar',...Object.keys(capabilities(actor))].includes(body.area)?body.area:'overview';
   await env.DB.prepare('INSERT INTO presence(username,last_seen,area) VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET last_seen=excluded.last_seen,area=excluded.area').bind(actor.username,Date.now(),area).run();
  }
  const {results}=await env.DB.prepare('SELECT p.username,u.name,p.area,p.last_seen FROM presence p JOIN users u ON u.username=p.username WHERE u.enabled=1 AND p.last_seen>? AND EXISTS(SELECT 1 FROM sessions s WHERE s.username=u.username AND s.expires_at>? AND s.auth_version=u.auth_version) ORDER BY p.last_seen DESC LIMIT 50').bind(Date.now()-90000,Date.now()).all();return json(results);
 }
 if(path==='/api/internal/activity'&&request.method==='GET'){
  const kinds=Object.keys(capabilities(actor)).filter(k=>allowed(actor,k));if(!kinds.length)return json([]);
  const {results}=await env.DB.prepare(`SELECT a.*,COALESCE(u.name,a.actor) AS actor_name FROM record_activity a LEFT JOIN users u ON u.username=a.actor WHERE a.kind IN (${kinds.map(()=>'?').join(',')}) ORDER BY a.id DESC LIMIT 30`).bind(...kinds).all();return json(results);
 }
 const match=path.match(/^\/api\/internal\/records\/([a-f0-9-]{36})\/(activity|comments)$/);if(!match)return null;
 const record=await env.DB.prepare('SELECT id,kind,data FROM records WHERE id=?').bind(match[1]).first();if(!record)return json({error:'Registro não encontrado'},404);
 if(!allowed(actor,record.kind))return json({error:'Sem acesso a este módulo'},403);
 if(match[2]==='activity'&&request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT a.*,COALESCE(u.name,a.actor) AS actor_name FROM record_activity a LEFT JOIN users u ON u.username=a.actor WHERE a.record_id=? ORDER BY a.id DESC LIMIT 100').bind(record.id).all();return json(results);
 }
 if(match[2]==='comments'&&request.method==='POST'){
  if(!allowed(actor,record.kind,'write'))return json({error:'Este perfil tem apenas leitura neste módulo'},403);
  const raw=await request.text();if(raw.length>5000)return json({error:'Comentário muito longo'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Comentário inválido'},400);}
  if(typeof body?.text!=='string'||!body.text.trim()||body.text.length>2000)return json({error:'Escreva um comentário de até 2000 caracteres'},400);
  await env.DB.prepare('INSERT INTO record_activity(record_id,kind,title,actor,event,detail) VALUES(?,?,?,?,?,?)').bind(record.id,record.kind,JSON.parse(record.data).title,actor.username,'comment',body.text.trim()).run();return json({ok:true},201);
 }
 return json({error:'Método não permitido'},405);
}
export function prepareChanges(data,previous,actor){
 const now=new Date().toISOString(),events=[];
 if(data.checklist){const old=previous?.checklist||[];data.checklist=data.checklist.map((item,index)=>{
  const before=old[index]?.text===item.text?old[index]:old.find(i=>i.text===item.text);
  if(item.done&&(!before?.done)){events.push(['check','Concluiu etapa: '+item.text]);return {...item,doneBy:actor.username,doneAt:now};}
  if(!item.done&&before?.done)events.push(['uncheck','Reabriu etapa: '+item.text]);
  return item.done?{...item,...(before?.doneBy?{doneBy:before.doneBy,doneAt:before.doneAt}:{})}:item;
 });}
 if(previous&&data.status!==previous.status&&data.status)events.push(['status',`Mudou a etapa de “${previous.status||'Sem etapa'}” para “${data.status}”`]);
 if(previous&&!!data.published!==!!previous.published)events.push(['publish',data.published?'Publicou este material no site':'Retirou este material do site público']);
 if(previous&&data.owner!==previous.owner)events.push(['assign',`Responsável: ${data.owner||'a definir'}`]);
 return {data,events,now};
}
