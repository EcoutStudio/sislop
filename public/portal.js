const $=s=>document.querySelector(s);
const labels={overview:'Visão geral',tasks:'Tarefas',calendar:'Agenda',shows:'Shows & sessões',posts:'Conteúdo',finance:'Financeiro',contacts:'Contatos',media:'Mídia kit'};
const taskStages=['Aberta','Em andamento','Bloqueada','Concluída'];
const postStages=['Ideia','Em produção','Em revisão','Agendada','Publicada'];
const categories=['Produção musical','Clipe','Lançamento','Comunicação','Direitos autorais','Show','Administrativo'];
let kind='overview',rows=[],members=[],editing=null,currentUser=null,loadSequence=0;
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateText=date=>date?new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'Data a definir';
const done=row=>['Concluída','Realizado','Cancelado','Publicada'].includes(row.status);
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
async function api(path,options={}){const res=await fetch('/api/internal/'+path,options);const data=await res.json();if(!res.ok)throw Error(data.error);return data;}
async function auth(path,data){const res=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error);return result;}
function dataOnly(row){return Object.fromEntries(Object.entries(row).filter(([key])=>!['id','updated_at','source','sourceKind'].includes(key)));}
async function saveRow(row,updates={},source=kind){return api(`${source}/${row.id}`,{method:'PUT',headers:{'Content-Type':'application/json',...(row.updated_at?{'If-Unmodified-Since':row.updated_at}:{})},body:JSON.stringify({...dataOnly(row),...updates})});}
function badge(text,type=''){return node('span',text,'badge '+type);}
function action(label,handler,secondary=true){const b=node('button',label,secondary?'secondary':'');b.type='button';b.onclick=handler;return b;}
function resetFilters(){for(const id of ['#search','#owner-filter','#status-filter','#category-filter'])$(id).value='';}
async function navigate(next){kind=next;resetFilters();for(const button of $('.tabs').children){button.classList.toggle('active',button.dataset.kind===kind);button.setAttribute('aria-current',button.dataset.kind===kind?'page':'false');}$('#people-tab').classList.toggle('active',kind==='people');await load();}
function setOptions(select,values,label){const current=select.value;select.replaceChildren(node('option',label));select.firstChild.value='';for(const v of [...new Set(values.filter(Boolean))]){const o=node('option',v);o.value=v;select.append(o);}select.value=[...select.options].some(o=>o.value===current)?current:'';}
async function load(){
 const loadId=++loadSequence;
 $('#section-name').textContent=kind==='people'?'Controle de pessoas':labels[kind];$('#section-caption').textContent=kind==='overview'?'DIAMANTADO / PRÓXIMOS PASSOS':'SISLOP / '+(labels[kind]||'ADMINISTRAÇÃO').toUpperCase();
 $('#new').hidden=['calendar','people'].includes(kind);$('#new').textContent=kind==='overview'?'+ Nova tarefa':kind==='shows'?'+ Novo compromisso':'+ Novo registro';
 $('#overview').hidden=kind!=='overview';$('#admin-panel').hidden=kind!=='people';$('#record-tools').hidden=['overview','people'].includes(kind);$('#records').replaceChildren();$('#summary').textContent='';$('#message').textContent='Carregando…';
 try{
 if(kind==='people'){await adminUsers();$('#message').textContent='';return;}
 if(kind==='overview'){await overview();$('#message').textContent='';return;}
 const loadedRows=kind==='calendar'?(await Promise.all(['shows','tasks','posts'].map(async key=>(await api(key)).map(r=>({...r,source:labels[key],sourceKind:key}))))).flat().filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')):await api(kind);
 if(loadId!==loadSequence)return;rows=loadedRows;
 setOptions($('#owner-filter'),members,'Todos');setOptions($('#status-filter'),kind==='tasks'?taskStages:kind==='posts'?postStages:rows.map(r=>r.status),'Todas');setOptions($('#category-filter'),rows.map(r=>r.category||r.eventType),'Todas');
 $('#owner-filter').parentElement.hidden=kind==='finance'||kind==='media';$('#view-mode').parentElement.hidden=kind!=='tasks';render();
 }catch(e){if(loadId===loadSequence)$('#message').textContent=e.message;}
}
function filtered(){const q=$('#search').value.trim().toLocaleLowerCase('pt-BR');return rows.filter(row=>(!q||[row.title,row.notes,row.body,row.owner,row.project,row.location,row.channel].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(q))&&(!$('#owner-filter').value||row.owner===$('#owner-filter').value)&&(!$('#status-filter').value||row.status===$('#status-filter').value)&&(!$('#category-filter').value||(row.category||row.eventType)===$('#category-filter').value));}
function render(){
 const list=filtered();$('#records').replaceChildren();$('#records').className='cards';$('#message').textContent=list.length?'':'Nenhum registro encontrado. Ajuste os filtros ou adicione o primeiro item.';
 $('#summary').textContent=`${list.length} de ${rows.length} registro${rows.length===1?'':'s'}`;
 if(kind==='finance'){let income=0,expense=0;for(const r of list)r.direction==='income'?income+=r.amount:expense+=r.amount;$('#summary').textContent=`Receitas: ${money(income)} · Despesas: ${money(expense)} · Saldo: ${money(income-expense)} · ${list.length} lançamentos no filtro`;}
 if(kind==='calendar'){renderAgenda(list);return;}
 if(kind==='tasks'&&$('#view-mode').value==='board'){
 $('#records').className='kanban';for(const stage of taskStages){const column=node('section',undefined,'kanban-column');const subset=list.filter(r=>(r.status||'Aberta')===stage);column.append(node('h3',`${stage} · ${subset.length}`));for(const row of subset)column.append(recordCard(row));$('#records').append(column);}return;
 }
 const priority={'Alta':0,'Média':1,'Baixa':2};if(kind==='tasks')list.sort((a,b)=>Number(done(a))-Number(done(b))||(priority[a.priority]??1)-(priority[b.priority]??1)||(a.date||'9999').localeCompare(b.date||'9999'));if(kind==='shows'||kind==='posts')list.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
 for(const row of list)$('#records').append(recordCard(row));
}
function recordCard(row,source=kind){
 const card=node('article',undefined,'record-card');const badges=node('div',undefined,'badges');if(row.priority)badges.append(badge(row.priority,row.priority==='Alta'?'urgent':''));if(row.category||row.eventType)badges.append(badge(row.category||row.eventType));if(row.published)badges.append(badge('Público','public'));if(row.origin==='Planejamento sugerido')badges.append(badge('Sugestão inicial','suggestion'));card.append(badges,node('h3',row.title));
 if(row.project)card.append(node('p',row.project,'project-name'));
 const meta=node('div',undefined,'record-meta');if(row.date){const date=node('p',dateText(row.date)+(row.time?' · '+row.time:'')+(row.duration?' · '+row.duration+' min':''));if(row.date<today()&&!done(row))date.className='overdue';meta.append(date);}if(row.location)meta.append(node('p',row.location));if(row.owner)meta.append(node('p',row.owner));if(row.channel)meta.append(node('p','Canal: '+row.channel));if(row.status)meta.append(badge(row.status));card.append(meta);
 for(const key of ['email','phone'])if(row[key])card.append(node('p',row[key]));if(row.body)card.append(node('p',row.body,'body-copy'));if(row.notes){const details=node('details');details.append(node('summary','Observações e contexto'),node('p',row.notes));card.append(details);}
 if(row.amount)card.append(node('strong',`${row.direction==='income'?'Receita':'Despesa'} · ${money(row.amount)}`,'finance-amount'));
 if(row.checklist?.length){const completed=row.checklist.filter(i=>i.done).length;const wrap=node('div',undefined,'checklist');wrap.append(node('small',`${completed}/${row.checklist.length} etapas concluídas`));const progress=document.createElement('progress');progress.max=row.checklist.length;progress.value=completed;progress.setAttribute('aria-label','Progresso do checklist');wrap.append(progress);for(const [i,item]of row.checklist.entries()){const label=node('label',undefined,'check-item');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=item.done;checkbox.onchange=async()=>{checkbox.disabled=true;try{await saveRow(row,{checklist:row.checklist.map((c,j)=>j===i?{...c,done:checkbox.checked}:c)},source);await load();}catch(e){checkbox.checked=item.done;$('#message').textContent=e.message;}finally{checkbox.disabled=false;}};label.append(checkbox,node('span',item.text));wrap.append(label);}if(source==='tasks'&&$('#view-mode').value==='board'){const details=node('details');details.append(node('summary',`Checklist · ${completed}/${row.checklist.length}`),wrap);card.append(details);}else card.append(wrap);}
 if(row.url){const a=node('a','Abrir material →');a.href=row.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
 if(source==='tasks'){const select=document.createElement('select');select.className='stage-select';select.setAttribute('aria-label','Mover tarefa: '+row.title);for(const stage of taskStages){const option=node('option',stage);option.value=stage;select.append(option);}select.value=row.status||'Aberta';select.onchange=async()=>{select.disabled=true;try{await saveRow(row,{status:select.value},source);await load();}catch(e){select.value=row.status||'Aberta';$('#message').textContent=e.message;}finally{select.disabled=false;}};card.append(select);}
 const actions=node('div',undefined,'actions');actions.append(action('Editar',()=>{kind=source;open(row);}));if(source==='tasks'&&row.status!=='Concluída')actions.append(action('Concluir',async()=>{try{await saveRow(row,{status:'Concluída'},source);await load();}catch(e){$('#message').textContent=e.message;}}));actions.append(action('Excluir',async()=>{if(!confirm(`Excluir “${row.title}”? Esta ação não pode ser desfeita.`))return;try{await api(`${source}/${row.id}`,{method:'DELETE'});await load();}catch(e){$('#message').textContent=e.message;}}));card.append(actions);return card;
}
function renderAgenda(list){
 $('#records').className='agenda';const groups=new Map();for(const row of list){if(!groups.has(row.date))groups.set(row.date,[]);groups.get(row.date).push(row);}
 for(const [date,items]of groups){const group=node('section',undefined,'agenda-day');group.append(node('h3',dateText(date)));const content=node('div',undefined,'agenda-items');for(const row of items){const item=node('article',undefined,'agenda-item');const info=node('div');info.append(badge(row.source),node('h3',row.title),node('p',[row.sourceKind==='tasks'?'Prazo da tarefa':row.sourceKind==='posts'?'Planejamento de conteúdo':row.time?row.time+(row.duration?' · '+row.duration+' min':''):'Horário a definir',row.location,row.owner].filter(Boolean).join(' · ')));const edit=action('Abrir',async()=>{const source=row.sourceKind;await navigate(source);open(row);});item.append(info,edit);content.append(item);}group.append(content);$('#records').append(group);}
}
async function overview(){
 const keys=['tasks','shows','posts','finance'];const values=await Promise.all(keys.map(key=>api(key)));const data=Object.fromEntries(keys.map((key,i)=>[key,values[i]]));const active=data.tasks.filter(t=>!done(t)),blocked=active.filter(t=>t.status==='Bloqueada');const upcoming=data.shows.filter(s=>s.date>=today()&&!done(s)).sort((a,b)=>a.date.localeCompare(b.date));const total=data.tasks.length,completed=data.tasks.filter(done).length;
 if(kind!=='overview')return;const root=$('#overview');root.replaceChildren();const hero=node('article',undefined,'release-hero');const text=node('div');text.append(node('p','EM PRODUÇÃO','eyebrow'),node('h3','DIAMANTADO'),node('p','Do estúdio ao próximo palco. Um lugar para organizar o disco, os clipes e tudo que precisa acontecer.'));const launch=badge('Lançamento · data a definir');text.append(launch);const button=action('Organizar tarefas →',()=>navigate('tasks'),false);hero.append(text,button);root.append(hero);
 const stats=node('div',undefined,'stat-grid');for(const [label,value,link,detail]of [['Tarefas em aberto',active.length,'tasks',`${active.filter(t=>t.priority==='Alta').length} de alta prioridade`],['Próximos compromissos',upcoming.length,'calendar','Gravações, ensaios e shows'],['Conteúdos em preparo',data.posts.filter(p=>p.status!=='Publicada').length,'posts','Ideias, produção e revisão'],['Etapas concluídas',`${completed}/${total}`,'tasks',blocked.length?`${blocked.length} tarefa(s) bloqueada(s)`:'Evolução do planejamento']]){const card=action('',()=>navigate(link));card.className='stat-card';card.append(node('small',label),node('strong',String(value)),node('span',detail));stats.append(card);}root.append(stats);
 const grid=node('div',undefined,'overview-grid');const next=node('section',undefined,'dashboard-panel');next.append(node('h3','Próximos encontros'),node('p','Agenda da banda · horários de Brasília'));for(const event of upcoming.slice(0,4)){const item=node('article',undefined,'compact-event');item.append(badge(event.eventType||'Show'),node('h4',event.title),node('p',`${dateText(event.date)}${event.time?' · '+event.time:''}${event.duration?' · '+event.duration+' min':''}`));if(event.location)item.append(node('p',event.location));item.append(action('Ver compromisso',async()=>{await navigate('shows');open(event);}));next.append(item);}if(!upcoming.length)next.append(node('p','Sem compromissos futuros cadastrados.'));grid.append(next);
 const focus=node('section',undefined,'dashboard-panel');focus.append(node('h3','O que precisa de atenção'),node('p','Bloqueios, prioridades e prazos mais próximos'));const sorted=[...active].sort((a,b)=>Number(b.status==='Bloqueada')-Number(a.status==='Bloqueada')||Number(b.priority==='Alta')-Number(a.priority==='Alta')||(a.date||'9999').localeCompare(b.date||'9999'));for(const task of sorted.slice(0,5)){const item=node('article',undefined,'focus-item');item.append(node('h4',task.title),node('p',`${task.owner||'Sem responsável'} · ${dateText(task.date)}`),badge(task.status==='Bloqueada'?'Bloqueada':task.priority||'Média'));item.append(action('Abrir tarefa',async()=>{await navigate('tasks');open(task);}));focus.append(item);}if(!active.length)focus.append(node('p','Tudo em dia. Adicione as próximas ações.'));grid.append(focus);root.append(grid);
 const workload=node('section',undefined,'dashboard-panel');workload.append(node('h3','A banda em movimento'),node('p','Responsáveis do planejamento inicial são sugestões: redistribuam conforme a disponibilidade.'));const people=node('div',undefined,'workload');for(const member of members){const count=active.filter(t=>t.owner===member).length;const item=node('div');item.append(node('strong',member),node('p',`${count} tarefa${count===1?'':'s'} em aberto`));people.append(item);}workload.append(people);root.append(workload);
 const balance=data.finance.reduce((sum,r)=>sum+(r.direction==='income'?r.amount:-r.amount),0);const foot=node('p',`Saldo registrado: ${money(balance)} · Valores refletem somente lançamentos cadastrados.`,'overview-footnote');root.append(foot);
}
function field(name,label,type='text',options){const wrap=node('label',label);let input;if(options){input=document.createElement('select');for(const [value,text]of options){const o=node('option',text);o.value=value;input.append(o);}}else{input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;}input.name=name;input.setAttribute('aria-label',label);wrap.append(input);$('#fields').append(wrap);return input;}
function options(values){return values.map(v=>[v,v]);}
function open(row=null){
 editing=row;$('#fields').replaceChildren();$('#form-error').textContent='';$('#form-title').textContent=row?'Editar '+(kind==='tasks'?'tarefa':'registro'):'Novo '+(kind==='tasks'?'tarefa':'registro');field('title',kind==='contacts'?'Nome':'Título').required=true;
 if(['shows','tasks','finance','posts'].includes(kind))field('date',kind==='tasks'?'Prazo':'Data','date');
 if(kind==='shows'){field('eventType','Tipo de compromisso','text',options(['Show','Gravação','Ensaio','Reunião']));field('time','Horário (Brasília)','time');const duration=field('duration','Duração (minutos)','number');duration.min='1';duration.max='999';field('location','Local');}
 if(['shows','tasks','posts'].includes(kind)){field('owner','Responsável','text',[['','Selecione'],...options(members)]).required=kind==='tasks';field('status','Etapa','text',options(kind==='tasks'?taskStages:kind==='posts'?postStages:['Planejado','Confirmado','Realizado','Cancelado']));}
 if(kind!=='contacts'){field('project','Projeto / campanha');}
 if(['tasks','posts'].includes(kind)){field('priority','Prioridade','text',options(['Média','Alta','Baixa']));field('category','Frente de trabalho','text',[['','Selecione'],...options(categories)]);}
 if(kind==='posts')field('channel','Canal','text',options(['Instagram','TikTok','YouTube','Imprensa','E-mail','Outros']));
 if(kind==='contacts'){field('email','E-mail','email');field('phone','Telefone');field('category','Categoria / relação');}
 if(kind==='finance'){field('direction','Tipo','text',[['income','Receita'],['expense','Despesa']]);const amount=field('amount','Valor (R$)','number');amount.min='0.01';amount.step='0.01';amount.required=true;field('category','Categoria do lançamento');}
 if(['posts','media'].includes(kind))field('body',kind==='media'?'Texto do material':'Texto da publicação','textarea');
 if(kind==='media'){field('category','Seção do mídia kit','text',options(['Biografia','Release','Integrantes','Fotos','Vídeos','Ficha técnica','Links','Contato','Outros']));field('status','Etapa','text',options(['Rascunho','Em revisão','Aprovado']));}
 if(['shows','posts','media'].includes(kind)){field('url','Link público ou arquivo (HTTPS)','url');field('published','Visibilidade no site','text',[['false','Somente equipe / rascunho'],['true','Público no site']]);$('#fields').append(node('p','Somente o que estiver marcado como público aparece no site. Publicar no portal não envia conteúdo para redes sociais.','field-help'));}
 if(['tasks','shows','posts'].includes(kind)){const checklist=field('checklistText','Checklist · uma etapa por linha','textarea');checklist.placeholder='Ex.: Confirmar local\nSeparar equipamentos\nRevisar material';}
 if(['tasks','shows','posts','media'].includes(kind))field('origin','Planejamento','text',[['Definido pela banda','Definido pela banda'],['Planejamento sugerido','Sugestão para revisão'],['Informado pela banda','Informação confirmada pela banda']]);
 field('notes','Observações internas','textarea');
 if(row)for(const el of $('#form').elements){if(el.name==='checklistText')el.value=row.checklist?.map(i=>i.text).join('\n')||'';else if(el.name&&row[el.name]!==undefined)el.value=el.name==='amount'?row.amount/100:String(row[el.name]);}
 $('#editor').showModal();
}
$('#refresh').onclick=()=>load();
$('#cancel').onclick=()=>$('#editor').close();$('#new').onclick=async()=>{if(kind==='overview')await navigate('tasks');open();};
for(const id of ['#search','#owner-filter','#status-filter','#category-filter','#view-mode'])$(id).addEventListener(id==='#search'?'input':'change',render);
$('#form').onsubmit=async event=>{
 event.preventDefault();const button=$('#form button[type=submit]');button.disabled=true;
 try{const data=Object.fromEntries(new FormData($('#form')));if('amount'in data)data.amount=Math.round(Number(data.amount)*100);if('published'in data)data.published=data.published==='true';if('checklistText'in data){data.checklist=data.checklistText.split('\n').map(s=>s.trim()).filter(Boolean).map(text=>({text,done:editing?.checklist?.find(i=>i.text===text)?.done||false}));delete data.checklistText;}
 if(editing)await saveRow(editing,data);else await api(kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});$('#editor').close();await load();
 }catch(e){$('#form-error').textContent=e.message;}finally{button.disabled=false;}
};
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
 const me=await api('me');currentUser=me;members=me.members;
 $('#identity').textContent=`${me.name} · ${me.role==='admin'?'Administrador':'Integrante'} · acesso financeiro`;
 $('#logout').hidden=false;
 if(me.must_change_password){$('#password-panel').hidden=false;$('#password-help').textContent='Troque sua senha temporária para liberar os módulos. Depois entre novamente com a nova senha.';}
 else{
 $('#workspace').hidden=false;
 if(me.role==='admin'){$('#people-tab').hidden=false;$('#people-tab').onclick=()=>navigate('people');}
 for(const [key,label]of Object.entries(labels)){const button=node('button',label);button.className='secondary';button.dataset.kind=key;button.onclick=()=>navigate(key);$('.tabs').append(button);}await navigate('overview');
 }
}catch(e){
 $('#identity').textContent='Acesso exclusivo da equipe Sislop.';
 try{const response=await fetch('/api/auth/status');if(!response.ok)throw Error();const status=await response.json();$(status.initialized?'#login':'#setup').hidden=false;}catch{$('#identity').textContent='Não foi possível conectar ao portal. Tente novamente.';}
}
