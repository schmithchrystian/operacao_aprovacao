/**
 * Tipos compartilhados entre contratos de repositório de CONTEÚDO ADMINISTRÁVEL (Fase 17 —
 * agente `backend`, administração). Espelha `ContentStatus` do Prisma
 * (`prisma/schema.prisma`) — usado por Course/Module/Lesson/MockExam. `Question` já possui um
 * alias idêntico próprio (`QuestionStatus`, `./question-repository.ts`) — mantido separado de
 * propósito para não alterar um tipo já importado por outros módulos (`mock-exam-repository.ts`).
 */
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * Entrada mínima de uma operação DESTRUTIVA administrativa (soft-delete) — exige confirmação
 * explícita do chamador (CLAUDE.md §24/Fase 17: "nunca confiar em UI escondida"). O contrato Zod
 * de cada domínio (`@/contracts/admin-content.ts`) usa `z.literal(true)` para `confirm`, então um
 * payload sem o campo (ou com `confirm: false`) já falha na validação, antes mesmo do serviço.
 */
export interface ConfirmDeleteInput {
  id: string;
  confirm: true;
}
