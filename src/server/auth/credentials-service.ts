import bcrypt from "bcryptjs";
import { getRepositories } from "@/server/repositories";
import type { Session } from "@/types";

// Hash bcrypt sem vínculo com uma credencial válida, usado quando o e-mail não é encontrado.
const DUMMY_PASSWORD_HASH = "$2b$10$Qc9D9Vp/CzKcgm2jUxlJk.G58txKRJBF/VGDZJqEyYJTvG3zF83Xa";

/**
 * Verifica e-mail/senha pelo repositório de usuários e retorna a sessão correspondente, ou `null`
 * quando as credenciais são inválidas.
 *
 * Função pura de infraestrutura de auth — não depende de cookies/request — usada tanto
 * pelo `authorize()` do Credentials Provider (`@/server/auth/config`) quanto pelos testes
 * de unidade de autorização/login.
 *
 * Regra dura (CLAUDE.md §11): o `role` retornado vem sempre do repositório de usuários
 * (fonte de verdade no servidor). Esta função nunca recebe nem propaga um `role` vindo
 * do chamador.
 */
export async function verifyCredentials(email: string, password: string): Promise<Session | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getRepositories().users.findCredentialsByEmail(normalizedEmail);

  if (!user) {
    // Ainda assim executa um bcrypt.compare (contra um hash "dummy") para manter o
    // custo de CPU/tempo de resposta equivalente ao de um e-mail existente — evita
    // vazar por timing se o e-mail está cadastrado.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  // Fase 17 (admin — "ativar/desativar usuário"): conta desativada nunca autentica. Mesma
  // resposta de credenciais inválidas (nunca revela ao cliente se a conta existe mas está
  // desativada) — CLAUDE.md §24.
  if (!user.isActive) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
}
