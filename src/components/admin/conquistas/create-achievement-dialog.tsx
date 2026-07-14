"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createAchievementInputSchema, type AdminAchievementDTO } from "@/contracts/admin-content";
import { createAchievementForAdminAction } from "@/server/actions/admin/achievements";
import { ICON_ALLOWLIST } from "@/components/shared/lucide-icon";

interface CreateAchievementDialogProps {
  onCreated: (achievement: AdminAchievementDTO) => void;
}

type CreateAchievementFormInput = z.input<typeof createAchievementInputSchema>;

const ICON_NAMES = Object.keys(ICON_ALLOWLIST);

/**
 * Diálogo "Criar conquista" (Fase 17 — caminho vertical priorizado). O `icon` é limitado à
 * mesma allowlist usada para renderizar conquistas no app do aluno
 * (`@/components/shared/lucide-icon.tsx#ICON_ALLOWLIST`) — evita cadastrar um nome de ícone que
 * depois cai no fallback genérico por não estar na allowlist.
 */
export function CreateAchievementDialog({ onCreated }: CreateAchievementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateAchievementFormInput>({
    resolver: zodResolver(createAchievementInputSchema),
    defaultValues: { key: "", name: "", description: "", icon: ICON_NAMES[0], points: 0 },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createAchievementForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateAchievementFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Conquista criada.");
      reset();
      setOpen(false);
      onCreated(result.data);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFormError(null);
      }}
    >
      <DialogTrigger render={<Button type="button" />}>
        <Plus aria-hidden="true" />
        Nova conquista
      </DialogTrigger>
      <DialogContent aria-describedby="create-achievement-description">
        <DialogHeader>
          <DialogTitle>Nova conquista</DialogTitle>
          <DialogDescription id="create-achievement-description">
            A chave (`key`) identifica a conquista no código — use apenas letras minúsculas, números e hífen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="achievement-name">Nome</Label>
              <Input id="achievement-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achievement-key">Chave</Label>
              <Input id="achievement-key" placeholder="ex.: primeira-vitoria" aria-invalid={Boolean(errors.key)} {...register("key")} />
              {errors.key?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.key.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="achievement-description">Descrição (opcional)</Label>
            <textarea
              id="achievement-description"
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="achievement-icon">Ícone</Label>
              <NativeSelect id="achievement-icon" {...register("icon")}>
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achievement-points">Pontos</Label>
              <Input id="achievement-points" type="number" min={0} aria-invalid={Boolean(errors.points)} {...register("points")} />
              {errors.points?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.points.message}
                </p>
              ) : null}
            </div>
          </div>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Criar conquista"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
