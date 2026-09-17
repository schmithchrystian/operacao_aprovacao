import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "../cadastro/account-form";
export const metadata: Metadata = {
  title: "Confirmar e-mail",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmar e-mail</CardTitle>
        <CardDescription>Confirme que este endereço pertence a você.</CardDescription>
      </CardHeader>
      <CardContent>
        <AccountForm mode="verification" />
      </CardContent>
    </Card>
  );
}
