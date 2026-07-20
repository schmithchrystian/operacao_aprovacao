# Plano de Armazenamento — Supabase Storage (Operação Aprovação)

> Produzido pelo subagente `backend` (cluster infra de mídia). Complementa
> [`CURRENT_STATE.md`](./CURRENT_STATE.md) (bloqueador #9 — sem storage/`api/uploads` inexistente),
> [`TARGET_ARCHITECTURE.md`](./TARGET_ARCHITECTURE.md) (§1/§5 — Supabase Storage escolhido) e
> [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) (bucket isolado por ambiente). Só análise/planejamento —
> nenhum bucket, política ou credencial foi criado nesta fase.

## 0. Contexto verificado no código

- `Profile.avatarUrl` (`prisma/schema.prisma:261`) é `String?` — hoje preenchido só via mock.
- `LessonMaterial` (`prisma/schema.prisma:431-445`) já modela `type: LessonMaterialType` (`PDF | LINK | SLIDE | VIDEO | AUDIO | IMAGE | OTHER`) e `url: String` — pronto para apontar para Supabase Storage, mas **sem repositório implementado ainda** (`lesson-view.ts:87-89` retorna `materials: []` com TODO explícito para o agente `database`).
- `src/app/api/` hoje só tem `auth`, `cron`, `focus`, `progress` — **`/api/uploads` não existe**, confirmando o bloqueador #9 do `CURRENT_STATE.md`.
- Não há nenhum campo de "capa de curso" (`Course.coverImageUrl` ou similar) verificado no schema nesta leitura — a existir, segue a mesma regra de bucket público do avatar (ver §2). **Pendência**: confirmar com o agente `database` se esse campo existe/será adicionado ao model `Course`.
- Não há model de `Certificate` no schema nesta leitura — certificados entram como um tipo de arquivo privado gerado sob demanda (ver §2), a modelar futuramente pelo agente `database` (provavelmente uma tabela própria ou um `LessonMaterial`/anexo de propósito especial associado ao `Enrollment`/conclusão de curso).
- CSP atual (`next.config.ts`) já permite `img-src 'self' data: https:` com o comentário explícito "avatares/ícones podem vir de URLs remotas" — compatível com Supabase Storage servindo imagens públicas via HTTPS.

## 1. Por que Supabase Storage

Já é a escolha registrada em `TARGET_ARCHITECTURE.md` §1/§5 (mesmo projeto Supabase do Postgres gerenciado, sem introduzir um segundo fornecedor de infra). Pontos que sustentam a escolha para este produto:

- **Buckets públicos e privados nativos** — cobre exatamente a divisão avatar/capa (público) vs. materiais/certificados (privado) exigida no escopo.
- **URLs assinadas nativas** (`createSignedUrl`, com `expiresIn` em segundos) — sem precisar de infraestrutura própria de assinatura.
- **Políticas via RLS (Row Level Security) no nível do bucket/objeto** — mesmo modelo mental de segurança já usado no restante do produto (autorização centralizada no servidor).
- **Isolamento por ambiente já é princípio do projeto** (`ENVIRONMENTS.md` §1) — um bucket por ambiente, no mesmo projeto Supabase de banco.
- Custo dentro do mesmo painel/fatura do banco — **verificar no painel Supabase** limites de armazenamento/egress do plano contratado antes de assumir volumes grandes (ex.: muitos PDFs grandes por curso).

## 2. Buckets propostos

| Bucket | Visibilidade | Conteúdo | Observações |
|---|---|---|---|
| `avatars` | **Público** (leitura) | `Profile.avatarUrl` | Escrita só pelo próprio dono (via `/api/uploads`, nunca upload direto do cliente para o bucket); nome de arquivo não deve vazar PII (usar `userId`/`cuid`, não o nome original). Respeitar `Profile.isProfilePublic` **na exibição em outros perfis** — o arquivo em si pode ser público (é só uma imagem), mas a UI não deve linkar avatar de perfil não-público fora do próprio usuário. |
| `course-covers` | **Público** (leitura) | Capas de curso | Só admin/professor grava (checagem de role antes de emitir a URL de upload); imagem, sem dado pessoal. |
| `lesson-materials` | **Privado** | `LessonMaterial.url` (PDF/slide/áudio/imagem/outro anexo de aula) | Leitura exige matrícula ativa no curso (mesma regra de `assertActiveEnrollment` usada para o vídeo) — URL assinada de curta/média duração emitida sob demanda, nunca um link público fixo salvo direto em `LessonMaterial.url` sem passar por assinatura no momento do acesso. |
| `certificates` | **Privado** | Certificados de conclusão (PDF gerado) | Leitura só pelo próprio usuário dono do certificado (`assertOwnership`) + verificação de que o curso está de fato `completed`; URL assinada de curta duração, gerada sob demanda — nunca cacheada/reaproveitada indefinidamente. |

Regra geral independente do bucket: **nenhum bucket fica com "listagem" pública habilitada** — mesmo os buckets públicos só servem leitura de objeto por caminho conhecido, não navegação de diretório.

## 3. `/api/uploads` — como deve validar (hoje inexistente)

Rota nova, seguindo o mesmo padrão fino já usado em `/api/progress/heartbeat` (`requireUser` → validação Zod → delegar a um service em `src/server/services/**` → resposta padronizada `ok`/`fail`). Ordem de validação obrigatória, **toda no servidor**, antes de qualquer gravação no Storage:

1. **Auth**: `requireUser()` — sem sessão, sem upload. Nunca aceitar `userId` do corpo/form-data.
2. **Autorização por tipo de upload**:
   - `avatar`: qualquer usuário autenticado, só para si mesmo (`assertOwnership`).
   - `course-cover`: só `professor`/`admin` (via `requireRole`, mesma matriz de papéis do admin).
   - `lesson-material`: só `professor`/`admin` na **escrita**; leitura por aluno matriculado é um fluxo separado (URL assinada de leitura, não passa por `/api/uploads`).
   - `certificate`: **nunca é upload do cliente** — gerado pelo próprio backend (service), não uma categoria aceita nesta rota.
3. **Tipo de arquivo permitido (allowlist por categoria)**:
   - avatar/capa: `image/png`, `image/jpeg`, `image/webp` (sem SVG — SVG pode carregar script embutido, risco de XSS armazenado).
   - materiais: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`; `audio/mpeg`/`audio/mp4` se o produto realmente precisar de áudio como material (`LessonMaterialType.AUDIO` já existe no schema).
   - Nunca aceitar `application/octet-stream` genérico nem extensões executáveis (`.exe`, `.sh`, `.js`, `.html`, `.svg`) em nenhuma categoria.
4. **Tamanho máximo por categoria** (limite aplicado no servidor, não confiar em `Content-Length` do cliente sem verificar o corpo real): avatar/capa tipicamente pequenos (poucos MB); materiais (PDF/slide) podem ser maiores — definir um teto explícito por categoria (ex.: avatar ≤ 5 MB, capa ≤ 10 MB, material ≤ 50 MB) e **verificar contra o limite de payload de Route Handler da Vercel** antes de travar o valor final.
5. **Verificação de MIME real (nunca confiar na extensão nem no `Content-Type` declarado pelo cliente)**: ler os "magic bytes" do início do arquivo (assinatura binária) no servidor e comparar contra a allowlist da categoria — um `.pdf` renomeado para `.png` (ou vice-versa) deve ser rejeitado mesmo que a extensão/`Content-Type` do form pareçam corretos. Esse é o ponto mais importante desta validação: extensão e `Content-Type` de request são inteiramente controlados pelo cliente.
6. **Antivírus/malware scan**: recomendado especificamente para uploads de conteúdo que outros usuários vão baixar/abrir depois — no caso deste produto, isso se aplica sobretudo a **materiais de aula enviados por professor/admin** (PDFs que alunos vão abrir) e, com menor prioridade, avatares (imagens, superfície de ataque menor, mas ainda vale sanitizar/recomprimir no servidor em vez de servir o binário do usuário como está). Avaliar um scanner gerenciado (ex.: ClamAV via função serverless dedicada, ou serviço de terceiros) antes de o arquivo sair da área de quarentena para o bucket definitivo — **decisão de custo/operação a confirmar**, não travar nesta fase se o volume de upload de terceiros for baixo no MVP, mas não pular esta etapa quando o produto abrir upload de PDF por professores externos.
7. **Ownership na leitura**: ao servir uma URL assinada (materiais/certificados), repetir a checagem de matrícula/dono ANTES de assinar — nunca assinar uma URL "para conferir depois se o usuário tinha acesso"; a assinatura em si já concede acesso pelo tempo de expiração.

## 4. Regras de retenção e exclusão

- **Exclusão lógica** (`deletedAt`) já é o padrão do schema para `Profile`, `Lesson`, `LessonMaterial` (`prisma/schema.prisma`) — replicar a mesma regra para o objeto no Storage: marcar `deletedAt` no registro do banco primeiro, e só remover o objeto físico do bucket depois de um período de retenção (evita perda irreversível por exclusão acidental/maliciosa antes de confirmar).
- Avatar/capa substituídos (novo upload) devem invalidar o objeto antigo (remover ou marcar para expurgo) — evitar acumular arquivos órfãos indefinidamente.
- Certificados: reter pelo tempo que a política de produto/LGPD exigir (mesma pendência de retenção já registrada em `ENVIRONMENTS.md` — "definida por política — verificar").
- Materiais de aula removidos de um curso: manter o objeto por um período de graça (caso a remoção tenha sido engano do professor/admin) antes do expurgo definitivo — expurgo automático fora do escopo desta fase (job periódico, não implementado ainda).

## 5. Variáveis de ambiente necessárias (a somar ao `env.ts`, não implementado nesta fase)

| Variável | Propósito |
|---|---|
| `SUPABASE_URL` | Endpoint do projeto Supabase (mesmo projeto do Postgres, por ambiente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave server-side para operações de Storage que exigem bypass de RLS (upload/assinatura de URL) — **nunca exposta ao cliente**, só usada em `src/server/**` |
| `SUPABASE_STORAGE_BUCKET_AVATARS` / `_COVERS` / `_MATERIALS` / `_CERTIFICATES` | Nomes de bucket por ambiente (permite bucket `avatars-dev`, `avatars-staging`, `avatars-prod` sem hardcode) |

Preços/limites de armazenamento e egress por plano: **verificar no painel Supabase** (Storage → Usage/Billing) antes de fixar os limites de tamanho máximo do §3 em definitivo.

## 6. Riscos e pendências

- `Course.coverImageUrl` (ou equivalente) não confirmado no schema atual — validar com o agente `database` antes de implementar o bucket `course-covers`.
- Model de `Certificate` não existe no schema — desenho de dados (onde fica a referência ao PDF gerado) é pendência do agente `database`.
- Antivírus para upload de terceiros (materiais de professor) ainda sem decisão de fornecedor/custo — marcado como "avaliar antes do go-live com upload aberto a professores externos", não bloqueante para o MVP com conteúdo só do time interno.
- Nenhum código foi criado: `/api/uploads`, buckets e políticas RLS ficam para a Fase 12 do roadmap (`docs/production/ROADMAP_SKELETON.md`).
