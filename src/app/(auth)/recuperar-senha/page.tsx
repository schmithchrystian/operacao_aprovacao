import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "../cadastro/account-form";
export const metadata: Metadata = {
  title: "Recuperar senha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>Solicite um link para definir uma nova senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <AccountForm mode="recovery" />
      </CardContent>
    </Card>
  );
}
