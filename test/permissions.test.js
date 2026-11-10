import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowed,managesPeople} from '../src/permissions.js';
import {prepareChanges} from '../src/collaboration.js';
test('perfis restringem financeiro e publicação, preservando a banda',()=>{
 const member={username:'breno',role:'member',access_profile:'full',can_publish:1};
 assert.equal(allowed(member,'finance','write'),true);assert.equal(managesPeople(member),false);
 const editor={...member,username:'editor',access_profile:'editor',can_publish:0};
 assert.equal(allowed(editor,'finance'),false);assert.equal(allowed(editor,'contacts'),false);assert.equal(allowed(editor,'posts','write'),true);assert.equal(allowed(editor,'posts','publish'),false);
 assert.equal(allowed({...editor,can_publish:1},'posts','publish'),true);
 assert.equal(allowed({...editor,access_profile:'viewer'},'tasks','write'),false);
 assert.equal(allowed({...editor,access_profile:'missing'},'finance'),false);
 assert.equal(managesPeople({...member,username:'henrique',role:'admin'}),true);
});
test('autoria do checklist é atribuída pelo servidor e preservada em edições posteriores',()=>{
 const actor={username:'breno'};const initial=prepareChanges({checklist:[{text:'Revisar',done:true}]},{checklist:[{text:'Revisar',done:false}]},actor);
 assert.equal(initial.data.checklist[0].doneBy,'breno');assert.ok(initial.data.checklist[0].doneAt);assert.equal(initial.events[0][0],'check');
 const unchanged=prepareChanges({checklist:[{text:'Revisar',done:true}]},initial.data,{username:'henrique'});assert.equal(unchanged.data.checklist[0].doneBy,'breno');assert.equal(unchanged.events.length,0);
 const reopened=prepareChanges({checklist:[{text:'Revisar',done:false}]},initial.data,actor);assert.equal(reopened.data.checklist[0].doneBy,undefined);assert.equal(reopened.events[0][0],'uncheck');
});
