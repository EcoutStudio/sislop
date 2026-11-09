const root=document.querySelector('#kit-content');
document.querySelector('#print-kit').onclick=()=>window.print();
try{
 const response=await fetch('/api/public');if(!response.ok)throw Error();const items=(await response.json()).filter(r=>r.kind==='media');root.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent='Os materiais estão sendo atualizados. Solicite o mídia kit pelo e-mail da banda.';root.append(p);}
 const groups=new Map();for(const item of items){const category=item.category||'Materiais oficiais';if(!groups.has(category))groups.set(category,[]);groups.get(category).push(item);}
 for(const [category,rows]of groups){const section=document.createElement('div');section.className='kit-group';const heading=document.createElement('h2');heading.textContent=category;section.append(heading);for(const row of rows){const article=document.createElement('article');const h=document.createElement('h3');h.textContent=row.title;article.append(h);if(row.body){const p=document.createElement('p');p.textContent=row.body;article.append(p);}if(row.url){const link=document.createElement('a');link.href=row.url;link.textContent='Acessar material →';link.target='_blank';link.rel='noopener noreferrer';article.append(link);}section.append(article);}root.append(section);}
}catch{root.textContent='Não foi possível carregar o mídia kit agora. Entre em contato com sisloprock@gmail.com.';}
