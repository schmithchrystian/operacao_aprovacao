# Arquitetura — Operação Aprovação

> Documento produzido na **Fase 1** pelo subagente `architect` e consolidado pelo agente principal.
> Fonte de verdade das decisões estruturais. Atualizar conforme as fases evoluírem.

## 1. Visão geral

Plataforma web para cursos preparatórios de concursos de segurança pública/militar
(Polícia Militar, Guarda Civil Municipal, Polícia Penal, Bombeiro Militar e afins).
Hospeda cursos em vídeo, organiza conteúdo em trilhas cronológicas (Curso → Módulo → Aula),
acompanha a evolução do aluno e aplica gamificação sóbria estilo arcade.

**Estado inicial:** greenfield (só `CLAUDE.md` e `.claude/agents/*.md`).
**Ambiente:** Windows, **sem Node/npm/npx** e **sem PostgreSQL** → estratégia **mocks-first**.

## 2. Camadas (regra de dependência: setas sempre para dentro)

1. **Apresentação** — `src/app`, `src/components`, `features/*/components`. Server Components por
   padrão; Client Components só para interatividade (player, drag-and-drop, timers, forms).
2. **Contratos** — `src/contracts` (Zod + DTOs inferidos, compartilhados UI↔server).
3. **Ações/rotas** — `src/server/actions` e `src/app/api`. Fronteira de entrada: auth → validação → service. **Sem regra de negócio.**
4. **Serviços de domínio** — `src/server/services`. Regra, orquestração, transações, emissão de eventos. Não conhecem HTTP nem Prisma.
5. **Repositórios** — `src/server/repositories`. Abstração de persistência (interface + mock/prisma). Único ponto que conhece a origem dos dados.
6. **Infra transversal** — `authorization`, `validation`, `errors`, `audit`, `events`, `lib`.

Fluxo: **UI → contratos/actions → services → repositories (interface)**.
Proibido importar `@prisma/client` fora de `server/repositories/prisma/**` e `server/db`.

## 3. Decisões arquiteturais (ADRs)

| # | Decisão | Justificativa |
|---|---------|---------------|
| 0001 | App Router com route groups + camada `server/`; `app/` só orquestra | Não concentrar em `app/`; componentes sem acesso ao banco |
| 0002 | Repository com **interface + impl mock e prisma**, selecionadas por `DATA_SOURCE` | Trocar mock→Prisma sem tocar services/actions/UI |
| 0003 | Contratos como **fonte única em Zod** (`src/contracts`), tipos por `z.infer` | Elimina duplicação de tipos |
| 0004 | **Server Actions** padrão para mutações de UI; **Route Handlers** para casos específicos | Menos boilerplate + segurança server-side |
| 0005 | Auth.js (NextAuth v5) + Credentials + sessão **JWT** no MVP; PrismaAdapter depois | JWT não exige tabela de sessão; login sobre mocks |
| 0006 | Autorização **server-side** centralizada (`requireUser`/`requireRole`/`assertOwnership`) | Anti-IDOR; autorização sempre no backend |
| 0007 | **Barramento de eventos de domínio (outbox)**; consumidores idempotentes | Desacopla study-tracking/simulations de gamification |
| 0008 | Recompensas e cálculos críticos **só no backend**, em transação | Regra dura anti-fraude |
| 0009 | Tarefas agendadas como **Route Handlers protegidos** (`/api/cron/*` + `CRON_SECRET`) | Sem processo residente; recálculo idempotente disparável |
| 0010 | Config central tipada em `src/config` validada por Zod | Valores configuráveis sem dispersão |
| 0011 | Mocks centralizados/tipados em `src/mocks`, nunca dentro de páginas | Regra do CLAUDE.md |
| 0012 | Dark mode padrão (`next-themes`) + tokens de tema em CSS vars | Identidade visual |

## 4. Estrutura de pastas (definitiva)

