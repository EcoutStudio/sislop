const root=document.querySelector('#kit-content');
const preview=new URLSearchParams(location.search).get('preview')==='1';
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(className)element.className=className;return element;};
document.querySelector('#print-kit').onclick=()=>window.print();
function stagePlot(row){
 const figure=node('figure',null,'stage-figure');figure.setAttribute('aria-label',`Mapa de palco ilustrativo. Esquerda: ${row.stageLeft||'teclado e voz, retorno 3'}. Centro: ${row.stageCenter||'guitarra e voz, retorno 1'}. Direita: ${row.stageRight||'baixo e voz, retorno 2'}. Fundo: ${row.stageBack||'bateria, retorno 4'}.`);
 const stage=node('div',null,'stage-grid');
 for(const [position,title,subtitle] of [['amp-guitar','AMPLIFICADOR',row.stageAmpLeft||'Guitarra'],['drums',row.stageBack||'BATERIA · Retorno 4','Fundo'],['amp-bass','AMPLIFICADOR',row.stageAmpRight||'Baixo'],['keyboard',row.stageLeft||'TECLADO / VOZ · Retorno 3','Esquerda'],['guitar',row.stageCenter||'GUITARRA / VOZ · Retorno 1','Centro'],['bass',row.stageRight||'BAIXO / VOZ · Retorno 2','Direita']]){const block=node('div',null,'stage-position '+position);block.append(node('strong',title),node('small',subtitle));stage.append(block);}
 stage.append(node('p','FRENTE DO PALCO / PLATEIA','stage-front'));figure.append(stage,node('figcaption','Esquema de referência, sem escala. Conferir o texto e alinhar estrutura, canais e monitoração com a produção.'));return figure;
}
try{
 const response=await fetch(preview?'/api/internal/media':'/api/public');
 if(!response.ok)throw Error(preview?'Entre no portal para visualizar os rascunhos do mídia kit.':'Não foi possível carregar o mídia kit agora.');
 const data=await response.json(),items=preview?data:data.filter(r=>r.kind==='media');root.replaceChildren();
 if(preview){document.querySelector('.hero-bottom p').textContent='Prévia interna · Sislop. Textos e materiais em revisão.';document.querySelector('.kit-hero .eyebrow').textContent='PRÉVIA INTERNA / REVISÃO DA BANDA';const note=node('aside','Esta prévia inclui rascunhos. Somente blocos marcados como públicos no portal aparecem no mídia kit externo.','preview-notice');root.append(note);}
 if(!items.length)root.append(node('p','Os materiais estão sendo atualizados. Solicite o mídia kit pelo e-mail da banda.'));
 const order=['Biografia','História','Sonoridade','Release','Integrantes','Discografia','Fotos','Vídeos','Mapa de palco','Ficha técnica','Links','Contato','Outros'];
 const groups=new Map();for(const item of items){const category=item.category||'Materiais oficiais';if(!groups.has(category))groups.set(category,[]);groups.get(category).push(item);}
 for(const [category,rows]of [...groups].sort((a,b)=>(order.indexOf(a[0])<0?99:order.indexOf(a[0]))-(order.indexOf(b[0])<0?99:order.indexOf(b[0])))){
  const section=node('div',null,'kit-group');section.append(node('h2',category));
  for(const row of rows){const article=node('article');if(preview)article.append(node('span',row.published?'Publicado':'Rascunho interno','kit-state'));article.append(node('h3',row.title));
   if(row.category==='Mapa de palco')article.append(stagePlot(row));
   if(row.imagePath){const image=document.createElement('img');image.src=row.imagePath;image.alt=row.title;image.loading='lazy';image.className='kit-photo';article.append(image);}
   if(row.body)article.append(node('p',row.body));
   if(row.url){const link=node('a','Acessar material →');link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';article.append(link);}
   section.append(article);
  }root.append(section);
 }
}catch(error){root.textContent=error.message||'Não foi possível carregar os materiais. Entre em contato com sisloprock@gmail.com.';}
