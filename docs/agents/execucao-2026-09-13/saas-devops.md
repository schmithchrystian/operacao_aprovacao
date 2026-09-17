# saas-devops — entrega e ambientes

Rodada local de 2026-09-13, HEAD `b640716c317e3f20cc15fadb6a74188fc9b58794` com alterações concorrentes. Objetivo: avaliar entrega reproduzível. Resultado: **alterações necessárias**. Deploy e alteração de infraestrutura não executados.

## Achados

| ID / severidade | Evidência / impacto | Reprodução segura e proposta | Dono / aceite |
|---|---|---|---|
| OPS-01 / alta | Inventário local não encontra `.github/`, `vercel.json` nem `.env.example`. `docs/production/CI_CD.md:44` descreve gates, mas é plano. `package.json:5` possui comandos de validação, sem evidência de execução obrigatória remota. | Conferir inventário e configuração do provedor quando houver acesso. Versionar pipeline e exemplo de variáveis sem valores reais; registrar proteção remota da branch. | DevOps; PR propositalmente inválido falha no gate; commit/artefato do deploy coincide com o validado. |
| OPS-02 / alta | `src/config/env.ts:18` aceita mock por padrão; validações `:38`–`:59` não rejeitam mock em produção. É possível configuração de produção com dados efêmeros mesmo com segredos personalizados. | Teste isolado do parser com production/mock; exigir fonte persistente para ambiente público e distinguir APP_ENV quando previews precisarem de modo demonstrativo. | Dev + SEC; configuração pública com mock falha antes de servir tráfego, com teste negativo. |
| OPS-03 / alta | `docs/production/BACKUP_AND_RECOVERY.md:5` declara que restauração não foi executada. `prisma.config.ts:15` já usa conexão direta preferencial, mas não prova migrations aplicadas nem reversão. | Ensaio em banco descartável e staging; usar migrations expand/contract e comprovar compatibilidade com artefato anterior. | Dados + DevOps; migration e smoke passam, rollback de aplicação ensaiado sem corrupção. |

## Pipeline concreto proposto

PR: checkout por SHA → runtime fixado em versão suportada escolhida pelo time → `npm ci` → `npm run db:validate` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`. PostgreSQL efêmero separado: aplicar `prisma migrate deploy`, executar integração real e isolamento entre usuários. Os testes de integração precisam existir e ser ligados ao job; trocar DATA_SOURCE não prova que testes com mocks usam banco real.

Promoção: registrar SHA e digest do artefato → staging isolado → migration aditiva → smoke de login/progresso/autorização/cron → registro de backup recuperável → ambiente production → migration → promover artefato validado → smoke. Evitar corrida entre deploy automático do provedor e migration. Não adicionar aprovação manual obrigatória por interpretação desta rodada; seguir autorização e controles efetivamente configurados.

| Ambiente | Dados e acesso | Configuração proposta |
|---|---|---|
| Local/teste | Sintéticos; banco descartável quando integração | mock permitido, exemplo sem segredos |
| Staging | PostgreSQL/storage exclusivos; acesso restrito | produção quanto ao runtime, provedores sandbox e chaves exclusivas |
| Produção | Dados reais; banco/storage exclusivos | persistência obrigatória, segredos exclusivos, sem seed demo |

Reversão: retirar promoção do artefato com falha para versão anterior compatível; verificar smoke e métricas. Migration destrutiva não é revertida automaticamente por rollback de aplicação; preparar forward fix ou recuperação testada, preservando novas escritas. Registrar responsável e evidência da decisão.

Validações executadas: scripts existentes, configuração Prisma/env, inventário e documentos conferidos. Não repeti lint/test/build porque QA executa a validação da rodada; este parecer não declara esses comandos aprovados. Sem acesso a pipelines/ambientes, proteção de branches, deploy, smoke ou restauração remota permanecem não comprovados. Arquivo criado: este relatório. Prevenção: checklist de promoção vinculado ao SHA e exercícios de rollback em staging.
