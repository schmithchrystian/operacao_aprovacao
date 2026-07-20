# Hospedagem de Vídeo — Decisão (Operação Aprovação)

> Produzido pelo subagente `backend` (cluster infra de mídia). Complementa
> [`CURRENT_STATE.md`](./CURRENT_STATE.md) (bloqueador #7 — vídeo sintético,
> `src/server/services/study-tracking/lesson-view.ts:91`), [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md)
> (§5 — candidatos a provedor de vídeo) e [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) (vídeo em
> sandbox fora de produção). Só análise/planejamento — nenhum código, recurso ou credencial foi
> criado nesta fase.

## 0. Contexto verificado no código

- `Lesson.videoUrl` / `Lesson.videoProvider` já existem no schema (`prisma/schema.prisma:406-407`) — campos preparados, mas **sem provider real** por trás.
- `getLessonView` (`src/server/services/study-tracking/lesson-view.ts`) já faz a checagem de autorização correta ANTES de montar o DTO: `requireUser` → `assertOwnership` → `assertActiveEnrollment(userId, course.id)` (linha 36) → resolve módulo/aula → só então monta `videoUrl` (linha 91, hoje um placeholder sintético `https://cdn.opapp.mock/videos/${lesson.id}.mp4`).
- `assertActiveEnrollment` (`src/server/services/study-tracking/enrollment.ts`) já define "matrícula ativa" = existe `Enrollment` cujo `status` não é `cancelled` (`completed` mantém acesso — revisão legítima).
- O heartbeat (`record-heartbeat.ts` + `heartbeat-evaluator.ts`) já reconstrói `watchedPercent`/tempo válido 100% no servidor, com anti-fraude (saltos de posição, sessões concorrentes, cap de gap) — isso **não muda** com a escolha de provider; o provider só precisa expor posição/tempo de reprodução ao player, o heartbeat já existe e independe de onde o vídeo está hospedado.
- CSP atual (`next.config.ts`): `connect-src 'self'`, `img-src 'self' data: https:`, sem `media-src`/`frame-src` dedicados. **Qualquer provider escolhido exige atualizar a CSP** (domínio do player/HLS/thumbnails) — repassado como pendência ao agente `security`.

## 1. Critérios e comparação

| Critério | **Cloudflare Stream** | **Mux** | **Bunny Stream** | **Vimeo (Pro/Business)** | **YouTube não-listado** | **Supabase Storage (arquivo cru)** |
|---|---|---|---|---|---|---|
| Custo | Por minuto armazenado + por minuto entregue; **verificar no painel Cloudflare** | Por minuto codificado + entregue (mais caro historicamente); **verificar no painel Mux** | Mais barato do grupo (CDN-first); **verificar no painel Bunny** | Assinatura mensal por plano + limite de armazenamento; **verificar no painel Vimeo** | **Gratuito** | Custo de storage/egress do Supabase (GB armazenado + GB baixado); **verificar no painel Supabase** |
| Streaming adaptativo (HLS/DASH) | Sim, nativo (encoding automático em múltiplas resoluções) | Sim, nativo (encoding automático + qualidade adaptável) | Sim (Bunny Stream faz transcode + HLS) | Sim (transcode gerenciado) | Sim (YouTube transcodifica e serve adaptativo) | **Não** — serve o arquivo bruto (`.mp4`); sem transcode/adaptativo |
| Proteção de conteúdo (token/signed URL) | **Sim** — signed URLs/tokens JWT com expiração, restrição por domínio (`allowedOrigins`) | **Sim** — signed playback URLs (JWT), política de expiração | **Sim** — token authentication (URL assinada com expiração + IP opcional) | Parcial — domínio de embed restrito (Business+), download pode ser desabilitado, mas link direto não é "assinado" por padrão | **Não** — "não listado" não é controle de acesso real; qualquer pessoa com o link assiste, indexação/descoberta indireta é possível | Sim, via signed URL do Storage (mas protege só o arquivo, não o *streaming*) |
| Métricas/analytics | Sim (visualizações, retenção, países) — plano/painel a confirmar detalhamento | Sim, **Mux Data é o mais forte do mercado** (QoE, buffering, retenção por segundo) | Básico (views, bandwidth); menos granular | Sim (Business+: heatmap de retenção) | Básico (YouTube Analytics, mas fora do nosso produto) | Nenhuma (é só armazenamento) |
| Integração com Next.js | SDK/player oficial (`@cloudflare/stream-react` ou `<stream>` custom element) + Workers | SDK oficial (`@mux/mux-player`, `@mux/mux-node`), boa doc para App Router | Player HTML5 padrão + API REST simples | `<iframe>` embed ou SDK; menos "server-first" | `<iframe>` embed | Direto via `@supabase/supabase-js` (sem player dedicado) |
| Qualidade (transcode/bitrate ladder) | Boa, automática | Excelente (encoding otimizado, "mux quality") | Boa, configurável | Boa | Boa (mas fora do nosso controle de branding) | Depende do arquivo original (sem otimização) |
| Legendas (captions) | Suporta upload de WebVTT | Suporta (`text_tracks`) | Suporte mais limitado (depende do plano) | Suporta bem (auto-gerado em planos altos) | Suporta (auto-legendas do YouTube) | Manual (arquivo `.vtt` separado, sem integração de player) |
| Thumbnails | Geração automática (frame em qualquer timestamp via URL) | Geração automática (`thumbnail.jpg?time=`) | Geração automática | Geração automática | Geração automática | Nenhuma automática (precisaria gerar à parte) |
| Controle de acesso por matrícula | Via signed URL/token emitido pelo backend (fluxo abaixo) | Via signed playback URL/JWT emitido pelo backend | Via signed URL emitido pelo backend | Parcial (embed restrito, não é por-usuário) | Nenhum (link único vale para qualquer um) | Via signed URL do Storage (mas sem DRM/streaming) |
| Risco de download indevido | Baixo (signed URL expira; sem `.mp4` direto exposto) | Baixo (idem) | Baixo-médio (depende de config; alguns players HLS ainda são "baixáveis" com ferramentas) | Médio (embed pode ser gravado; "download" da página impede só o botão) | **Alto** (qualquer ferramenta de download de YouTube funciona) | **Alto** (arquivo `.mp4` bruto, uma vez com a URL — mesmo assinada — pode ser baixado igual a qualquer arquivo) |
| Escalabilidade (CDN global, milhares de alunos simultâneos) | Excelente (CDN da própria Cloudflare) | Excelente (CDN próprio) | Boa (CDN da Bunny, historicamente focado nisso) | Boa | Excelente (mas fora do produto) | Limitada para vídeo longo (não é CDN de streaming, é object storage) |

