/**
 * Mock de credenciais (Fase 4 — autenticação, ADR-0005). Hashes bcrypt usados pelo
 * Credentials Provider do Auth.js, mapeados por e-mail (normalizado em minúsculas).
 * Como os demais mocks (ADR-0011), fica centralizado aqui — nunca embutido em páginas
 * ou direto no provider — e nunca deve ser usado como fonte de senhas em produção.
 *
 * Senha de desenvolvimento conhecida para TODOS os usuários mock: "senha123".
 * O hash abaixo foi pré-computado com bcryptjs (10 rounds) para não recalcular a cada
 * import; gerado com:
 *   node -e "console.log(require('bcryptjs').hashSync('senha123', 10))"
 */
export const DEV_MOCK_PASSWORD = "senha123";

/** Hash bcrypt de `DEV_MOCK_PASSWORD`. Também reutilizado como alvo "dummy" de comparação
 * para e-mails inexistentes, de forma a manter o custo de CPU constante e não vazar, por
 * tempo de resposta, se um e-mail existe ou não (ver `credentials-service.ts`). */
export const DEV_PASSWORD_HASH = "$2b$10$qckubM7a6kZeV.W0A5biVucUBtpC9zeKmmqY288lgNsan4veuVBCG";

/** E-mail (normalizado, minúsculo) -> hash bcrypt da senha. */
export const mockCredentials: Record<string, string> = {
  "ana.recruta@example.com": DEV_PASSWORD_HASH,
  "bruno.professor@example.com": DEV_PASSWORD_HASH,
  "carla.moderadora@example.com": DEV_PASSWORD_HASH,
  "diego.admin@example.com": DEV_PASSWORD_HASH,
};
