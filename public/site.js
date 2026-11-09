const containers={shows:document.querySelector('#shows-list'),posts:document.querySelector('#posts-list'),media:document.querySelector('#media-list')};
try {
 const response=await fetch('/api/public'); if(!response.ok) throw Error(); const records=await response.json();
 for(const [kind,container] of Object.entries(containers)) {
  container.replaceChildren();
  const rows=records.filter(r=>r.kind===kind && (kind!=='shows'||!r.date||r.date>=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})));
  if(!rows.length) { const p=document.createElement('p'); p.className='muted'; p.textContent={shows:'Novas datas em breve. Quer a Sislop na sua cidade? Fale com a gente.',posts:'As próximas novidades chegam por aqui.',media:'Peça o material atualizado pelo e-mail da banda.'}[kind]; container.append(p); }
  for(const row of rows) { const article=document.createElement('article'); const h=document.createElement('h3');h.textContent=row.title;article.append(h); if(row.imagePath){const img=document.createElement('img');img.src=row.imagePath;img.alt=row.title;img.className='site-kit-photo';img.loading='lazy';article.append(img);} if(row.body){const p=document.createElement('p');p.textContent=row.body;article.append(p);} if(row.date){const p=document.createElement('p');p.textContent=new Date(row.date+'T12:00:00').toLocaleDateString('pt-BR')+(row.time?' · '+row.time:'')+(row.duration?' · '+row.duration+' min':'');article.append(p);}if(row.location){const p=document.createElement('p');p.textContent=row.location;article.append(p);}if(row.url){const a=document.createElement('a');a.href=row.url;a.textContent=kind==='media'?'Abrir material →':'Saiba mais →';a.rel='noopener noreferrer';article.append(a);}container.append(article); }
 }
} catch { for(const container of Object.values(containers)) container.textContent='Não foi possível carregar agora. Entre em contato pelo e-mail da banda.'; }