## 2. Recomendação por fase

### MVP (validar produto, poucos usuários, orçamento mínimo)
**YouTube não-listado**, com uma ressalva importante: **não é controle de acesso real**, é só "não aparece em busca/listagem". Serve apenas como ponte temporária enquanto o modelo de matrícula/pagamento ainda está em validação e o conteúdo não é sensível/pago. **Não usar** se o conteúdo já tiver valor comercial protegido nesta fase — nesse caso, ir direto para Bunny Stream (custo baixo, já com signed URL real).

Alternativa MVP com proteção real e custo baixo: **Bunny Stream** — já entrega signed URL, HLS adaptativo e custo por GB tipicamente menor que Mux/Cloudflare Stream, sem exigir todo o aparato de analytics que o produto ainda não precisa.

### Crescimento (base de alunos maior, precisa de dados de engajamento)
**Mux** — melhor telemetria de reprodução do mercado (Mux Data: retenção segundo a segundo, buffering, qualidade por sessão), o que é diretamente reaproveitável pelo módulo de `study-tracking`/`acompanhamento` (cruzar heartbeat próprio com QoE do player). Custo mais alto que Bunny/Cloudflare, mas a decisão de crescimento é justamente trocar custo por dado de produto.

### Produção com conteúdo pago (prioridade = proteção de conteúdo + custo previsível em escala)
**Cloudflare Stream** — signed URLs com expiração curta e `allowedOrigins` (o vídeo só reproduz embutido no nosso domínio), boa integração com o restante do stack se a Vercel/edge já conversa com Cloudflare (DNS/CDN), preço historicamente mais previsível em volume alto (por minuto entregue) que Mux. Se a telemetria fina do Mux for indispensável no plano de produto, considerar Mux mesmo em produção — a escolha entre os dois nesta fase é sobretudo **custo em escala vs. profundidade de analytics**, não segurança (ambos protegem bem).

**Evitar em qualquer fase paga:** Supabase Storage para o arquivo de vídeo em si (sem streaming adaptativo, sem proteção real — uma URL assinada de um `.mp4` bruto, uma vez obtida, é baixável como qualquer download) e Vimeo (controle de acesso por-usuário mais fraco que os providers de streaming dedicados, pensado para embed público/semi-público, não para paywall educacional).

**Nunca hospedar vídeo grande no GitHub nem no filesystem da Vercel** (funções serverless da Vercel são efêmeras e têm limite de payload/tempo de execução; repositório Git não é CDN e infla o clone/deploy) — válido em todas as fases.

## 3. Como o backend valida acesso de um aluno matriculado (fluxo obrigatório)

Regra central: **nunca expor uma URL pública direta e permanente de vídeo**. O `videoUrl` retornado por `getLessonView` hoje é o problema (`cdn.opapp.mock/videos/{id}.mp4` — sintético, mas com a MESMA forma que um bug real teria: um link fixo e público). O alvo é substituir esse campo por um **token/URL assinada de curta duração**, emitida por uma action/route **depois** de repetir exatamente as checagens que `getLessonView`/`recordHeartbeat` já fazem:

