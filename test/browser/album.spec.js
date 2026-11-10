import {test,expect} from '@playwright/test';
test('público destaca DIAMANTADO e shows, integra a arte publicada e respeita movimento reduzido',async({page,request})=>{
 const headers={Origin:'http://127.0.0.1:8787'};
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('DIAMANTADO');await expect(page.locator('.release-tease strong')).toHaveText('EM BREVE');await expect(page.getByRole('heading',{name:'Sislop em Curitiba · Puple Reis',exact:true})).toBeVisible();await expect(page.locator('.show-row').filter({has:page.getByRole('heading',{name:'Sislop em Curitiba · Puple Reis',exact:true})})).toContainText('20:00 — 21:00');await expect(page.locator('#novidades')).toBeHidden();
 await page.screenshot({path:'.wrangler/diamantado-public.png',fullPage:true});
 const created=await request.post('/api/internal/media',{headers,data:{title:'DIAMANTADO · capa de teste',category:'Capa do álbum',published:true}});expect(created.status()).toBe(201);const record=await created.json();
 try{
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=3;const ctx=canvas.getContext('2d');ctx.fillStyle='#168bb5';ctx.fillRect(0,0,2,3);return canvas.toDataURL('image/png').split(',')[1];});
 const uploaded=await request.post(`/api/internal/media/${record.id}/image`,{headers:{...headers,'Content-Type':'image/png'},data:Buffer.from(png,'base64')});expect(uploaded.status()).toBe(201);await page.reload();await expect(page.locator('#album-art')).toBeVisible();await expect(page.locator('#album-art')).toHaveJSProperty('naturalWidth',2);await expect(page.locator('#album-art')).toHaveCSS('object-fit','contain');await expect(page.locator('#album-art-placeholder')).toBeHidden();
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.release-tease strong')).toHaveCSS('animation-name','none');await expect(page.locator('.tease-dot')).toHaveCSS('animation-name','none');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const hidden=await request.put('/api/internal/media/'+record.id,{headers,data:{title:record.title,category:'Capa do álbum',published:false}});expect(hidden.status()).toBe(200);await page.reload();await expect(page.locator('#album-art')).toBeHidden();await expect(page.locator('#album-art-placeholder')).toBeVisible();
 }finally{expect((await request.delete('/api/internal/media/'+record.id,{headers})).status()).toBe(200);}
});
