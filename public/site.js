const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const shows=document.querySelector('#shows-list'),posts=document.querySelector('#posts-list');
try{
 const response=await fetch('/api/public');if(!response.ok)throw Error();const records=await response.json();
 const cover=records.find(r=>r.kind==='media'&&r.category==='Capa do álbum'&&r.title.toUpperCase().includes('DIAMANTADO')&&r.imagePath);
 if(cover){const image=document.querySelector('#album-art');image.onload=()=>{image.hidden=false;document.querySelector('#album-art-placeholder').hidden=true;};image.onerror=()=>{image.hidden=true;document.querySelector('#album-art-placeholder').hidden=false;};image.src=cover.imagePath;}
 shows.replaceChildren();const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const dates=records.filter(r=>r.kind==='shows'&&r.date&&r.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
 if(!dates.length)shows.append(node('p','Novas datas em breve. Fale com a gente para levar a Sislop à sua cidade.','empty-shows'));
 for(const row of dates){
  const article=node('article',undefined,'show-row');const date=new Date(row.date+'T12:00:00');const time=node('time',undefined,'show-date');time.dateTime=row.date;time.setAttribute('aria-label',date.toLocaleDateString('pt-BR'));time.append(node('strong',date.toLocaleDateString('pt-BR',{day:'2-digit'})),node('span',date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()),node('small',String(date.getFullYear())));
  const info=node('div',undefined,'show-info');info.append(node('h3',row.title));if(row.location&&!row.title.includes(row.location.split('·')[0].trim()))info.append(node('p',row.location));
  const schedule=node('div',undefined,'show-schedule');if(row.time){let label=row.time;if(row.duration){const [h,m]=row.time.split(':').map(Number);const end=(h*60+m+Number(row.duration))%1440;label+=' — '+String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0');}schedule.append(node('strong',label),node('small','Horário de Brasília'));}
  const link=node('a',row.url?'Detalhes →':'Informações →','show-link');link.href=row.url||'mailto:sisloprock@gmail.com?subject='+encodeURIComponent('Show: '+row.title);if(row.url){link.target='_blank';link.rel='noopener noreferrer';}article.append(time,info,schedule,link);shows.append(article);
 }
 const news=records.filter(r=>r.kind==='posts').sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,3);document.querySelector('#novidades').hidden=!news.length;posts.replaceChildren();
 for(const row of news){const article=node('article');article.append(node('h3',row.title));if(row.body)article.append(node('p',row.body));if(row.url){const a=node('a','Leia mais →');a.href=row.url;a.target='_blank';a.rel='noopener noreferrer';article.append(a);}posts.append(article);}
}catch{shows.replaceChildren(node('p','A agenda está temporariamente indisponível. Fale com sisloprock@gmail.com.'));}
