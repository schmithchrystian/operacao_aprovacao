import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "../cadastro/account-form";
export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cadastre-se e confirme seu e-mail para começar a estudar.</CardDescription>
      </CardHeader>
      <CardContent>
        <AccountForm mode="register" />
      </CardContent>
    </Card>
  );
}
