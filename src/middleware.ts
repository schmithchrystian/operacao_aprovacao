import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authEdgeConfig } from "@/server/auth/config.edge";

/**
 * Middleware de auth — **só UX** (ADR-0006, CLAUDE.md §11/docs/ARCHITECTURE.md §7):
 * redireciona não-autenticado para `/login` e evita que um aluno chegue até a casca do
 * `/admin`. Isto NUNCA é a autorização real — quem bloqueia de verdade é o servidor em
 * `admin/layout.tsx` (`requireRole`) e `(student)/layout.tsx` (`requireUser`), que
 * continuam funcionando mesmo se este arquivo for removido ou contornado.
 *
 * Roda em Edge Runtime (padrão do Next.js para middleware). Por isso usa uma instância
 * própria do NextAuth com `authEdgeConfig` (sem o Credentials Provider, que depende de
 * `bcryptjs`/Node) — só o suficiente para decodificar o cookie JWT e saber se há sessão.
 * `@/server/auth` (config completa) continua sendo a única fonte de sessão usada pelos
 * Server Components/Actions via `@/server/authorization`.
 */
const { auth } = NextAuth(authEdgeConfig);

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  if (session && pathname.startsWith("/admin")) {
    const role = session.user?.role;
    if (role !== "admin" && role !== "moderador") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
