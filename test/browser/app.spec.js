import {test,expect} from '@playwright/test';
test('site público responsivo e portal protegido sem Access',async({page,request})=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('O volume sobe.');
 await page.screenshot({path:'.wrangler/site-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const response=await request.get('http://127.0.0.1:8788/api/internal/finance');expect(response.status()).toBe(401);
 const forged=await request.get('http://127.0.0.1:8788/api/internal/finance',{headers:{'Cf-Access-Jwt-Assertion':'forged','Cf-Access-Authenticated-User-Email':'sisloprock@gmail.com'}});expect(forged.status()).toBe(401);
});
test('CRUD compartilhado, finanças, publicação seletiva e calendário',async({page,request})=>{
 const origin={Origin:'http://127.0.0.1:8787'};
 const created=[];
 async function add(kind,data){const r=await request.post('/api/internal/'+kind,{headers:origin,data});expect(r.status()).toBe(201);const row=await r.json();created.push([kind,row.id]);return row;}
 try{
 const show=await add('shows',{title:'Show de teste',date:'2099-12-20',location:'Palco',notes:'Segredo de produção',published:true});
 await add('shows',{title:'Show privado',published:false});
 await add('finance',{title:'Cachê privado',amount:12345,direction:'income'});
 await add('finance',{title:'Transporte',amount:2345,direction:'expense'});
 await add('tasks',{title:'Preparar repertório',owner:'Breno Phernan',date:'2099-12-19',status:'Aberta'});
 await add('contacts',{title:'Produtor privado',email:'private@example.com'});
 await add('posts',{title:'Novidade teste',published:true,url:'https://example.com'});
 await add('media',{title:'Kit teste',published:true,url:'https://example.com/kit.pdf'});
 const pub=await request.get('/api/public');const text=await pub.text();expect(text).toContain('Show de teste');for(const privateText of ['Segredo','Show privado','Cachê privado','private@example.com','12345'])expect(text).not.toContain(privateText);
 await page.goto('/portal');await expect(page.getByText('Desenvolvimento local',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Financeiro',exact:true}).click();await expect(page.locator('#summary')).toContainText('Saldo: R$');await expect(page.locator('#summary')).toContainText('100,00');
 await page.getByRole('button',{name:'Calendário',exact:true}).click();await expect(page.getByRole('heading',{name:'Preparar repertório',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Tarefas',exact:true}).click();await page.getByRole('button',{name:'+ Novo registro'}).click();await page.getByLabel('Título',{exact:true}).fill('Tarefa via interface');await page.getByLabel('Responsável').selectOption('Cassio Ledo');await page.getByRole('button',{name:'Salvar registro'}).click();await expect(page.getByRole('heading',{name:'Tarefa via interface',exact:true})).toBeVisible();
 const saved=(await(await request.get('/api/internal/tasks')).json()).find(r=>r.title==='Tarefa via interface');created.push(['tasks',saved.id]);
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Tarefa via interface',exact:true})});await card.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Status').selectOption('Concluída');await page.getByRole('button',{name:'Salvar registro'}).click();await expect(card).toContainText('Concluída');
 const csrf=await request.delete('/api/internal/shows/'+show.id);expect(csrf.status()).toBe(403);
 await page.goto('/');await expect(page.getByRole('heading',{name:'Show de teste',exact:true})).toBeVisible();
 }finally{for(const [kind,id]of created){const r=await request.delete(`/api/internal/${kind}/${id}`,{headers:origin});expect(r.status()).toBe(200);}}
});
