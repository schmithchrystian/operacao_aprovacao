import bcrypt from "bcryptjs";
import { mockCredentials, DEV_PASSWORD_HASH } from "@/mocks";
import { getRepositories } from "@/server/repositories";
import type { Session } from "@/types";

/**
 * Verifica e-mail/senha contra os mocks e retorna a sessão correspondente, ou `null`
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
  const passwordHash = mockCredentials[normalizedEmail];

  if (!passwordHash) {
    // Ainda assim executa um bcrypt.compare (contra um hash "dummy") para manter o
    // custo de CPU/tempo de resposta equivalente ao de um e-mail existente — evita
    // vazar por timing se o e-mail está cadastrado.
    await bcrypt.compare(password, DEV_PASSWORD_HASH);
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const user = await getRepositories().users.findByEmail(normalizedEmail);
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
}
