import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
test('www e HTTP vão ao domínio principal HTTPS preservando caminho e parâmetros',async()=>{
 for(const input of ['http://www.sislop.com.br/?compartilhar=diamantado','https://www.sislop.com.br/?compartilhar=diamantado','http://sislop.com.br/?compartilhar=diamantado']){
  const response=await worker.fetch(new Request(input),{});assert.equal(response.status,301);assert.equal(response.headers.get('Location'),'https://sislop.com.br/?compartilhar=diamantado');
 }
 const portal=await worker.fetch(new Request('https://www.sislop.com.br/portal'),{});assert.equal(portal.headers.get('Location'),'https://sislop.com.br/portal');
});
test('domínio principal, endereço antigo e desenvolvimento não entram em loop',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('public site')}};
 for(const input of ['https://sislop.com.br/','https://sislop.sisloprock.workers.dev/','http://127.0.0.1:8787/']){
  const response=await worker.fetch(new Request(input),env);assert.equal(response.status,200);assert.equal(await response.text(),'public site');
 }
});
