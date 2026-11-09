import {test,expect} from '@playwright/test';
test('Henrique administra acessos; integrantes trocam senha e têm financeiro sem poder administrar',async({page,browser})=>{
 const base='http://127.0.0.1:8788',headers={Origin:base};
 const post=(client,path,data)=>client.post(base+path,{headers,data});
 const password='Henrique-test-password-2026';
 await page.goto(base+'/portal');await expect(page.getByRole('heading',{name:'Primeiro acesso · Henrique'})).toBeVisible();
 const bad=await post(page.request,'/api/auth/setup',{setupToken:'invalid',password});expect(bad.status()).toBe(401);
 await page.getByLabel('Chave de configuração',{exact:true}).fill('local-test-setup-token-32-characters-only');
 await page.getByLabel('Crie sua senha',{exact:true}).fill(password);await page.getByLabel('Confirme sua senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Criar minha conta de administrador'}).click();
 await expect(page.getByText('Henrique Melo · Administrador · acesso financeiro',{exact:true})).toBeVisible();
 await expect(page.locator('#admin-panel')).toBeHidden();
 await page.getByRole('button',{name:'Controle de pessoas',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Controle de pessoas',exact:true})).toBeVisible();
 expect((await post(page.request,'/api/auth/setup',{setupToken:'local-test-setup-token-32-characters-only',password:'Cannot-replace-password'})).status()).toBe(409);
 const card=page.locator('#users article').filter({has:page.getByRole('heading',{name:'Breno Phernan',exact:true})});
 await card.getByRole('button',{name:'Gerar primeiro acesso'}).click();await expect(page.locator('#admin-message')).toContainText('Senha temporária:');
 const temporary=(await page.locator('#admin-message').textContent()).match(/Senha temporária: ([a-f0-9]+)\./)[1];
 const memberContext=await browser.newContext();const member=await memberContext.newPage();
 try{
 await member.goto(base+'/portal');await member.getByLabel('Usuário',{exact:true}).fill('breno');await member.getByLabel('Senha',{exact:true}).fill(temporary);await member.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(member.locator('#password-help')).toContainText('Troque sua senha temporária');
 expect((await member.request.get(base+'/api/internal/finance')).status()).toBe(403);
 expect((await member.request.get(base+'/api/admin/users')).status()).toBe(403);
 await member.getByLabel('Senha atual',{exact:true}).fill(temporary);await member.getByLabel('Nova senha',{exact:true}).fill('Breno-new-password-2026');await member.getByLabel('Confirme a nova senha',{exact:true}).fill('Breno-new-password-2026');await member.getByRole('button',{name:'Salvar nova senha'}).click();
 await expect(member.getByRole('heading',{name:'Entre nos bastidores'})).toBeVisible();
 await member.getByLabel('Usuário',{exact:true}).fill('breno');await member.getByLabel('Senha',{exact:true}).fill('Breno-new-password-2026');await member.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(member.getByText('Breno Phernan · Integrante · acesso financeiro',{exact:true})).toBeVisible();
 await expect(member.getByRole('button',{name:'Controle de pessoas',exact:true})).toBeHidden();
 await member.getByRole('button',{name:'Financeiro',exact:true}).click();await expect(member.locator('#section-name')).toHaveText('Financeiro');
 expect((await member.request.get(base+'/api/internal/finance')).status()).toBe(200);
 expect((await post(member.request,'/api/admin/users/antonio/reset',{})).status()).toBe(403);
 const csrf=await page.request.post(base+'/api/admin/users/breno/reset',{data:{}});expect(csrf.status()).toBe(403);
 await card.getByRole('button',{name:'Desativar acesso'}).click();await expect(card).toContainText('Desativado');expect((await member.request.get(base+'/api/internal/finance')).status()).toBe(401);
 const reset=await post(page.request,'/api/admin/users/breno/reset',{});expect(reset.status()).toBe(200);
 expect((await post(member.request,'/api/auth/login',{username:'breno',password:'Breno-new-password-2026'})).status()).toBe(401);
 for(let i=0;i<11;i++){const response=await post(member.request,'/api/auth/login',{username:'nonexistent-rate-test',password:'wrong-password'});expect(response.status()).toBe(i<10?401:429);}
 const cookies=await page.context().cookies(base);const session=cookies.find(c=>c.name==='sislop_local');expect(session.httpOnly).toBe(true);expect(session.secure).toBe(true);expect(session.sameSite).toBe('Strict');
 await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByRole('heading',{name:'Entre nos bastidores'})).toBeVisible();expect((await page.request.get(base+'/api/internal/finance')).status()).toBe(401);
 }finally{await memberContext.close();}
});
