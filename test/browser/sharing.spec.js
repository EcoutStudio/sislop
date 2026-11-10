import {test,expect} from '@playwright/test';
test('prévia de compartilhamento está no HTML inicial e usa JPEG público acessível aos robôs',async({request,browser})=>{
 for(const [path,title] of [['/','DIAMANTADO'],['/midia-kit','Mídia kit oficial']]){
  const response=await request.get(path,{headers:{'User-Agent':'facebookexternalhit/1.1'}});expect(response.status()).toBe(200);const html=await response.text();
  expect(html).toContain('property="og:title" content="Sislop | '+title);expect(html).toContain('property="og:image" content="https://sislop.com.br/assets/sislop-diamantado-share-v1.jpg"');expect(html).toContain('property="og:image:type" content="image/jpeg"');expect(html).toContain('property="og:image:width" content="1200"');expect(html).toContain('property="og:image:height" content="630"');expect(html).toContain('name="twitter:card" content="summary_large_image"');expect(html).toContain('rel="canonical" href="https://sislop.com.br'+path+'"');
 }
 const context=await browser.newContext({javaScriptEnabled:false});
 try{const response=await context.request.get('http://127.0.0.1:8788/assets/sislop-diamantado-share-v1.jpg',{headers:{'User-Agent':'WhatsApp/2.24'}});expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/jpeg');const bytes=await response.body();expect(bytes[0]).toBe(255);expect(bytes[1]).toBe(216);expect(bytes.length).toBeLessThan(300000);const page=await context.newPage();await page.goto('http://127.0.0.1:8788/assets/sislop-diamantado-share-v1.jpg');await expect(page.locator('img')).toHaveJSProperty('naturalWidth',1200);await expect(page.locator('img')).toHaveJSProperty('naturalHeight',630);}finally{await context.close();}
});
