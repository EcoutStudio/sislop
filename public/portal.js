const $=s=>document.querySelector(s);
const labels={shows:'Shows',tasks:'Tarefas',contacts:'Contatos',finance:'Financeiro',calendar:'Calendário',posts:'Publicações',media:'Mídia kit'};
let kind='shows',rows=[],members=[],editing=null;
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function api(path,options={}) { const res=await fetch('/api/internal/'+path,options);const data=await res.json();if(!res.ok)throw Error(data.error);return data; }
function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
async function load(){ $('#message').textContent='Carregando…';$('#records').replaceChildren();$('#summary').textContent='';$('#section-name').textContent=labels[kind];$('#new').hidden=kind==='calendar';
 try { rows=kind==='calendar'?(await Promise.all(['shows','tasks'].map(async k=>(await api(k)).map(r=>({...r,source:labels[k]}))))).flat().filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date)):await api(kind);
 if(kind==='finance'){let income=0,expense=0;for(const r of rows)r.direction==='income'?income+=r.amount:expense+=r.amount;$('#summary').textContent=`Receitas: ${money(income)} · Despesas: ${money(expense)} · Saldo: ${money(income-expense)}`;}
 $('#message').textContent=rows.length?'':'Nenhum registro ainda. O próximo passo começa com você.';
 for(const row of rows){const card=node('article','');card.append(node('h3',row.title));for(const key of ['source','date','location','owner','status','email','phone','notes'])if(row[key])card.append(node('p',row[key]));if(row.amount)card.append(node('strong',`${row.direction==='income'?'Receita':'Despesa'} · ${money(row.amount)}`));if(row.published)card.append(node('p','Publicado no site'));if(row.url){const a=node('a','Abrir link →');a.href=row.url;a.rel='noopener noreferrer';card.append(a);}if(kind!=='calendar'){const actions=node('div','');actions.className='actions';const edit=node('button','Editar');edit.onclick=()=>open(row);const del=node('button','Excluir');del.className='secondary';del.onclick=async()=>{if(!confirm('Excluir este registro?'))return;try{await api(`${kind}/${row.id}`,{method:'DELETE'});await load();}catch(e){$('#message').textContent=e.message;}};actions.append(edit,del);card.append(actions);}$('#records').append(card);}
 }catch(e){$('#message').textContent=e.message;}
}
function field(name,label,type='text',options){const wrap=node('label',label);let input;if(options){input=document.createElement('select');for(const [value,text]of options){const o=node('option',text);o.value=value;input.append(o);}}else{input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;}input.name=name;wrap.append(input);$('#fields').append(wrap);return input;}
function open(row=null){editing=row;$('#fields').replaceChildren();$('#form-error').textContent='';$('#form-title').textContent=row?'Editar registro':'Novo registro';field('title',kind==='contacts'?'Nome':'Título').required=true;
 if(['shows','tasks','finance','posts'].includes(kind))field('date',kind==='tasks'?'Prazo':'Data','date');
 if(kind==='shows')field('location','Local');
 if(['shows','tasks'].includes(kind)){field('owner','Responsável','text',[['','Selecione'],...members.map(m=>[m,m])]).required=kind==='tasks';field('status','Status','text',kind==='tasks'?[['Aberta','Aberta'],['Em andamento','Em andamento'],['Concluída','Concluída']]:[['Planejado','Planejado'],['Confirmado','Confirmado'],['Realizado','Realizado'],['Cancelado','Cancelado']]);}
 if(kind==='contacts'){field('email','E-mail','email');field('phone','Telefone');}
 if(kind==='finance'){field('direction','Tipo','text',[['income','Receita'],['expense','Despesa']]);const amount=field('amount','Valor (R$)','number');amount.min='0.01';amount.step='0.01';amount.required=true;}
 if(kind==='posts')field('body','Texto público','textarea');
 if(['shows','posts','media'].includes(kind)){field('url','Link público (HTTPS)','url');field('published','Visibilidade','text',[['false','Somente equipe'],['true','Publicado no site']]);}
 field('notes','Observações internas','textarea');
 if(row)for(const el of $('#form').elements){if(el.name&&row[el.name]!==undefined)el.value=el.name==='amount'?row.amount/100:String(row[el.name]);}
 $('#editor').showModal();}
