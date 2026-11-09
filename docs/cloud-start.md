# Retomar o ambiente cloud

Use o checkout existente em `/workspace/sislop`. Cada tarefa já é isolada; não crie worktree sem solicitação.

Use Node 24. Execute `bash docs/cloud-setup.sh` se as dependências precisarem ser instaladas ou atualizadas.

Antes de iniciar ferramentas:

```sh
cd /workspace/sislop
export npm_config_cache=/tmp/sislop-npm
export XDG_CONFIG_HOME=/tmp/sislop-config
export WRANGLER_LOG_PATH=/tmp/sislop-wrangler-logs
export WRANGLER_SEND_METRICS=false
npm run db:local
```

Inicie `npm run dev` para o site. Para desenvolver o portal localmente, use `npx wrangler dev --ip 127.0.0.1 --port 8787 --var DEV_AUTH:true`. Nunca inclua DEV_AUTH no deploy.

Valide com requisições locais: `/api/public` deve retornar 200 e JSON. `/api/internal/me` deve retornar os quatro integrantes somente no modo de desenvolvimento autenticado. Sem esse modo e sem configuração Access, `/api/internal/finance` deve retornar 401.

Reinicie os processos em cada tarefa. Antes de `npm run test:e2e`, encerre apenas os servidores que você iniciou nas portas 8787/8788: os testes iniciam seus próprios servidores. Nesta máquina há Chromium em `/usr/bin/chromium`: use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Execute também `npm test` e `npm run build`.

Os testes usam D1 local. Não copie dados reais nem configure testes contra produção. A publicação externa e suas credenciais estão descritas no README. É necessário permitir `api.cloudflare.com` para operação Cloudflare e `api.github.com` para configuração via API GitHub, preservando os demais domínios da configuração do ambiente.

O salvamento do rascunho de ambiente não foi confirmado pela ferramenta durante a preparação inicial. Estes arquivos preservam os passos para revisão, mas não significam que o ambiente cloud tenha sido publicado.
