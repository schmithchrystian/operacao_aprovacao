import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Entrar",
};

/**
 * Placeholder de login — só a casca visual. A autenticação (Auth.js/Credentials,
 * RBAC) é responsabilidade do agente `backend` em uma etapa dedicada.
 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta para continuar seus estudos.</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={LogIn}
          title="Em construção"
          description="A autenticação (Auth.js + credenciais) será implementada em uma etapa dedicada."
        />
      </CardContent>
    </Card>
  );
}