```text
plataforma_study/
├─ prisma/                 # schema.prisma, migrations/, seed.ts   (agente database)
├─ docs/adr/               # ADRs detalhados (opcional; resumo acima)
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/           # login, registro, recuperar senha
│  │  ├─ (student)/        # layout com sidebar do aluno + páginas
│  │  ├─ admin/            # layout separado
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ progress/heartbeat/route.ts    # alta frequência
│  │  │  ├─ uploads/route.ts
│  │  │  ├─ webhooks/subscriptions/route.ts
│  │  │  └─ cron/{ranking-recalc,daily-close}/route.ts
│  │  ├─ layout.tsx        # ThemeProvider (dark padrão), providers
│  │  └─ globals.css
│  ├─ components/{ui,layout,charts,shared}/
│  ├─ features/<dominio>/{components,hooks,constants,index.ts}
│  ├─ contracts/           # DTOs Zod compartilhados
│  ├─ server/
│  │  ├─ db/               # prisma client singleton (lazy)
│  │  ├─ repositories/{contracts,mock,prisma,index.ts}
│  │  ├─ services/         # regra de negócio (agentes de domínio)
│  │  ├─ actions/          # Server Actions
│  │  ├─ authorization/  validation/  errors/  events/  audit/  auth/
│  ├─ mocks/{data,factories,index.ts}
│  ├─ lib/  hooks/  types/  config/
├─ tests/{unit,integration,e2e}/
├─ package.json  tsconfig.json  next.config.ts  tailwind.config.ts  components.json  .env.example
```

Sidebar do aluno: Início, Minha trilha, Cursos, Montar estudo, Simulados, Plano de estudos,
Acompanhamento, Brainstorm, Flashcards, Modo foco, Ranking, Conquistas, Perfil. Admin separado.

## 5. Contratos

- DTOs em `src/contracts/<dominio>.ts`: `XxxInput` (entrada), `XxxDTO`/`XxxOutput` (saída); `type X = z.infer<...>`.
- Resultado padrão de Action: `ActionResult<T> = { ok:true; data:T } | { ok:false; error:{ code; message; fieldErrors? } }`. Nunca vazar stack.
- **DTO ≠ modelo persistido (Prisma).** Repositórios retornam entidades de domínio; services convertem para DTO na fronteira.
- Heartbeat de vídeo (sinais brutos, nunca "percentual final"): `{ lessonId, sessionId, positionSeconds, durationSeconds, playing, tabVisible, playbackRate, clientTimestamp }`.
- Correção de simulado: cliente envia só `{ attemptId, answers:[{questionId, selectedOptionId}] }`; gabarito/nota só após correção server-side.

## 6. APIs — Server Actions vs Route Handlers

**Server Action** quando: mutação disparada por UI/form autenticado; resposta consumida pela mesma
árvore React; precisa de `revalidatePath/Tag`. Ex.: concluir aula, criar/mover card, salvar plano,
iniciar/finalizar simulado, revisar flashcard, atualizar perfil.

**Route Handler** quando: alta frequência/telemetria (heartbeat), integração com terceiros
(webhooks), auth (`[...nextauth]`), upload de arquivos, cron/disparo externo, ou resposta fora do React.

Regra: ambos são **finos** e chamam o **mesmo service** (`authorization → validation(Zod) → service`). Nunca duplicar regra.

## 7. Autenticação e autorização

- Auth.js (NextAuth v5) em `src/server/auth`. MVP: Credentials contra `mocks/data/users` (hash mock), sessão **JWT**. Callbacks preenchem `token.role`/`token.userId`.
- `middleware.ts` só para UX (redirecionar não-autenticado, separar `(student)` de `admin`). **Autorização real é sempre server-side.**
- RBAC: `Role = aluno | professor | moderador | admin`. Helpers: `requireUser()`, `requireRole(...)`, `assertOwnership(ownerId, userId)`; `policies/` por domínio.
- Rotas `admin/**`, `/api/cron/*`, `/api/uploads`, `/api/webhooks/*` sempre protegidas.

