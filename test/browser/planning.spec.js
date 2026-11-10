import {test,expect} from '@playwright/test';
test('show confirmado aparece ao público; planejamento e gravações continuam internos e editáveis',async({page,request})=>{
 await page.goto('/portal');await expect(page.locator('#overview')).toBeVisible();await expect(page.locator('.release-hero h3')).toHaveText('DIAMANTADO');await expect(page.locator('.release-hero')).toContainText('data a definir');
 await page.screenshot({path:'.wrangler/portal-dashboard.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.wrangler/portal-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 const shows=await(await request.get('/api/internal/shows')).json();const curitiba=shows.find(r=>r.title==='Sislop em Curitiba · Puple Reis');expect(curitiba).toMatchObject({date:'2026-12-12',time:'20:00',duration:'60',published:true});
 const recordings=shows.filter(r=>r.eventType==='Gravação');expect(recordings.map(r=>r.date).sort()).toEqual(['2026-11-15','2026-11-22']);
 const pub=await(await request.get('/api/public')).text();expect(pub).not.toContain('sessão de gravação');expect(pub).toContain('Puple Reis');
 await page.getByRole('button',{name:'Tarefas',exact:true}).click();await page.getByLabel('Buscar',{exact:true}).fill('ABRAMUS');await expect(page.locator('#records article')).toHaveCount(2);await expect(page.getByRole('heading',{name:'Conferir cadastro e acesso à ABRAMUS',exact:true})).toBeVisible();await page.getByLabel('Buscar',{exact:true}).fill('');
 await page.getByLabel('Filtrar frente',{exact:true}).selectOption('Clipe');await expect(page.locator('#records article')).toHaveCount(2);await page.getByLabel('Filtrar frente',{exact:true}).selectOption('');
 await page.getByLabel('Visualização',{exact:true}).selectOption('board');await expect(page.locator('.kanban-column')).toHaveCount(4);await page.getByLabel('Mover tarefa: Mapear o que falta gravar em DIAMANTADO',{exact:true}).selectOption('Em andamento');await expect(page.locator('.kanban-column').filter({has:page.getByRole('heading',{name:'Em andamento · 1',exact:true})})).toContainText('Mapear o que falta');await page.getByLabel('Mover tarefa: Mapear o que falta gravar em DIAMANTADO',{exact:true}).selectOption('Aberta');await expect(page.getByRole('heading',{name:'Em andamento · 0',exact:true})).toBeVisible();await page.screenshot({path:'.wrangler/portal-board.png',fullPage:true});await page.getByLabel('Visualização',{exact:true}).selectOption('cards');
 await page.getByLabel('Buscar',{exact:true}).fill('Mapear o que falta');const card=page.locator('#records article');const check=card.getByRole('checkbox').first();await check.check();await expect(card).toContainText('1/3 etapas');await check.uncheck();await expect(card).toContainText('0/3 etapas');
 await page.getByRole('button',{name:'Agenda',exact:true}).click();await expect(page.getByRole('heading',{name:'Sislop em Curitiba · Puple Reis',exact:true})).toBeVisible();await expect(page.locator('#records')).toContainText('20:00 · 60 min');
});
test('atualização concorrente não sobrescreve outra pessoa e mídia kit só mostra materiais públicos',async({page,request})=>{
 const headers={Origin:'http://127.0.0.1:8787'};
 const res=await request.post('/api/internal/media',{headers,data:{title:'Release público de teste',category:'Release',body:'Texto aprovado do release de teste',published:false,notes:'Nota confidencial do kit'}});expect(res.status()).toBe(201);const record=await res.json();
 try{
 const original=(await(await request.get('/api/internal/media')).json()).find(r=>r.id===record.id);
 const data={title:record.title,category:'Release',body:'Texto aprovado do release de teste',published:true,notes:'Nota confidencial do kit'};
 const saved=await request.put('/api/internal/media/'+record.id,{headers:{...headers,'If-Unmodified-Since':original.updated_at},data});expect(saved.status()).toBe(200);
 const stale=await request.put('/api/internal/media/'+record.id,{headers:{...headers,'If-Unmodified-Since':original.updated_at},data:{...data,body:'Conteúdo desatualizado'}});expect(stale.status()).toBe(409);
 await page.goto('/midia-kit');await expect(page.getByRole('heading',{name:record.title,exact:true})).toBeVisible();await expect(page.locator('#kit-content')).toContainText(data.body);await expect(page.locator('#kit-content')).not.toContainText('Nota confidencial');await expect(page.locator('#kit-content')).not.toContainText('Conteúdo desatualizado');
 }finally{expect((await request.delete('/api/internal/media/'+record.id,{headers})).status()).toBe(200);}
});
