# Operação do candidato

## Ambiente e identidade

Produção/staging recusam mock, segredos default e URL pública sem HTTPS. Use banco dedicado, usuário com privilégios de runtime mínimos e conexão direta separada para migrations. Crie o primeiro administrador pelo bootstrap explícito; não habilite `ALLOW_DEMO_SEED` em produção.

As contas públicas exigem Resend configurado e `ACCOUNT_EMAIL_ENCRYPTION_KEY` Base64 canônica de 32 bytes aleatórios. Preserve essa chave com segurança: a fila guarda apenas payload cifrado AES-GCM. Sem a chave, e-mails pendentes não podem ser recuperados. Planeje rotação drenando a fila antes da troca. Não reutilize `AUTH_SECRET`.

O scheduler deve chamar `/api/cron/account-emails` a cada minuto com `Authorization: Bearer CRON_SECRET`. Cadastro enfileira; não envia diretamente. Sem scheduler, a conta não recebe o link. Configure alarmes de fila atrasada/falha e valide entrega no domínio real.

## Materiais e vídeo

Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=lesson-materials` e `SUPABASE_VIDEO_BUCKET=lesson-videos`. Ambos os buckets precisam ser **privados**. A chave de serviço nunca pertence a variável `NEXT_PUBLIC_*` nem a código cliente.

O administrador pode enviar PDF de até 4 MB pela lista de aulas. O servidor verifica permissão, tamanho, MIME e assinatura PDF, usa chave aleatória e tenta remover o objeto se a gravação no banco falhar. Essa validação não é antivírus; o download é forçado como anexo. URLs de PDF duram 120 segundos e só são emitidas após autorização da aula.

Vídeos MP4 podem ser enviados pelo painel/CLI seguro do provedor e vinculados no admin como `storage:videos/chave-aleatoria.mp4`. O servidor emite URL por 15 minutos depois de verificar conta, matrícula, publicação e desbloqueio. Se expirar durante nova requisição do player, o usuário pode recarregar a aula para renovar o acesso. URLs HTTPS externas continuam suportadas: sua privacidade depende do provedor de origem. Este candidato não oferece transcodificação adaptativa nem upload de arquivos de vídeo pela aplicação.

Backup PostgreSQL não inclui bytes dos buckets. Mantenha cópia independente de objetos e teste restauração com banco e arquivos correspondentes. Falha na remoção compensatória pode deixar objeto órfão; acompanhe inventário do bucket contra referências no banco antes de qualquer exclusão.

## Observabilidade e recuperação

`GET /api/health` verifica conectividade com o banco e retorna somente estado, sem credenciais. `GET /api/ops/metrics` exige o segredo de cron e oferece contagem/idade da fila de e-mails e último cálculo do ranking. Não exponha esse segredo ao navegador.

`src/instrumentation.ts` emite evento JSON `request.error` com rota de código e identificador de correlação, sem mensagem bruta da exceção, query, cookies ou corpo. Configure coleta/alerta no host e um monitor de disponibilidade independente. A instrumentação segue a [API oficial do Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation).

O CI define dump, restauração em outro banco e integração sobre o destino restaurado. Esse ensaio precisa passar no runner; não é comprovação de backup gerenciado, PITR ou recuperação de objetos em nuvem. O ensaio local passou a usar pg_dump/pg_restore 18 obtidos da distribuição oficial [Postgres.app](https://github.com/PostgresApp/PostgresApp/releases/tag/v2.9.6). `scripts/verify-backup.mjs` exporta snapshot consistente, restaura em banco novo, compara contagens e hashes canônicos de todas as tabelas públicas e apaga o destino por padrão. `KEEP_RESTORED_TEST_DATABASE=true` preserva apenas o destino de teste para validação adicional. Os resultados atuais estão no relatório de revalidação; isso não comprova PITR nem restauração de objetos na nuvem.

Antes de liberar dados reais: exercite indisponibilidade do banco, restauração isolada, revogação de sessão, fila atrasada e rollback de release compatível com migrations. Registre duração e perda observadas. O [plano de recuperação](../production/BACKUP_AND_RECOVERY.md) é referência operacional histórica; condições comerciais do provedor precisam ser conferidas no ambiente contratado.

## MFA e pagamentos

Produção exige `ADMIN_MFA_REQUIRED=true` e `MFA_ENCRYPTION_KEY` própria (64 caracteres hexadecimais, 32 bytes). O administrador de bootstrap pode entrar para configurar `/seguranca`; operações administrativas ficam bloqueadas até ativação. Guarde a chave fora do banco, junto ao processo seguro de recuperação. Confira [o procedimento MFA](../security/MFA.md).

O cron `/api/cron/billing` consulta assinaturas e checkouts a cada 15 minutos, limitado por lote e tempo. Webhook e conciliação preservam o status Stripe e mantêm separadamente o bloqueio de acesso por reembolso integral, disputa ou evidência incompleta. Não há cobrança, cancelamento ou estorno externo automático. Política, capacidade e homologação estão em [BILLING.md](../production/BILLING.md).
