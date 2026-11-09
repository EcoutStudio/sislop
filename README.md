# Sislop

Site público e portal interno da banda, em português, com Cloudflare Workers + D1 + Access. Sem domínio próprio: endereço gratuito `sislop.<subdomínio-da-conta>.workers.dev` (disponibilidade confirmada no primeiro deploy). Sem dados fictícios publicados e sem dependência de armazenamento do navegador.

## Desenvolvimento

Node.js 24, npm. Use o checkout existente; cada tarefa cloud já é isolada, sem necessidade de worktree.

```sh
npm ci
npm run db:local
npm run dev
```

O site funciona localmente; APIs internas negam acesso por padrão. Para desenvolver o portal, execute `npx wrangler dev --ip 127.0.0.1 --var DEV_AUTH:true`. Esse modo só aceita hostnames de loopback e nunca deve ser incluído na configuração de produção. O D1 local fica em `.wrangler/`, separado da produção.

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Se houver Chromium instalado no sistema, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Testes de navegador usam o banco local e removem os registros que criam. Não execute contra produção.

## Funcionalidades

- Público: agenda, publicações, links para mídia kit e contato `sisloprock@gmail.com`.
- Portal: criar, editar e excluir shows, tarefas com responsáveis, contatos, receitas/despesas em BRL, publicações e mídia kit. Calendário em lista cronológica reúne shows e prazos das tarefas.
- Henrique Melo, Antônio Anísio, Breno Phernan e Cassio Ledo têm acesso completo, inclusive financeiro. Os e-mails individuais ainda precisam ser informados.
- Publicação é explícita, por registro. Observações internas, contatos, tarefas e lançamentos financeiros nunca são retornados pela API pública.
- Mídia kit usa links HTTPS para arquivos existentes. Upload de arquivos, integração de redes sociais, pagamentos e sincronização Google Calendar não estão implementados.
- Alterações ficam registradas em `audit_log` com ator, ação e identificador; não é um sistema contábil fiscal.

## Ativação na Cloudflare gratuita

1. No painel Cloudflare, ative Workers e o subdomínio gratuito `workers.dev`. Ative Zero Trust no plano Free, sem contratar domínio. Verifique os limites gratuitos vigentes na conta antes de habilitar opções pagas.
2. Crie o banco D1 `sislop` no painel ou via `npx wrangler d1 create sislop` autenticado. Anote o UUID do banco e o Account ID; não altere o placeholder do arquivo base: o deploy gera a configuração final.
3. Configure Cloudflare Access para proteger **ambos** `sislop.<subdomínio>.workers.dev/portal*` e `sislop.<subdomínio>.workers.dev/api/internal*`. Use uma aplicação com ambos os caminhos, ou aplicações distintas com o mesmo público aceito conforme sua configuração. A API valida um único AUD; use a mesma aplicação para as duas rotas. Uma rota que gere outro AUD será recusada. Ative o Access para o endereço workers.dev conforme as opções do painel; mantenha o site raiz e `/api/public` públicos. Não habilite proteção global do Worker se isso tornar o site inteiro privado.
4. Habilite login por código único por e-mail e uma política Allow contendo **somente os quatro e-mails individuais**. Sem política Bypass ou Allow Everyone. Copie o domínio da organização (`sua-equipe.cloudflareaccess.com`) e o Application Audience (AUD). A API também verifica assinatura JWT, emissor, audiência e a lista exata de e-mails. Se a configuração de Access para caminhos no workers.dev não estiver disponível na conta, a API permanece fechada; não retire a validação para contornar isso.
5. Crie um token API limitado à conta: Workers Scripts Edit e D1 Edit (incluindo acesso de leitura necessário), sem credencial global. Armazene-o no GitHub, nunca no código ou chat.
6. No GitHub `EcoutStudio/sislop`, em Settings → Environments, crie `production`. Em seus secrets, adicione `CLOUDFLARE_API_TOKEN`. Em suas variables, adicione:

| Variável | Valor |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Account ID da conta Cloudflare |
| `CLOUDFLARE_DATABASE_ID` | UUID do D1 `sislop` |
| `ACCESS_TEAM_DOMAIN` | `sua-equipe.cloudflareaccess.com` |
| `ACCESS_AUD` | Audience da aplicação Access |
| `TEAM_EMAILS` | Os quatro e-mails individuais separados por vírgula |

7. Envie o projeto ao GitHub. O workflow `.github/workflows/deploy.yml` testa pull requests e, em pushes na `main`, aplica migrações e publica Worker + site após os testes. Também pode ser disparado em Actions → Testar e publicar Sislop → Run workflow. O primeiro deploy exige a configuração acima; sem ela o workflow falha explicitamente. Não há publicação de dados de produção em previews de PR.
8. Após publicar: abra o site, confirme a agenda vazia inicial, confirme HTTP 401 em `/api/internal/finance` sem sessão, faça login com cada integrante e crie um registro privado e um show público. Confirme que apenas o show aparece no site. Valide exclusão e edição. Só então considere a publicação concluída.

Sem domínio comprado, os códigos de login são enviados pelo próprio Access; `sisloprock@gmail.com` é o contato da banda, não um serviço SMTP. Não é necessário compartilhar a senha do Gmail.

## Operação

D1 é o banco compartilhado de produção. Preserve-o ao atualizar o site. Faça exportações antes de alterações de esquema (`npx wrangler d1 export sislop --remote --output <arquivo-fora-do-git>` com a configuração de produção). Não comite exportações: contêm dados privados. A migração inicial é aditiva e o Wrangler controla migrações já executadas. Revogar um integrante exige removê-lo da política Access e de `TEAM_EMAILS`, publicar novamente e revogar sessões no Access.

Custos dependem do consumo. A arquitetura usa recursos com plano gratuito e não exige domínio, R2, provedor de e-mail ou serviços pagos; confirme quotas e opções de cobrança na conta Cloudflare. Credenciais e ativação externa não acompanham o repositório.
