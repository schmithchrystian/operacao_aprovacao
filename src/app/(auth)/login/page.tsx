import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

/**
 * Página de login (Fase 4). A autenticação real (Auth.js/Credentials, JWT, RBAC) vive
 * em `@/server/auth` + `@/server/actions/auth`; esta página só monta a casca visual em
 * torno do formulário client (`LoginForm`).
 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta para continuar seus estudos.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
