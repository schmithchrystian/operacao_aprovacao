"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { updateAchievementInputSchema, type AdminAchievementDTO } from "@/contracts/admin-content";
import { updateAchievementForAdminAction } from "@/server/actions/admin/achievements";
import { ICON_ALLOWLIST } from "@/components/shared/lucide-icon";

interface EditAchievementDialogProps {
  achievement: AdminAchievementDTO;
  onSaved: (achievement: AdminAchievementDTO) => void;
}

type UpdateAchievementFormInput = z.input<typeof updateAchievementInputSchema>;

const ICON_NAMES = Object.keys(ICON_ALLOWLIST);

/** Diálogo "Editar conquista" — `key` é imutável (não faz parte de `updateAchievementInputSchema`). */
export function EditAchievementDialog({ achievement, onSaved }: EditAchievementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateAchievementFormInput>({
    resolver: zodResolver(updateAchievementInputSchema),
    defaultValues: {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description ?? "",
      icon: achievement.icon ?? ICON_NAMES[0],
      points: achievement.points,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateAchievementForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateAchievementFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Conquista atualizada.");
      setOpen(false);
      onSaved(result.data);
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
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent aria-describedby={`edit-achievement-description-${achievement.id}`}>
        <DialogHeader>
          <DialogTitle>Editar conquista</DialogTitle>
          <DialogDescription id={`edit-achievement-description-${achievement.id}`}>{achievement.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-achievement-name-${achievement.id}`}>Nome</Label>
            <Input id={`edit-achievement-name-${achievement.id}`} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-achievement-description-field-${achievement.id}`}>Descrição (opcional)</Label>
            <textarea
              id={`edit-achievement-description-field-${achievement.id}`}
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-achievement-icon-${achievement.id}`}>Ícone</Label>
              <NativeSelect id={`edit-achievement-icon-${achievement.id}`} {...register("icon")}>
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-achievement-points-${achievement.id}`}>Pontos</Label>
              <Input id={`edit-achievement-points-${achievement.id}`} type="number" min={0} {...register("points")} />
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
