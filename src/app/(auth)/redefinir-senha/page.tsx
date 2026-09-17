import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "../cadastro/account-form";
export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>
          Escolha uma senha exclusiva. Suas sessões anteriores serão encerradas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AccountForm mode="reset" />
      </CardContent>
    </Card>
  );
}
