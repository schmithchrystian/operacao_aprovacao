import { redirect } from "next/navigation";

/**
 * Raiz da aplicação: redireciona para o painel do aluno.
 * A verificação de sessão real (redirecionar para /login quando não autenticado)
 * chega com o middleware de auth em uma fase futura (docs/ARCHITECTURE.md §7).
 */
export default function RootPage() {
  redirect("/dashboard");
}
