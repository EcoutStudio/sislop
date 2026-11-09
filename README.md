# Sislop

Site público e portal interno da banda, em português, com Cloudflare Workers + D1. Login por usuário e senha, sem e-mail. Endereço gratuito `sislop.<subdomínio-da-conta>.workers.dev`. Use **somente a conta Cloudflare criada com sisloprock@gmail.com**; o fato de o GitHub estar em EcoutStudio não conecta a Cloudflare da Ecout.

## Equipe e permissões

| Usuário | Integrante | Permissão |
|---|---|---|
| `henrique` | Henrique Melo | Administrador, todos os módulos e gestão de acessos |
| `antonio` | Antônio Anísio | Todos os módulos, incluindo financeiro |
| `breno` | Breno Phernan | Todos os módulos, incluindo financeiro |
| `cassio` | Cassio Ledo | Todos os módulos, incluindo financeiro |

Nenhuma conta possui senha padrão. Henrique cria a própria senha no primeiro acesso. Depois, em **Acessos da equipe**, gera uma senha temporária para cada integrante, compartilha diretamente com ele e pode redefinir senhas ou desativar acessos. A troca da senha temporária é obrigatória antes de acessar dados. Senhas têm de 12 a 128 caracteres. Não há recuperação por e-mail.

Senhas são armazenadas com PBKDF2-SHA256 (100 mil iterações, salt aleatório individual); sessões de 12h usam tokens aleatórios armazenados como hash e cookies HttpOnly, Secure e SameSite Strict. A API verifica permissões e origem das operações; login/configuração inicial possuem limites de tentativas. Alterar/redefinir senha ou desativar conta invalida sessões, incluindo verificações de versão contra corridas de login. Logs de auditoria não incluem senhas ou tokens.

## Desenvolvimento

Node.js 24 e npm. Use o checkout existente; cada tarefa cloud já é isolada, sem necessidade de worktree.

```sh
npm ci
npm run db:local
npm run dev
```

O D1 local fica em `.wrangler/`, separado da produção. Para exercitar o login real, cadastre uma chave local em `.dev.vars` (arquivo ignorado): `SETUP_TOKEN="<chave-aleatória-local-de-pelo-menos-32-caracteres>"`. Abra `/portal` e configure Henrique. Nunca comite esse arquivo. Para trabalhar apenas nos módulos, o modo opcional `npx wrangler dev --ip 127.0.0.1 --var DEV_AUTH:true` permite acesso local sem senha. Esse modo é aceito somente em loopback e não deve ser configurado em produção.

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Com Chromium instalado no sistema: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Testes de autenticação criam/recriam exclusivamente `.wrangler/auth-test`; os demais testes usam D1 local e removem os registros criados. Não execute testes contra produção. Orientações do ambiente cloud: `docs/cloud-setup.sh` e `docs/cloud-start.md`.

## Publicação automática: Cloudflare Workers Builds

O usuário conectou o Worker `sislop` ao GitHub, branch `codex/sislop-platform`, com builds desativados. O workflow GitHub Actions executa **somente validação**, evitando duas publicações concorrentes.

1. Confirme que a conta Cloudflare é a **Sislop**. O banco D1 criado nessa conta é `sislop`, ID `1a29e347-141e-4d17-83cd-be2d52fd2696`.
2. Em Worker `sislop` → Settings → Builds → Build variables and secrets, adicione a variável de texto `CLOUDFLARE_DATABASE_ID` com esse UUID. Não é uma senha.
3. Configure os comandos de build:

**Build command**
```sh
npm run deploy:config
```

**Deploy command**
```sh
npx wrangler d1 migrations apply sislop --remote --config wrangler.deploy.json && npx wrangler deploy --config wrangler.deploy.json
```

Deixe preview builds desativados para não compartilhar o banco de produção com previews. Se a integração solicitar um token de deploy, use um token exclusivo da conta Sislop com Workers Scripts Edit e D1 Edit. Nunca use tokens/IDs da Cloudflare da Ecout. Workers Builds gerencia suas próprias credenciais de deploy; não copie tokens para o código.

4. Em Worker `sislop` → Settings → Variables and Secrets (as variáveis de **execução do Worker**, não de build), crie um **Secret** chamado `SETUP_TOKEN`. Gere e guarde privadamente uma chave aleatória de pelo menos 32 caracteres, preferencialmente com um gerenciador de senhas. Ela serve apenas para criar a primeira conta de administrador; não é a senha de Henrique e não deve ser enviada no chat. Cadastre-a antes ou imediatamente depois do primeiro deploy, antes de acessar a configuração inicial. Se ela estiver ausente, a configuração inicial permanece bloqueada.
5. Ative os builds e dispare um build da branch conectada. O deploy aplica as migrações aditivas `0001`, `0002` e `0003`; não exclui registros existentes. `npm run deploy:config` só gera a configuração com o ID D1, sem exigir e-mails ou Cloudflare Access. Não é necessário configurar `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` ou `TEAM_EMAILS`.
6. Abra o endereço `workers.dev` do Worker, entre em `/portal`, informe a chave de configuração e escolha sua senha de Henrique. Depois de concluir, remova o secret `SETUP_TOKEN` das configurações do Worker. Mesmo que fique presente, a API não permite configurar Henrique outra vez.
7. Como Henrique, gere os acessos de Antônio, Breno e Cassio. Cada um entra com seu usuário e a senha temporária, troca a senha e faz login novamente. Todos têm acesso financeiro; somente Henrique vê e usa a administração de contas.
8. Valide em produção: site e `/api/public` públicos; `/api/internal/finance` sem sessão retorna 401; integrante não consegue administrar contas (403); registros privados não aparecem no site. Só então considere a publicação concluída.

