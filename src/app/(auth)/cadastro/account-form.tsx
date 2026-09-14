"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  registerAccountAction,
  requestVerificationAction,
  requestPasswordResetAction,
  verifyEmailAction,
  resetPasswordAction,
} from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Mode = "register" | "verification" | "recovery" | "reset";
export function AccountForm({ mode }: { mode: Mode }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    setSuccess(false);
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      const result =
        mode === "register"
          ? await registerAccountAction({
              name: form.get("name"),
              email: form.get("email"),
              password: form.get("password"),
            })
          : mode === "recovery"
            ? await requestPasswordResetAction({ email: form.get("email") })
            : mode === "reset"
              ? await resetPasswordAction({ token, password: form.get("password") })
              : form.get("email")
                ? await requestVerificationAction({
                    email: form.get("email"),
                    password: form.get("password"),
                  })
                : await verifyEmailAction({ token });
      setMessage(result.ok ? result.data.message : result.error.message);
      setSuccess(result.ok);
      if (result.ok && (mode === "reset" || mode === "verification"))
        window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              disabled={pending}
            />
          </div>
        )}
        {(mode === "register" || mode === "recovery") && (
          <div className="space-y-2">
            <Label htmlFor="account-email">E-mail</Label>
            <Input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={pending}
            />
          </div>
        )}
        {(mode === "register" || mode === "reset") && (
          <div className="space-y-2">
            <Label htmlFor="account-password">{mode === "reset" ? "Nova senha" : "Senha"}</Label>
            <Input
              id="account-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
              disabled={pending}
              aria-describedby="password-help"
            />
            <p id="password-help" className="text-muted-foreground text-xs">
              Use uma frase com pelo menos 12 caracteres, exclusiva para esta conta.
            </p>
          </div>
        )}
        {mode === "verification" && (
          <p className="text-muted-foreground text-sm">
            Abra esta página pelo link recebido e confirme abaixo. Se precisar de outro link,
            informe seu e-mail no formulário seguinte.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? "Aguarde…"
            : mode === "register"
              ? "Criar conta"
              : mode === "recovery"
                ? "Solicitar recuperação"
                : mode === "reset"
                  ? "Salvar nova senha"
                  : "Confirmar meu e-mail"}
        </Button>
      </form>
      {mode === "verification" && (
        <form onSubmit={submit} className="space-y-3 border-t pt-4">
          <Label htmlFor="resend-email">Receber outro link de confirmação</Label>
          <Input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
          <Label htmlFor="resend-password">Senha que você deseja usar</Label>
          <Input
            id="resend-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            disabled={pending}
          />
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            Reenviar confirmação
          </Button>
        </form>
      )}
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={success ? "text-sm" : "text-destructive text-sm"}
        >
          {message}
        </p>
      )}
      <nav
        className="text-muted-foreground flex flex-wrap gap-3 text-sm"
        aria-label="Acesso à conta"
      >
        <Link href="/login" className="underline">
          Entrar
        </Link>
        {mode !== "register" && (
          <Link href="/cadastro" className="underline">
            Criar conta
          </Link>
        )}
        {mode !== "recovery" && (
          <Link href="/recuperar-senha" className="underline">
            Recuperar senha
          </Link>
        )}
        {mode !== "verification" && (
          <Link href="/verificar-email" className="underline">
            Confirmar e-mail
          </Link>
        )}
      </nav>
    </div>
  );
}
