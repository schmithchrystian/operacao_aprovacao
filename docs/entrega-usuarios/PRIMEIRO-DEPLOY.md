# Primeiro deploy — roteiro operacional

Este procedimento prepara a primeira release; não registra um deploy já realizado. Use o commit candidato depois de terminar as correções e passar a homologação. A proposta econômica mantém Vercel para Next.js e Supabase para PostgreSQL; custos e alternativas estão no [estudo de infraestrutura](../auditoria-2026-09-13/CUSTOS.md).

## 1. Separar staging e produção

Criar projetos/bancos separados para staging e produção. Preview de pull request não deve receber conexão, segredos ou dados reais de produção. Na Vercel, associar as variáveis ao ambiente correto e usar o domínio canônico correspondente. A plataforma diferencia ambientes de [Preview e Production](https://vercel.com/docs/deployments/environments); mudanças em [variáveis de ambiente](https://vercel.com/docs/environment-variables) valem para novos deployments.

Escolher região da aplicação próxima ao banco. Registrar provedor, projeto, região, limite de gastos e responsável em inventário privado de operação. Nunca registrar tokens, senhas ou URLs de banco com credenciais neste documento.

## 2. Configurar as variáveis

| Variável            | Staging / produção                                                    |
| ------------------- | --------------------------------------------------------------------- |
| `APP_ENV`           | `staging` / `production`                                              |
| `DATA_SOURCE`       | `prisma`                                                              |
| `APP_URL`           | Origem HTTPS canônica de cada ambiente                                |
| `AUTH_SECRET`       | Segredo aleatório próprio por ambiente, pelo menos 32 caracteres      |
| `CRON_SECRET`       | Outro segredo aleatório próprio por ambiente                          |
| `DATABASE_URL`      | Conexão do runtime com usuário limitado e pooling adequado            |
| `DIRECT_URL`        | Conexão reservada ao job de migrations; não necessária no runtime web |
| `DATABASE_POOL_MAX` | Começar com 5 e ajustar por conexões totais medidas                   |
| `ALLOW_DEMO_SEED`   | `false`                                                               |
| `RESEND_API_KEY`    | Credencial do envio transacional; nenhuma variável `NEXT_PUBLIC_*`    |
| `EMAIL_FROM`        | Remetente de domínio verificado                                       |

Usar o cofre de segredos do provedor/CI. Não reutilizar valores de `.env.example`, CI ou seed. `NODE_ENV=production` é controlado pelo build/runtime de produção. O preflight abaixo é executado no contexto do job de deploy, onde `DIRECT_URL` está disponível, e não no navegador.

No Supabase, copiar as conexões do projeto real. A aplicação usa `@prisma/adapter-pg`; testar o modo de pooling com as transações implementadas. Para migrations, usar conexão direta ou de sessão compatível com a rede do executor. Não inferir host/porta a partir de exemplos. Consultar [Prisma com Supabase](https://supabase.com/docs/guides/database/prisma) e [modos de conexão](https://supabase.com/docs/guides/database/connecting-to-postgres). Validar TLS sem desativar a verificação de certificado.

## 3. Validar e migrar em staging

Em checkout limpo da versão candidata, com runtime de `.node-version` e npm de `packageManager`:

```sh
npm ci
npm run db:validate
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm audit --audit-level=moderate
node --test docs/entrega-usuarios/preflight.test.mjs
node node_modules/vitest/vitest.mjs run --config docs/entrega-usuarios/notas.config.ts
node docs/entrega-usuarios/preflight.mjs --environment=staging
```

**O banco dos testes de integração deve ser descartável**, definido por `TEST_DATABASE_URL`, separado do staging utilizado por avaliadores. Conferir os safeguards e fixtures dos testes antes de executá-los. Não apontar a suíte de integração a produção.

Depois dos testes, executar uma única vez por release no banco staging correto:

```sh
npm run db:migrate
npm run build
```

O script existente usa `prisma migrate deploy`; o CLI prioriza `DIRECT_URL`. Não usar `db push`, reset ou o seed demonstrativo como implantação de produção. Não acoplar migrations de produção a todo Preview/build. Para banco já existente, comparar schema/histórico antes de aplicar; não marcar migrations como aplicadas sem provar correspondência.

## 4. Homologar o deployment

Após publicar staging e carregar variáveis correspondentes no job:

```sh
node docs/entrega-usuarios/preflight.mjs --environment=staging --http
```

O script faz somente leituras de health, login e redirecionamento de admin sem sessão. Nunca envia segredos nem imprime corpos de resposta. Proteção de Preview pode bloquear o robô: validar em contexto autorizado, sem desabilitar proteção pública para fazê-lo passar. Esse preflight pressupõe banco gerenciado com hostname público; redes privadas exigem adaptar a política de host, não remover controles da aplicação.

Executar a [matriz de homologação](README.md). Criar o administrador pelo fluxo de bootstrap auditável entregue no produto; se ainda não existir, isso é um bloqueador. Não promover alunos por endpoint público nem rodar seed de contas demonstrativas. Cadastrar conteúdo real, verificar direitos de uso e testar vídeo/material autorizado com conta de aluno.

Confirmar proteção de tabelas: a aplicação usa Prisma no servidor; o Data API do provedor não pode expor tabelas de usuários, notas, respostas ou auditoria a chaves públicas. Restringir grants/schema exposto e testar acesso anônimo diretamente ao Data API quando habilitado.

Configurar `/api/cron/ranking-recalc` somente após testar o custo e duração do recálculo. O handler aceita GET e POST com segredo; o agendamento ainda precisa de configuração. Na Vercel, `CRON_SECRET` é enviado como Bearer conforme a [documentação de cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs). Não executar cron de Preview contra produção. Não colocar segredo em URL.

## 5. Publicar produção e admitir alunos

Congelar commit e artefato homologados. Criar/restaurar um backup de teste antes da primeira operação com dados reais; registrar tempo e evidências. Confirmar compatibilidade de schema entre release atual e anterior. Repetir preflight com `--environment=production`, executar migrations no job protegido e publicar o mesmo commit. Segredos e URLs são os de produção; não copiar o banco com dados fictícios.

Após promoção do domínio, repetir `--environment=production --http` e smoke autenticado com conta de teste controlada. Admitir primeiros alunos em lote pequeno; verificar login, mídia, notas, progresso, erros, conexões e gastos antes de ampliar. Só anunciar recursos homologados.

## 6. Incidente e reversão

Se houver falha de autenticação, acesso indevido ou corrupção, suspender admissão e o fluxo afetado, preservar evidências sanitizadas e acionar o responsável. Reverter aplicação apenas se o código anterior for compatível com o schema atual. Não retornar a mocks nem executar rollback destrutivo de migration como reação automática. Restaurar backup em banco separado, conferir integridade e só então planejar recuperação dos dados. Metas iniciais de recuperação precisam ser medidas; nenhuma garantia foi validada nesta etapa.

## Agendamentos entregues no repositório

Os endpoints autenticados de fila de e-mails, ranking e conciliação de cobrança continuam versionados. O `vercel.json` não registra agendamentos: a conta atual usa Vercel Hobby, que rejeita durante o deploy qualquer job com frequência superior a uma vez por dia. O primeiro Preview remoto confirmou essa restrição.

Para a hospedagem inicial, configurar o Supabase Cron para chamar `/api/cron/account-emails` a cada minuto e `/api/cron/ranking-recalc` a cada seis horas. Configurar `/api/cron/billing` a cada quinze minutos somente depois de habilitar e homologar cobrança. As chamadas enviam `Authorization: Bearer CRON_SECRET`; o segredo deve ficar no Vault, nunca no SQL versionado ou na URL. Processamento de fila é limitado por lote, e cadência não garante prazo de entrega do provedor de e-mail.

Se a operação migrar para Vercel Pro, os três agendamentos podem voltar ao `vercel.json` depois da validação de custo e duração. Fonte: [limites de cron](https://vercel.com/docs/cron-jobs/usage-and-pricing), consultada em 16/09/2026.

O cron automático roda no deployment de Production do projeto Vercel, não nos Previews. Um projeto separado usado para staging pode ter seu próprio deployment de Production, com `APP_ENV=staging` e banco isolado. Preview deve ser testado com disparo controlado ou scheduler exclusivo sem credenciais de produção. Fonte: [configuração de cron](https://vercel.com/docs/cron-jobs/quickstart).

Antes de habilitar o deployment, configurar `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` e `ACCOUNT_EMAIL_ENCRYPTION_KEY`. A última contém 32 bytes aleatórios em Base64, separados do segredo de sessão; a recuperação da fila exige preservar essa chave em cofre. Testar um cadastro fictício no ambiente de homologação e comprovar que o worker envia o e-mail, marca a fila e não repete o envio lógico. Verificar também resposta 401 quando não houver Bearer válido.

Se usar outro provedor, reproduzir os dois agendamentos e o header de autenticação no scheduler dele. Não contratar um serviço adicional apenas para cron sem comparar o custo total. O arquivo versionado configura agendamentos no próximo deploy compatível; **nenhum job hospedado foi ativado por esta frente**.
