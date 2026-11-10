import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
try{
 const image=readFileSync(new URL('../public/assets/diamantado-1600.webp',import.meta.url)).toString('base64');
 const html=readFileSync(new URL('./share-card.html',import.meta.url),'utf8').replace('__ALBUM_ART__','data:image/webp;base64,'+image);
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(html);await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
 await page.screenshot({path:new URL('../public/assets/sislop-diamantado-share-v1.jpg',import.meta.url).pathname,type:'jpeg',quality:90});
}finally{await browser.close();}
