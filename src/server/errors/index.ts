/**
 * Erros de domínio (docs/ARCHITECTURE.md, camada "Infra transversal").
 * Toda falha de negócio conhecida deve ser lançada como um desses tipos —
 * nunca como `Error` genérico — para permitir tratamento seguro na fronteira
 * (Server Actions / Route Handlers) sem vazar stack trace ao cliente.
 */

/** Base de todo erro de domínio. Cada subtipo define um `code` estável e seguro. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Ausência de sessão/autenticação (401). */
export class AuthError extends DomainError {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Autenticação necessária.") {
    super(message);
  }
}

/** Sessão autenticada, mas sem permissão para a operação (403). */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";

  constructor(message = "Você não tem permissão para executar esta operação.") {
    super(message);
  }
}

/** Recurso inexistente ou não visível para o usuário atual (404). */
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor(message = "Recurso não encontrado.") {
    super(message);
  }
}

/** Entrada inválida segundo os contratos Zod (422). */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message = "Dados inválidos.", fieldErrors?: Record<string, string[]>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

/** Estado atual do recurso impede a operação — duplicidade, corrida, transição inválida (409). */
export class ConflictError extends DomainError {
  readonly code = "CONFLICT";

  constructor(message = "Conflito ao processar a operação.") {
    super(message);
  }
}

/** Requisição excede o limite permitido — rate limit leve (429, CLAUDE.md §24). */
export class RateLimitError extends DomainError {
  readonly code = "RATE_LIMITED";

  constructor(message = "Muitas requisições. Tente novamente em instantes.") {
    super(message);
  }
}

/** Type guard utilitário para uso nas fronteiras (actions/route handlers). */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Mapeia um `DomainError` para o status HTTP correspondente — uso em Route Handlers
 * (docs/ARCHITECTURE.md §6), que, diferente de Server Actions, precisam de um status real.
 */
export function httpStatusForDomainError(error: DomainError): number {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 500;
  }
}
