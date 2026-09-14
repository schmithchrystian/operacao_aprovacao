# Operação Aprovação

SaaS de estudos com cursos, simulados, flashcards, missões e gamificação. Next.js 16, React 19, TypeScript e PostgreSQL com Prisma 7.

## Desenvolvimento

Use Node indicado em `.node-version` e npm indicado em `package.json`.

```sh
npm ci
cp .env.example .env
npm run dev
```

O exemplo começa com `DATA_SOURCE=mock`, exclusivo para desenvolvimento/demonstração. Para testar persistência, inicie o PostgreSQL de `docker-compose.yml`, configure `DATA_SOURCE=prisma` e execute `npm run db:migrate`. Não há fallback para mocks quando um banco falha.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run db:validate
```

A integração exige `TEST_DATABASE_URL` apontando para banco descartável cujo nome contém `test`; aplique migrations nesse banco antes de `npm run test:integration`. Os testes incluem concorrência, rollback, autorização, contas, notas e cobrança com transportes externos simulados. O CI também define ensaio de backup/restauração em PostgreSQL isolado.

`npm run build` em produção exige Prisma, `APP_URL` HTTPS e segredos independentes de pelo menos 32 caracteres. Para uma demonstração explícita com mocks, use `APP_ENV=demo` e segredos próprios.

## Implantação

Comece pelo [roteiro de entrega controlada](docs/entrega-usuarios/README.md) e pelo [estado da implementação](docs/implementation/STATUS.md). A existência de código e testes locais não substitui a configuração dos provedores e o aceite em nuvem.

- Contas: Resend, remetente verificado e `ACCOUNT_EMAIL_ENCRYPTION_KEY` Base64 de 32 bytes; scheduler autenticado processa `/api/cron/account-emails`.
- Materiais: bucket privado Supabase, credencial somente no servidor; PDF de até 4 MB. [Operação e mídia](docs/implementation/OPERACAO.md).
- Vídeo: HTTPS cadastrado ou objeto MP4 privado `storage:videos/chave.mp4`, disponibilizado após autorização por URL temporária. Nenhum vídeo fictício é usado pelo ambiente Prisma.
- Cobrança: [Stripe configurável](docs/production/BILLING.md). `BILLING_REQUIRED=true` exige configuração completa; não ative antes de validar webhook e acesso em ambiente de teste do provedor.
- Administrador inicial: `npm run db:bootstrap-admin -- --help`; criação explícita por stdin, sem promover contas existentes ou usar seed de demonstração.

## Organização

`src/contracts` valida entradas/DTOs; `src/server/services` concentra regras e autorização; `src/server/repositories` implementa os contratos em mock e Prisma. Migrations são aditivas e ordenadas em `prisma/migrations`.

Os [11 perfis de revisão](docs/agents/README.md) cobrem QA, segurança, desenvolvimento e operação. Relatórios datados preservam o diagnóstico da versão anterior; a situação atual fica em `docs/implementation`, com evidências e pendências operacionais separadas.
