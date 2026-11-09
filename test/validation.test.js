import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../src/worker.js';
test('financeiro exige valor em centavos positivo e direção',()=>{
 assert.equal(validate('finance',{title:'Cachê',amount:10000,direction:'income'}).amount,10000);
 for(const amount of [0,-1,1.5,NaN])assert.throws(()=>validate('finance',{title:'x',amount,direction:'income'}));
 assert.throws(()=>validate('finance',{title:'x',amount:10,direction:'other'}));
});
test('tarefas exigem integrante responsável',()=>{
 assert.throws(()=>validate('tasks',{title:'Ensaio',owner:'Outro'}));
 assert.equal(validate('tasks',{title:'Ensaio',owner:'Henrique Melo'}).owner,'Henrique Melo');
});
test('publicação e URLs respeitam fronteira pública',()=>{
 assert.throws(()=>validate('contacts',{title:'Privado',published:true}));
 assert.throws(()=>validate('posts',{title:'Link',url:'javascript:alert(1)'}));
 assert.throws(()=>validate('media',{title:'Link',url:'http://example.com'}));
 assert.equal(validate('posts',{title:' Release ',published:true,url:'https://example.com'}).title,'Release');
});
test('campos desconhecidos e tipos inválidos são rejeitados',()=>{
 assert.throws(()=>validate('shows',{title:'Show',admin:true}));
 assert.throws(()=>validate('posts',{title:'Post',published:'true'}));
 assert.throws(()=>validate('shows',{title:'Show',date:'amanhã'}));
});
test('checklists, horários e prioridades válidos; sessões internas nunca viram show público',()=>{
 assert.equal(validate('tasks',{title:'Mixagem',owner:'Henrique Melo',priority:'Alta',checklist:[{text:'Revisar',done:false}]}).checklist.length,1);
 assert.throws(()=>validate('tasks',{title:'Mixagem',owner:'Henrique Melo',checklist:[{text:'Revisar',done:'false'}]}));
 assert.throws(()=>validate('shows',{title:'Sessão',eventType:'Gravação',published:true}));
 assert.throws(()=>validate('shows',{title:'Show',time:'25:30'}));
 assert.equal(validate('shows',{title:'Curitiba',time:'20:00',duration:'60'}).duration,'60');
});