1. `requireUser()` — sessão real do Auth.js (nunca aceitar `userId` do corpo da requisição).
2. `assertOwnership(userId, session.userId)` — o aluno só pode pedir vídeo para si mesmo.
3. `assertActiveEnrollment(userId, courseId)` — matrícula ativa (não `cancelled`) no curso dono da aula (reaproveita a função já existente em `enrollment.ts`, mesma regra usada por `lesson-view.ts` e `record-heartbeat.ts`).
4. Checar o status de liberação da aula (`locked`/`available`/`in_progress`/`completed`) via `computeProgressForCourse` — igual ao que `getLessonView` já faz antes de montar o DTO; aula `locked` não pode gerar token de vídeo.
5. Só então: chamar o `VideoProvider` (interface nova, atrás da qual mora o SDK do provider escolhido) para **assinar uma URL/token de reprodução de curta duração** (minutos, não horas) — no Cloudflare Stream isso é um JWT de playback com `exp` curto; no Mux, uma signed playback URL com política de expiração; no Bunny, uma URL com token+expiração.
6. O player do cliente recebe **só o token/URL assinada**, nunca uma credencial de provider nem um ID de vídeo "cru" reutilizável indefinidamente.
7. O heartbeat (`/api/progress/heartbeat`, já existente) continua sendo a fonte de verdade do progresso — o token de vídeo serve só para **autorizar a reprodução**, não substitui a reconstrução server-side de `watchedPercent`.

Consequência de design: a emissão do token deve ser uma **Server Action ou Route Handler dedicado** (ex.: `POST /api/videos/[lessonId]/token` ou equivalent Server Action), chamado pela página da aula pouco antes de montar o player — nunca embutir a URL assinada diretamente no HTML/DTO de uma página cacheada por muito tempo, dado que ela expira.

### Diagrama — fluxo de vídeo (request → matrícula → URL assinada → player → heartbeat)

```mermaid
sequenceDiagram
    actor Aluno
    participant UI as Página da aula (Next.js)
    participant Action as Server Action / Route<br/>"emitir token de vídeo"
    participant Auth as requireUser + assertOwnership
    participant Enroll as assertActiveEnrollment
    participant Progress as computeProgressForCourse<br/>(status da aula)
    participant Provider as VideoProvider (iface)<br/>Cloudflare Stream / Mux / Bunny
    participant Player as Player embutido (client)
    participant HB as /api/progress/heartbeat<br/>(já existente)

    Aluno->>UI: Abre a página da aula
    UI->>Action: pedir token de reprodução (lessonId)
    Action->>Auth: valida sessão + ownership
    Auth-->>Action: ok (userId)
    Action->>Enroll: matrícula ativa no curso?
    Enroll-->>Action: ativa (não cancelled)
    Action->>Progress: status da aula (locked?)
    Progress-->>Action: available/in_progress/completed
    alt aula locked ou sem matrícula
        Action-->>UI: 403 Forbidden (nenhum token emitido)
    else autorizado
        Action->>Provider: assinar URL/token (curta expiração, videoProvider+videoId da Lesson)
        Provider-->>Action: signed URL / JWT de playback
        Action-->>UI: token de curta duração (nunca URL pública permanente)
        UI->>Player: inicializa player com o token
        loop enquanto assiste
            Player->>HB: heartbeat (posição, playing, tabVisible)
            HB->>HB: reconstrói watchedPercent/validSeconds no servidor
        end
        Note over Player,Provider: token expira em minutos;<br/>se expirar, UI pede um novo (repete o fluxo acima)
    end
```

## 4. Requisitos de arquitetura (não implementados nesta fase)

- Interface `VideoProvider` (nova, espelhando o padrão Repository/ADR-0002) com um método essencial: `signPlaybackUrl(lesson, userId) -> { url, expiresAt }`. Implementação concreta escolhida (Cloudflare Stream/Mux/Bunny) fica atrás dela — nunca importar o SDK do provider fora dessa camada de infra.
- `Lesson.videoProvider` (já existe no schema) passa a guardar qual provider hospeda aquele vídeo especificamente (permite migração gradual/mista entre providers se necessário).
- Upload/ingestão de vídeo pelo admin é um fluxo separado (fora do escopo deste doc — painel do provider ou API de upload direto do provider; **não** faz parte de `/api/uploads`, que é para os arquivos tratados em `STORAGE_PLAN.md`).
- CSP (`next.config.ts`) precisa ganhar `media-src`/`frame-src`/`connect-src` para o domínio do provider escolhido — repassar ao agente `security` junto da Fase 13 do roadmap.

## 5. Riscos e pendências

- Preços não confirmados nesta fase — **verificar no painel de cada provider** antes de comprometer orçamento (Cloudflare Stream, Mux, Bunny Stream cobram por minuto armazenado/entregue com faixas que mudam; Vimeo é assinatura fixa por plano).
- Decisão final entre Cloudflare Stream e Mux para produção paga depende de quanto peso o produto dá a analytics de reprodução (Mux) vs. previsibilidade de custo em escala/alinhamento de CDN (Cloudflare) — marcar como decisão a revisitar com dados reais de uso, não travar agora.
- Nenhum código foi alterado: `Lesson.videoUrl` continua sintético até a Fase 13 do roadmap (`Provider de vídeo`) ser executada.
