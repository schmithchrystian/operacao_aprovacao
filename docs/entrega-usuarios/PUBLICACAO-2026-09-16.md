# Preparação de publicação — 16/09/2026

## Confirmado nos painéis

- GitHub: o endereço anterior plataforma_study redireciona para schmithchrystian/operacao_aprovacao. Confirmado também pela CLI GitHub.
- Vercel: criado operacao-aprovacao (Next.js), ID prj_ACE3DQJXYnWj8QY503CV8Hyy3Fhu, conectado ao repositório correto. Projeto Vite anterior preservado.
- Endereço atribuído: https://operacao-aprovacao-ten.vercel.app — o primeiro build falhou por configuração incompleta e ainda não é serviço operacional.
- Supabase: operacao-aprovacao-dev, referência wgbmzbblsigjbxtwqhdm, Healthy, São Paulo, Free. As 13 migrations foram aplicadas e registradas, incluindo o fechamento das tabelas públicas com RLS.
- Vercel: plano Hobby. Nenhuma contratação ou upgrade realizado.

## Alterações efetivas

Criado projeto e salvas sete variáveis Config, somente no ambiente Production da Vercel: DATA_SOURCE=prisma, APP_ENV=production, APP_URL correspondente ao domínio atribuído, ALLOW_DEMO_SEED=false, BILLING_REQUIRED=false, SUPABASE_URL do projeto e DATABASE_POOL_MAX=3. Confirmação de gravação observada no painel.

Preparado arquivo local privado .env.deploy.local, ignorado pelo Git e com permissão 0600. Quatro segredos aleatórios independentes foram gerados localmente (sessão, cron, fila de e-mail e MFA). A conexão de runtime usa um papel PostgreSQL exclusivo, com pool limitado a três conexões; os valores não constam neste relatório e ainda não foram enviados à Vercel. A chave de servidor do Supabase foi obtida diretamente do painel e permanece apenas nesse arquivo protegido.

O banco foi validado pelo pooler com o papel app_runtime. Todas as tabelas públicas estão com RLS e sem políticas públicas; o backend acessa por papel privado com BYPASSRLS. Os buckets lesson-materials e lesson-videos foram criados como privados. O build de produção local com as variáveis reais concluiu com sucesso usando webpack.

## Bloqueadores antes do deploy

1. Enviar à Vercel os segredos protegidos já preparados e disparar novo build; a autenticação do painel precisa ser concluída pelo titular na etapa de consentimento do provedor.
2. Criar a integração Resend e validar um remetente. Sem essas duas variáveis, cadastro, verificação e recuperação por e-mail não estão prontos para usuários externos.
3. A branch com correções é codex/saas-production-hardening. O CI do commit e9f6c44 passou integralmente; a migration de RLS será incluída em commit posterior. Main permanece na base antiga até o aceite do deployment.
4. Hobby não permite uso comercial e não aceita os cron atuais: e-mails por minuto, ranking por seis horas e cobrança por quinze minutos. É necessário plano elegível para produção comercial, ou alternativa de hospedagem. Um scheduler externo resolveria frequência, mas não elegibilidade comercial.
5. Preparar backup e homologar com dados controlados antes de receber usuários. O nome dev do projeto não prova autorização para apagar dados; nenhum reset foi realizado.

Projeto criado e vínculo confirmado não equivalem a deploy. Nenhuma URL foi anunciada como funcionando e nenhum job externo foi ativado.
