"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { broadcastNotificationInputSchema } from "@/contracts/admin-notifications";
import { broadcastNotificationAction } from "@/server/actions/admin/notifications";

type BroadcastFormValues = z.infer<typeof broadcastNotificationInputSchema>;

const ROLE_OPTIONS: { value: "aluno" | "professor" | "moderador" | "admin"; label: string }[] = [
  { value: "aluno", label: "Alunos" },
  { value: "professor", label: "Professores" },
  { value: "moderador", label: "Moderadores" },
  { value: "admin", label: "Admins" },
];

/**
 * Formulário "Publicar aviso" (Fase 17 — item 7 da tarefa, versão mínima). Sem seleção livre de
 * destinatários — só "todos os ativos" (padrão) ou por papel, refletindo a restrição do contrato
 * (`broadcastNotificationInputSchema`, `@/contracts/admin-notifications`: nunca uma lista
 * arbitrária de `userId` vinda do cliente).
 */
export function BroadcastForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastNotificationInputSchema),
    defaultValues: { type: "SYSTEM", title: "", message: "" },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await broadcastNotificationAction({
        ...values,
        roles: selectedRoles.size > 0 ? (Array.from(selectedRoles) as BroadcastFormValues["roles"]) : undefined,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof BroadcastFormValues, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success(`Aviso publicado para ${result.data.recipientCount} usuário(s).`);
      reset({ type: "SYSTEM", title: "", message: "" });
      setSelectedRoles(new Set());
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicar aviso</CardTitle>
        <CardDescription>
          Enviado a todos os usuários ativos por padrão, ou só aos papéis marcados abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-title">Título</Label>
              <Input id="broadcast-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
              {errors.title?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-type">Tipo</Label>
              <NativeSelect id="broadcast-type" {...register("type")}>
                <option value="SYSTEM">Sistema</option>
                <option value="COURSE_ANNOUNCEMENT">Anúncio de curso</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-message">Mensagem</Label>
            <textarea
              id="broadcast-message"
              rows={3}
              className="border-input bg-transparent dark:bg-input/30 aria-invalid:border-destructive w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              aria-invalid={Boolean(errors.message)}
              {...register("message")}
            />
            {errors.message?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.message.message}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Restringir a papéis (opcional)</legend>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedRoles.has(option.value)}
                    onChange={() => toggleRole(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">Nenhum marcado = todos os usuários ativos.</p>
          </fieldset>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <Send aria-hidden="true" />
              {isPending ? "Publicando..." : "Publicar aviso"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