$('#cancel').onclick=()=>$('#editor').close();$('#new').onclick=()=>open();
$('#form').onsubmit=async event=>{event.preventDefault();const button=$('#form button[type=submit]');button.disabled=true;try{const data=Object.fromEntries(new FormData($('#form')));if('amount'in data)data.amount=Math.round(Number(data.amount)*100);if('published'in data)data.published=data.published==='true';await api(kind+(editing?'/'+editing.id:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});$('#editor').close();await load();}catch(e){$('#form-error').textContent=e.message;}finally{button.disabled=false;}};
async function auth(path,data){const res=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error);return result;}
function bindForm(id,path,onSuccess){$(id).onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),error=form.querySelector('[role=alert]');error.textContent='';button.disabled=true;try{const data=Object.fromEntries(new FormData(form));if('confirmation'in data&&data.password!==data.confirmation)throw Error('As senhas não coincidem');delete data.confirmation;await auth(path,data);form.reset();await onSuccess();}catch(e){error.textContent=e.message;}finally{button.disabled=false;}};}
bindForm('#login-form','auth/login',()=>location.reload());
bindForm('#setup-form','auth/setup',()=>location.reload());
bindForm('#password-form','auth/password',()=>location.reload());
$('#logout').onclick=async()=>{try{await auth('auth/logout',{});location.reload();}catch(e){$('#identity').textContent=e.message;}};
$('#change-password').onclick=()=>{$('#password-panel').hidden=!$('#password-panel').hidden;};
async function adminUsers(){
 const response=await fetch('/api/admin/users');if(!response.ok)throw Error('Não foi possível carregar os usuários');const users=await response.json();$('#users').replaceChildren();
 for(const user of users){const card=node('article','');card.append(node('h3',user.name),node('p',`${user.username} · ${user.role==='admin'?'Administrador':user.enabled?(user.configured?'Ativo':'Aguardando primeiro acesso'):'Desativado'}`));
 if(user.role!=='admin'){
 const reset=node('button',user.configured?'Redefinir senha':'Gerar primeiro acesso');reset.onclick=async()=>{if(user.configured&&!confirm('Redefinir a senha e encerrar todas as sessões deste usuário?'))return;reset.disabled=true;try{const result=await auth(`admin/users/${user.username}/reset`,{});await adminUsers();$('#admin-message').textContent=`Usuário: ${result.username} · Senha temporária: ${result.temporaryPassword}. Copie e compartilhe diretamente com o integrante. Ela não será mostrada novamente após sair desta tela.`;}catch(e){$('#admin-message').textContent=e.message;}finally{reset.disabled=false;}};
 const toggle=node('button',user.enabled?'Desativar acesso':'Reativar acesso');toggle.className='secondary';toggle.onclick=async()=>{try{await auth(`admin/users/${user.username}/toggle`,{enabled:!user.enabled});$('#admin-message').textContent='Acesso atualizado. Sessões anteriores encerradas.';await adminUsers();}catch(e){$('#admin-message').textContent=e.message;}};const actions=node('div','');actions.className='actions';actions.append(reset,toggle);card.append(actions);
 }$('#users').append(card);}
}
try{
 const me=await api('me');members=me.members;
 $('#identity').textContent=`${me.name} · ${me.role==='admin'?'Administrador':'Integrante'} · acesso financeiro`;
 $('#logout').hidden=false;
 if(me.must_change_password){$('#password-panel').hidden=false;$('#password-help').textContent='Troque sua senha temporária para liberar os módulos. Depois entre novamente com a nova senha.';}
 else{
 $('#workspace').hidden=false;
 if(me.role==='admin'&&me.username!=='local-development'){$('#admin-panel').hidden=false;await adminUsers();}
 for(const [key,label]of Object.entries(labels)){const button=node('button',label);button.className='secondary';button.onclick=()=>{kind=key;for(const b of $('.tabs').children)b.classList.remove('active');button.classList.add('active');load();};$('.tabs').append(button);}$('.tabs').firstChild.classList.add('active');await load();
 }
}catch(e){
 $('#identity').textContent='Acesso exclusivo da equipe Sislop.';
 try{const response=await fetch('/api/auth/status');if(!response.ok)throw Error();const status=await response.json();$(status.initialized?'#login':'#setup').hidden=false;}catch{$('#identity').textContent='Não foi possível conectar ao portal. Tente novamente.';}
}