Não é necessário configurar Cloudflare Access para o portal. Caso tenha criado uma proteção Access anteriormente, remova apenas as regras do aplicativo **Sislop** que interceptam `/portal*` e `/api/*`, para permitir o login próprio da aplicação; não altere outros aplicativos ou a conta Ecout.

## Funcionalidades e operação

- Público: agenda, publicações com texto e links de mídia kit; contato `sisloprock@gmail.com`.
- Portal: criar, editar e excluir shows, tarefas com responsáveis, contatos, receitas/despesas em BRL, publicações e mídia kit. Calendário em lista cronológica reúne shows e prazos.
- Publicação explícita por registro; observações internas, contatos, tarefas e finanças não são retornados pela API pública.
- Mídia kit usa links HTTPS para arquivos existentes. Upload, integração de redes sociais, pagamentos e sincronização Google Calendar não estão implementados.
- Auditoria registra alterações em `audit_log`; não é sistema contábil fiscal.

D1 é o banco compartilhado. Não o recrie em atualizações. Antes de alterar esquemas, faça backup fora do Git com `wrangler d1 export` usando a configuração de produção. Exportações contêm dados privados. As migrações já aplicadas são controladas pelo Wrangler. Se Henrique esquecer a senha e não tiver nenhuma sessão válida, será necessária recuperação administrativa pelo proprietário da conta Cloudflare, fora do portal; reinstalar o site ou recolocar SETUP_TOKEN não redefine uma conta existente.

A arquitetura usa recursos com plano gratuito e não exige domínio, R2 ou serviço de e-mail. Verifique as quotas e eventuais opções pagas na conta da Sislop. Nenhuma alteração na Cloudflare da Ecout é necessária.

## Disparar o primeiro build após conectar o GitHub

Reconectar o GitHub e salvar variáveis não publica automaticamente o código que já estava na branch. Um novo push para `codex/sislop-platform` pode disparar o primeiro build depois de habilitar os builds. Na aba Deployments, uma versão descrita como `Add secret: SETUP_TOKEN` representa apenas a atualização do segredo no Worker anterior; não confirma publicação do projeto. Confira o resultado do build do GitHub e, em caso de falha, consulte os logs antes de tentar novamente.

## Central de trabalho e planejamento inicial

A migração `0004_diamantado_planning.sql` adiciona uma única vez 19 tarefas, 7 rascunhos de conteúdo, 2 sessões de gravação, 1 show e 2 blocos de mídia kit. Ela não altera contas, senhas ou registros existentes. IDs fixos e `INSERT OR IGNORE` impedem duplicações; as edições da banda não são sobrescritas por próximos deploys.

Informações confirmadas pela banda: gravações em 15 e 22/11/2026; apresentação no **Puple Reis, Curitiba, 12/12/2026, 20h–21h**; repertório a receber de Henrique; lançamento de **DIAMANTADO** ainda sem data. Horários seguem Brasília. Responsáveis, prazos de tarefas e ideias editoriais são sugestões identificadas para revisão. Não foram inventados contatos, valores financeiros ou músicas. Nenhum item inicial é publicado automaticamente no site ou em redes sociais.

A visão geral reúne próximas ações, compromissos e distribuição de tarefas. Tarefas possuem prioridade, projeto, frente de trabalho e checklist; podem ser vistas em lista ou quadro de etapas. Busca e filtros ajudam a localizar registros. A agenda agrupa shows, sessões, prazos de tarefas e planejamento editorial. Todos os integrantes podem criar, editar e excluir os registros; somente Henrique acessa a aba discreta **Controle de pessoas**, com permissão também verificada no servidor.

A edição pela interface usa a versão do registro para detectar atualizações concorrentes. Se outra pessoa editar primeiro, o portal pede para carregar a versão atual em vez de sobrescrevê-la. Use **Atualizar** para buscar alterações da equipe.

O mídia kit público está em `/midia-kit`, com seções editáveis no portal (biografia, release, integrantes, fotos, vídeos, ficha técnica, links e contato), links de arquivos e opção de impressão/PDF. Só blocos marcados como públicos aparecem nessa página. O arquivo do mídia kit original ainda precisa ser fornecido pela banda para adaptação; não há upload de arquivos ou integração direta com ABRAMUS/redes sociais.
