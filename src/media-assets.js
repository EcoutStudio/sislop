import {identity} from './auth.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const maxBytes=1024*1024;
function mimeOf(bytes){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
export async function mediaAssetRoute(request,env){
 const url=new URL(request.url);
 const read=url.pathname.match(/^\/media-assets\/([a-f0-9-]{36})$/);
 if(read){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  const row=await env.DB.prepare("SELECT a.content,a.mime,json_extract(r.data,'$.published') AS published FROM media_assets a JOIN records r ON r.id=a.record_id WHERE a.id=? AND r.kind='media'").bind(read[1]).first();
  if(!row)return json({error:'Imagem não encontrada'},404);
  if(!row.published){const actor=await identity(request,env);if(!actor||actor.must_change_password)return json({error:'Imagem privada'},404);}
  const bytes=Uint8Array.from(atob(row.content),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':row.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
 }
 const write=url.pathname.match(/^\/api\/internal\/media\/([a-f0-9-]{36})\/image$/);
 if(!write)return null;
 const actor=await identity(request,env);if(!actor)return json({error:'Entre no portal'},401);if(actor.must_change_password)return json({error:'Troque a senha temporária'},403);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Origem não permitida'},403);
 if(!['POST','DELETE'].includes(request.method))return json({error:'Método não permitido'},405);
 const record=await env.DB.prepare("SELECT id FROM records WHERE id=? AND kind='media'").bind(write[1]).first();if(!record)return json({error:'Material não encontrado'},404);
 if(request.method==='DELETE'){
  await env.DB.batch([env.DB.prepare('DELETE FROM media_assets WHERE record_id=?').bind(record.id),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor.username,'remove-image',record.id)]);return json({ok:true});
 }
 // Read at most 1 MiB, including requests without Content-Length.
 const reader=request.body?.getReader();if(!reader)return json({error:'Selecione uma imagem'},400);
 const chunks=[];let length=0;for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();return json({error:'Use uma imagem de até 1 MB'},413);}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const mime=mimeOf(bytes);if(!mime)return json({error:'Use uma imagem JPG, PNG ou WebP'},415);
 const encoded=[];for(let i=0;i<bytes.length;i+=8192)encoded.push(String.fromCharCode(...bytes.subarray(i,i+8192)));const content=btoa(encoded.join(''));const id=crypto.randomUUID();
 await env.DB.batch([env.DB.prepare('INSERT INTO media_assets(id,record_id,content,mime) VALUES(?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET id=excluded.id,content=excluded.content,mime=excluded.mime').bind(id,record.id,content,mime),env.DB.prepare('INSERT INTO audit_log(actor,action,record_id) VALUES(?,?,?)').bind(actor.username,'upload-image',record.id)]);
 return json({imagePath:'/media-assets/'+id},201);
}
