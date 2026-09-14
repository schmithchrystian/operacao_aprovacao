"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/contracts/auth";
import { loginAction } from "@/server/actions/auth";

/**
 * Formulário de login (React Hook Form + Zod). A validação client-side é só UX — o
 * servidor sempre revalida com o mesmo `loginSchema` em `loginAction` (CLAUDE.md §9),
 * que também é o único lugar que decide o `role` da sessão (nunca o cliente).
 */
export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await loginAction(values);

        if (!result.ok) {
          if (result.error.fieldErrors) {
            for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
              if (field === "email" || field === "password") {
                setError(field, { message: messages[0] });
              }
            }
          }
          setFormError(result.error.message);
          return;
        }

        toast.success("Login realizado com sucesso.");
        router.push(result.data.redirectTo);
        router.refresh();
      } catch {
        setFormError("Não foi possível conectar. Confira sua conexão e tente novamente.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={isPending}>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-destructive text-sm">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-destructive text-sm">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/cadastro" className="underline">
          Criar conta
        </Link>
        <Link href="/recuperar-senha" className="underline">
          Esqueci minha senha
        </Link>
      </div>
    </form>
  );
}
