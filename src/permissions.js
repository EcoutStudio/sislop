export const profiles={
 full:{label:'Equipe completa',write:['shows','tasks','contacts','finance','posts','media'],read:['shows','tasks','contacts','finance','posts','media']},
 editor:{label:'Conteúdo e edição',write:['tasks','posts','media'],read:['tasks','posts','media','shows']},
 production:{label:'Produção',write:['tasks','shows','contacts'],read:['tasks','shows','contacts','posts','media']},
 finance:{label:'Financeiro',write:['tasks','finance'],read:['tasks','finance','shows','contacts','posts','media']},
 viewer:{label:'Somente leitura',write:[],read:['tasks','shows','posts','media']}
};
export function capabilities(actor){
 const profile=profiles[actor.access_profile]||{read:[],write:[]};
 const admin=actor.role==='admin';
 return Object.fromEntries(['shows','tasks','contacts','finance','posts','media'].map(kind=>[kind,{read:admin||profile.read.includes(kind),write:admin||profile.write.includes(kind),publish:(admin||!!actor.can_publish)&&profile.write.includes(kind)}]));
}
export function allowed(actor,kind,operation='read'){return !!actor&&!actor.must_change_password&&!!capabilities(actor)[kind]?.[operation];}
export function managesPeople(actor){return actor?.role==='admin'&&['henrique','local-development'].includes(actor.username)&&!actor.must_change_password;}
