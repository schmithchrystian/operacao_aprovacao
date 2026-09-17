# Preparação de publicação — 16/09/2026

## Confirmado nos painéis

- GitHub: o endereço anterior plataforma_study redireciona para schmithchrystian/operacao_aprovacao. Confirmado também pela CLI GitHub.
- Vercel: criado operacao-aprovacao (Next.js), ID prj_ACE3DQJXYnWj8QY503CV8Hyy3Fhu, conectado ao repositório correto. Projeto Vite anterior preservado.
- Endereço de produção: https://operacao-aprovacao-ten.vercel.app. O deployment 7jo2r2dkaHgRGPEtGtpNAZcU2M38 do commit 5164622 concluiu como Ready.
- Supabase: operacao-aprovacao-dev, referência wgbmzbblsigjbxtwqhdm, Healthy, São Paulo, Free. As 13 migrations foram aplicadas e registradas, incluindo o fechamento das tabelas públicas com RLS.
- Vercel: plano Hobby. Nenhuma contratação ou upgrade realizado.

## Alterações efetivas

Criado projeto e salvas as variáveis Config e Secret necessárias, somente no ambiente Production da Vercel: persistência Prisma, URL canônica, limites de pool, buckets privados, MFA administrativo, conexão PostgreSQL e segredos de sessão, cron, criptografia e Supabase. Confirmação de gravação observada no painel; valores secretos não constam neste relatório.

Preparado arquivo local privado .env.deploy.local, ignorado pelo Git e com permissão 0600. Quatro segredos aleatórios independentes foram gerados localmente (sessão, cron, fila de e-mail e MFA). A conexão de runtime usa um papel PostgreSQL exclusivo, com pool limitado a três conexões. A chave de servidor do Supabase foi obtida diretamente do painel e enviada apenas ao ambiente Secret da Vercel.

O banco foi validado pelo pooler com o papel app_runtime. Todas as tabelas públicas estão com RLS e sem políticas públicas; o backend acessa por papel privado com BYPASSRLS. Os buckets lesson-materials e lesson-videos foram criados como privados. O build de produção local com as variáveis reais concluiu com sucesso usando webpack.

O endpoint /api/health respondeu 200 após consultar o banco remoto. Home, login e cadastro responderam corretamente; a tela de login foi validada no navegador sem erros de console. O cron de ranking rejeitou chamada anônima com 401 e aceitou a chamada autenticada com 200; seu agendamento de seis em seis horas foi ativado no Supabase Cron usando segredo no Vault. O administrador inicial foi criado com MFA obrigatório e a credencial temporária ficou em arquivo local ignorado pelo Git, modo 0600.

## Pendências antes de liberar cadastro externo

1. Criar a integração Resend e validar um remetente. Sem RESEND_API_KEY e EMAIL_FROM, cadastro, verificação e recuperação por e-mail permanecem indisponíveis; o cron de e-mail ficou desligado após o endpoint confirmar 503 por configuração ausente.
2. A branch com correções é codex/saas-production-hardening. Todos os checks do commit 5164622 passaram, incluindo testes PostgreSQL, restauração, auditoria e build. Main permanece na base anterior até a promoção final.
3. Hobby não permite uso comercial. É necessário plano/provedor elegível antes de abrir o SaaS como negócio, independentemente de o deployment técnico estar funcional.
4. Exportar e guardar o primeiro backup fora do Supabase, incluindo objetos dos buckets quando houver conteúdo.

O deployment técnico está funcional para homologação controlada. Cadastro público deve permanecer fechado até concluir e testar o provedor de e-mail e confirmar a hospedagem permitida para uso comercial.
