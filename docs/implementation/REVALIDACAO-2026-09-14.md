# Revalidação de 14/09/2026

Continuação da entrega local, sobre a base `d2bdc06` e as alterações deste commit. Não houve publicação, cobrança, cancelamento externo ou envio real de e-mail.

## Pendências fechadas

- MFA administrativo: TOTP, segredo cifrado, códigos de recuperação de uso único, confirmação e revogação de sessões. Produção exige política ativa. Gerenciamento exige senha e fator atual; a política impede desativação administrativa. O menu da conta oferece acesso a `/seguranca`.
- Conciliação Stripe: varredura autenticada e limitada a cada 15 minutos, recuperação de primeiro webhook perdido, atualização imediata por `invoice.paid`/`invoice.payment_failed` e bloqueio de acesso por reembolso integral, disputa ou dados incompletos. O status canônico da assinatura permanece separado da decisão de acesso.
- Recuperação: script local com snapshot consistente, dump/restore em banco novo e comparação de todas as tabelas. O ensaio encontrou uma corrida na criação de plano ativo; foi corrigida com repetição da unidade transacional completa quando PostgreSQL reporta conflito de unicidade. O teste passou com oito solicitações simultâneas.
- Schema: alinhados o valor padrão da lista de códigos de recuperação e a ação da chave estrangeira MFA à migration já aplicada, sem reescrever o histórico de migrations.

## Resultados

| Verificação                                  | Resultado                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Suíte unitária                               | 872 testes em 129 arquivos aprovados                                                                         |
| Conteúdo Professor RS atualizado em paralelo | 14 testes revalidados, já incluídos na suíte unitária                                                        |
| Integração no banco de origem                | 75 testes em 11 arquivos aprovados                                                                           |
| Integração no banco restaurado               | Os mesmos 75 testes aprovados; não são 75 cenários adicionais                                                |
| Backup/restauração                           | 60 tabelas e 273 registros com contagens e hashes iguais ao snapshot                                         |
| ESLint / TypeScript / build                  | Aprovados                                                                                                    |
| Schema aplicado vs. Prisma                   | Sem diferenças                                                                                               |
| npm audit                                    | Zero vulnerabilidades conhecidas na consulta                                                                 |
| Preflight                                    | 8 testes aprovados; produção exige política MFA e chave própria                                              |
| HTTP no aplicativo compilado                 | Login Credentials, sessão revogada, rate limiting, CSP, readiness e métricas protegidas aprovados            |
| HTTP MFA                                     | Admin sem configuração vai a `/seguranca`; senha isolada é recusada; OTP válido autentica; replay é recusado |

[Evidências sanitizadas](evidencias/2026-09-14/). A suíte unitária completa foi executada antes do ajuste final de concorrência/renovação; essas alterações foram revalidadas nas duas execuções completas de integração, além de lint, tipos, build e HTTP finais. A interface existente foi validada no navegador na rodada anterior; esta rodada não declara novo aceite visual completo de MFA.

Os utilitários de recuperação vieram da distribuição [Postgres.app 2.9.6](https://github.com/PostgresApp/PostgresApp/releases/tag/v2.9.6), montada temporariamente em modo somente leitura. O script `npm run db:verify-backup` aceita apenas banco local de teste e nunca restaura sobre a origem. O arquivo de backup permanece em diretório temporário privado, fora do Git.

## Dependências externas

A publicação depende dos projetos de hospedagem/banco e do domínio escolhidos, além das credenciais configuradas diretamente no ambiente seguro. Ainda faltam testes reais de Resend, Supabase Storage e Stripe, alertas externos e restauração conjunta de banco e objetos na nuvem. A restauração local não comprova PITR, RPO/RTO contratado ou cópia de vídeos/PDFs.

Troca de dispositivo MFA sob política obrigatória continua assistida. O lote de conciliação precisa ser dimensionado conforme a base. Vídeo adaptativo e otimização de agregações de listas permanecem limites documentados, sem prometer capacidade não medida.
