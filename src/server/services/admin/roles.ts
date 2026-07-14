import type { Role } from "@/types";

/**
 * Matriz de papéis do módulo administrativo (Fase 17 — agente `backend`), centralizada para
 * não divergir entre os vários serviços `server/services/admin/*` (CLAUDE.md §9: "evitar
 * lógica duplicada"). Ver relatório da fase para a matriz completa admin×moderador.
 *
 * Resumo:
 * - `CONTENT_MANAGE_ROLES` (admin + moderador): dashboard, listar usuários, ativar/desativar
 *   conta, criar/editar/reordenar/vincular vídeo em conteúdo (curso/módulo/aula/concurso/
 *   matéria/assunto/professor/questão/simulado/conquista), publicar avisos, moderar
 *   visibilidade de conteúdo.
 * - `CONTENT_DELETE_ROLES` (só admin): soft-delete (exclusão) de qualquer entidade de
 *   conteúdo — operação destrutiva, sempre com `confirm: true` explícito.
 * - `SENSITIVE_ADMIN_ONLY_ROLES` (só admin): alterar papel de usuário, ler/editar configuração
 *   de pontuação/níveis/ranking, visualizar log de auditoria.
 */
export const CONTENT_MANAGE_ROLES: readonly Role[] = ["admin", "moderador"];
export const CONTENT_DELETE_ROLES: readonly Role[] = ["admin"];
export const SENSITIVE_ADMIN_ONLY_ROLES: readonly Role[] = ["admin"];