## 8. Domínios de negócio (alto nível — regras finais são dos agentes donos)

- **Gamificação (gamification):** domínios de origem emitem eventos (`LessonCompleted`, etc.) em transação; o consumidor calcula pontos/XP e grava `GamificationEvent`+`PointTransaction` com `idempotencyKey` (`lesson-completed:<userId>:<lessonId>`). Histórico imutável; `versão da regra` no evento.
- **Vídeo/tempo válido (study-tracking):** player envia heartbeats; o service reconstrói progresso/tempo válido server-side (detecta saltos, aba oculta, duplicados, sessões simultâneas). Conclusão só com ≥ percentual configurável (default 80% em `config/business.ts`).
- **Ranking (gamification):** métricas compostas normalizadas (default 35/25/20/10/10), materializadas em `RankingScore` com período+versão; leitura só da tabela (cache); opt-out respeitado no service.
- **Tarefas agendadas:** `/api/cron/ranking-recalc` e `/api/cron/daily-close`, idempotentes, protegidos por `CRON_SECRET`; disparo manual no MVP, scheduler externo depois.

## 9. Dependências previstas (instalar quando houver Node)

Core: `next react react-dom typescript`. UI: `tailwindcss postcss autoprefixer class-variance-authority
clsx tailwind-merge tailwindcss-animate lucide-react next-themes` + Shadcn CLI. Forms: `react-hook-form
zod @hookform/resolvers`. Auth: `next-auth` (v5) `@auth/prisma-adapter bcryptjs`. Dados: `prisma
@prisma/client`. Gráficos: `recharts`. Utils: `date-fns nanoid`. Qualidade: `eslint eslint-config-next
prettier @typescript-eslint/*`. Testes: `vitest @testing-library/react @testing-library/jest-dom jsdom
@playwright/test`.

## 10. Escopo do MVP

**Entra:** estrutura base + tema dark; contratos Zod centrais; `server/` com interfaces de repositório +
impl mock + container; Auth.js Credentials/mocks/RBAC; layout aluno (sidebar) + admin; fluxo vertical
Cursos→Módulo→Aula com player+heartbeat+conclusão(≥80%)+evento; dashboard com XP/progresso via mocks;
simulado básico (criar tentativa, responder, correção server-side, resultado); ranking/conquistas leitura.

**Pendência:** `schema.prisma` completo/migrations/seeds e troca real mock→Prisma; fórmulas definitivas
(pontos/níveis/ranking) e regras finais de tempo válido; repetição espaçada; brainstorm drag-and-drop
persistido; plano avançado; assinaturas/webhooks; uploads/hospedagem de vídeo; rate limit distribuído;
notificações em tempo real. **Execução de `lint/typecheck/test/build/prisma` bloqueada até Node+PostgreSQL.**

## 11. Riscos principais

| Risco | Sev. | Mitigação |
|-------|------|-----------|
| Sem Node/npm/npx | Alto | Escrever fonte manualmente; validações como pendência explícita |
| Sem PostgreSQL | Alto | Mocks-first + Repository; `DATA_SOURCE=mock` default |
| Acoplamento mock→Prisma | Médio | Proibir import de `@prisma/client` fora de `repositories/prisma` |
| DTO vs schema divergentes | Médio | DTO como fonte da UI; testes de mapeamento repo→DTO |
| Hospedagem de vídeo indefinida | Médio | Abstrair provider atrás de interface; MVP com HTML5/URL mock |
| Fraude de tempo/pontos | Alto | ADR-0008; cálculo/idempotência server-side; revisão security por fase |
| Cron sem runtime | Médio | Endpoints idempotentes disparáveis (ADR-0009) |

## 12. Nota sobre numeração de fases

O enunciado cita "24 fases"; o `CLAUDE.md`/ordem de implementação lista **23**. Numeração canônica
adotada: **23** (conforme "Ordem de implementação"). A "Fase 1" é esta análise arquitetural.
