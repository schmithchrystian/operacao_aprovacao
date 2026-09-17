# Plano de hospedagem com planos gratuitos

Consulta em 14/09/2026. Este documento é um plano; nenhuma conta, recurso ou deployment foi criado. Substitui a proposta paga apenas para uma demonstração pessoal elegível aos termos gratuitos.

## Viabilidade

Vercel Hobby + Supabase Free permite uma demonstração pessoal sem mensalidade, dentro das franquias. Não é uma proposta válida de hospedagem gratuita para o lançamento comercial deste SaaS: Hobby restringe uso a projetos pessoais não comerciais. Acesso sem cobrança, sozinho, não comprova elegibilidade. [Termos do plano Hobby](https://vercel.com/docs/plans/hobby).

O envio de verificação/recuperação para alunos usa Resend, que exige domínio próprio verificado. Sem domínio existente, seu registro é um custo adicional; o subdomínio vercel.app do site não fornece controle DNS para verificar um remetente. O remetente de teste Resend só envia ao e-mail da própria conta. Não desativar verificação para contornar essa restrição. [Resend: remetente de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Contas e acesso

| Conta        | Criação/configuração pelo titular                                                                  | Acesso necessário para implantação                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub       | Usar a conta schmithchrystian existente                                                            | Autorizar a integração Vercel somente no repositório operacao_aprovacao; CLI local já autenticada anteriormente, revalidar antes de publicar |
| Supabase     | Usar a organização Operação Aprovação e o projeto operacao-aprovacao-dev na região de São Paulo    | Conexão PostgreSQL e chave de servidor vão para configuração privada, nunca conversa ou Git                                                  |
| Vercel       | Criar conta em https://vercel.com/signup usando GitHub; Hobby somente se uso pessoal não comercial | Login oficial no navegador/CLI local; importar o repositório e configurar variáveis no painel                                                |
| Resend       | Criar conta em https://resend.com/signup; plano Free                                               | Verificar domínio controlado pelo titular e criar chave somente de envio; armazenar na Vercel                                                |
| Provedor DNS | Usar conta do domínio existente, se houver                                                         | Titular publica os registros de verificação do Resend; não é preciso transferir domínio                                                      |

Não compartilhar senha, código de autenticação, cookie ou token no chat. Fazer login pessoalmente no navegador usado para implantação; se houver CLI, concluir a autorização oficial local. Segredos de integração devem ser inseridos diretamente no painel do provedor ou arquivo local ignorado pelo Git, sem saída em logs. O titular mantém propriedade das contas. Informações compartilháveis: identificadores dos projetos, região, URL pública e domínio escolhido.

## Arquitetura e limites

- Vercel: aplicação Next.js e backend existente, com HTTPS e endereço atribuído ao deployment. Não escolher teste temporário Pro como solução gratuita permanente.
- Supabase: PostgreSQL e buckets privados lesson-materials/lesson-videos. Manter autenticação atual da aplicação; não ativar Supabase Auth como se substituísse automaticamente o login existente. Desabilitar Data API se desnecessária, ou restringir schemas/grants para impedir acesso público às tabelas Prisma.
- Free inclui 500 MB de banco, 1 GB de arquivos e upload máximo de 50 MB por arquivo. Franquias de saída são pequenas: não usar como biblioteca de aulas longas. Exemplo de orçamento: vídeo de 40 MB visto 100 vezes transfere aproximadamente 4 GB, sem contar repetições. [Franquias Supabase](https://supabase.com/pricing).
- Projetos Free podem pausar após sete dias de baixa atividade. Cron não deve ser usado para simular atividade nem tratado como garantia de disponibilidade. [Pausa de projetos](https://supabase.com/docs/guides/platform/free-project-pausing).
- Resend Free: até 3.000 e-mails/mês e 100/dia; cadastro, reenvio e recuperação compartilham orçamento. [Preço e franquias](https://resend.com/pricing).
- Backups: exportar banco e objetos para armazenamento privado sob controle do titular e ensaiar restauração. Cópia apenas de banco não protege vídeos/PDFs; planos gratuitos não eliminam responsabilidade operacional.

## Adaptações antes do deploy gratuito

1. Remover os agendamentos incompatíveis do vercel.json na configuração destinada ao Hobby. Atualmente há execução por minuto e a cada seis horas; Hobby aceita somente uma por dia por job. Não reduzir e-mail a uma vez por dia, pois os tokens precisam chegar a tempo. [Limites Vercel Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).
2. Para demonstração elegível, configurar Supabase Cron com pg_net chamando os endpoints existentes: fila de e-mail por minuto e ranking a cada seis horas. Usar CRON_SECRET exclusivo em header Bearer, guardado no Vault; nenhum segredo na URL ou SQL versionado. Testar resposta HTTP, autorização, repetição, custo e retenção dos logs. Agendamentos consomem recursos das franquias e param se o banco estiver pausado. [Supabase Cron](https://supabase.com/docs/guides/cron), [Vault](https://supabase.com/docs/guides/database/vault).
3. Manter BILLING_REQUIRED=false na demonstração; isso desliga exigência de cobrança, mas não altera os termos comerciais da hospedagem.
4. Separar ambientes. Usar banco local descartável para integração e, se houver disponibilidade na cota da conta, segundo projeto Free para staging. Nunca ligar previews não confiáveis ao banco real.
5. Configurar DATABASE_URL com pooling apropriado ao runtime Prisma; DIRECT_URL fica no contexto protegido das migrations. Região do banco e da aplicação próximas. Validar transações e conexões no deployment.

## Sequência de implantação

Estimativa de trabalho após contas e acessos disponíveis: 2–3 dias úteis; propagação DNS e validação dos provedores podem prolongar o prazo.

| Etapa                   | Trabalho                                                                                                        | Saída exigida                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 — preparação          | Confirmar elegibilidade do plano, conectar GitHub/Vercel/Supabase, registrar região e quotas                    | Contas do titular, projetos identificados, nenhum plano pago ativado |
| 2 — configuração        | Adaptar scheduler, cadastrar segredos, configurar banco e buckets privados                                      | Preflight aprovado e acesso anônimo a dados privados negado          |
| 3 — publicação de teste | Validar commit atual, aplicar migrations sem seed demo, publicar Next.js, criar admin pelo bootstrap            | URL HTTPS, health correto, login funcionando                         |
| 4 — aceite              | Testar notas, progresso, flashcards, sessão revogada, cadastro/recuperação, PDF/vídeo real e backup/restauração | Evidências no ambiente hospedado e defeitos impeditivos resolvidos   |
| 5 — decisão comercial   | Para disponibilização comercial, substituir Hobby por plano/provedor permitido e reavaliar quotas               | Operação compatível com termos e orçamento aprovado pelo titular     |

Variáveis de servidor: APP_ENV, DATA_SOURCE, APP_URL, DATABASE_URL, AUTH_SECRET, CRON_SECRET, ACCOUNT_EMAIL_ENCRYPTION_KEY, ALLOW_DEMO_SEED=false, BILLING_REQUIRED=false, RESEND_API_KEY, EMAIL_FROM, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET e SUPABASE_VIDEO_BUCKET. DIRECT_URL é reservada às migrations. Gerar segredos distintos por ambiente; não usar prefixo NEXT_PUBLIC para credenciais privadas.

O plano não promete zero custo para um SaaS comercial completo com esta combinação. Sem domínio de envio, os testes de e-mail ficam restritos ao titular; sem plano comercial elegível, não liberar o negócio no Hobby. Consultar também [roteiro operacional](PRIMEIRO-DEPLOY.md) e [estado de implementação](STATUS.md).
