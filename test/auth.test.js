import {test} from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,validPassword,digest} from '../src/auth.js';
test('senhas exigem tamanho mínimo e hash depende do salt',async()=>{
 assert.equal(validPassword('curta'),false);assert.equal(validPassword('x'.repeat(129)),false);assert.equal(validPassword('senha longa para testes'),true);
 const a=await passwordHash('senha longa para testes','salt-one');
 assert.equal(a.length,64);assert.notEqual(a,'senha longa para testes');
 assert.equal(a,await passwordHash('senha longa para testes','salt-one'));
 assert.notEqual(a,await passwordHash('senha longa para testes','salt-two'));
 assert.notEqual(a,await passwordHash('outra senha longa','salt-one'));
 assert.equal((await digest('session')).length,64);
});
