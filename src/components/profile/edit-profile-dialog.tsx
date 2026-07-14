"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { z } from "zod";
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
import type { UpdateProfileInput } from "@/contracts/profile";
import { updateProfileAction } from "@/server/actions/profile";
import { BR_STATE_OPTIONS } from "./br-states";
import { isOwnProfileComplete, type OwnProfileDTO } from "./types";

export interface ContestOption {
  value: string;
  label: string;
}

interface EditProfileDialogProps {
  profile: OwnProfileDTO;
  contestOptions: ContestOption[];
  onUpdated: (profile: OwnProfileDTO) => void;
}

/**
 * Schema client-side (UX imediata — CLAUDE.md §9). Todos os campos ficam como `string` porque
 * vêm de `<input>`/`<select>` nativos; a distinção "omitido preserva / `null` limpa" de
 * `updateProfileInputSchema` (`@/contracts/profile`) é decidida no `onSubmit` (string vazia após
 * `trim()` vira `null` explícito — o formulário sempre mostra TODOS os campos preenchidos com o
 * valor atual, então "deixei em branco e salvei" só pode significar "quero limpar", nunca
 * "não mexi nisso"). Limites de tamanho aqui são só a validação imediata; o servidor sempre
 * revalida e devolve `fieldErrors`, mapeados de volta abaixo do campo correspondente.
 */
const editProfileFormSchema = z.object({
  bio: z.string().max(500, "Máximo de 500 caracteres."),
  avatarUrl: z.string().max(2048, "Máximo de 2048 caracteres."),
  phone: z.string().max(30, "Máximo de 30 caracteres."),
  birthDate: z.string(),
  city: z.string().max(120, "Máximo de 120 caracteres."),
  state: z.string(),
  targetContestId: z.string(),
});
type EditProfileFormValues = z.infer<typeof editProfileFormSchema>;

function toFormValues(profile: OwnProfileDTO): EditProfileFormValues {
  return {
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    phone: profile.phone ?? "",
    // `<input type="date">` só aceita "yyyy-mm-dd" — `birthDate` é sempre meia-noite UTC
    // (mesma convenção de `examDate`), então os 10 primeiros caracteres já são a data certa.
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    targetContestId: profile.mainContest?.contestId ?? "",
  };
}

function isEditableField(field: string): field is keyof EditProfileFormValues {
  return (
    field === "bio" ||
    field === "avatarUrl" ||
    field === "phone" ||
    field === "birthDate" ||
    field === "city" ||
    field === "state" ||
    field === "targetContestId"
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/**
 * Dialog "Editar perfil" (Fase 16 — UI do agente `frontend`). Só expõe os campos que
 * `updateProfileInputSchema` realmente aceita — `name` (vem de `User`, não de `Profile`),
 * `interestedContests` (derivado de matrícula) e `examDate` (derivado do plano de estudos ativo)
 * NÃO têm campo de edição aqui, de propósito: não existe suporte para editá-los neste contrato
 * (ver `@/contracts/profile`), então oferecer um campo que não seria salvo seria enganoso.
 */
export function EditProfileDialog({ profile, contestOptions, onUpdated }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    const input: UpdateProfileInput = {
      bio: values.bio.trim() === "" ? null : values.bio.trim(),
      avatarUrl: values.avatarUrl.trim() === "" ? null : values.avatarUrl.trim(),
      phone: values.phone.trim() === "" ? null : values.phone.trim(),
      birthDate: values.birthDate === "" ? null : `${values.birthDate}T00:00:00.000Z`,
      city: values.city.trim() === "" ? null : values.city.trim(),
      state: values.state === "" ? null : values.state,
      targetContestId: values.targetContestId === "" ? null : values.targetContestId,
    };

    startTransition(async () => {
      const result = await updateProfileAction(input);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message && isEditableField(field)) {
              setError(field, { message });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      if (!isOwnProfileComplete(result.data)) {
        // Nunca deveria acontecer (`updateProfileAction` sempre devolve `getOwnProfile` no final)
        // — defesa em profundidade para não propagar um estado inconsistente silenciosamente.
        setFormError("Perfil atualizado, mas a resposta veio incompleta. Recarregue a página.");
        return;
      }

      toast.success("Perfil atualizado.");
      setOpen(false);
      onUpdated(result.data);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(toFormValues(profile));
        } else {
          setFormError(null);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Pencil aria-hidden="true" />
        Editar perfil
      </DialogTrigger>
      <DialogContent aria-describedby="edit-profile-dialog-description" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription id="edit-profile-dialog-description">
            Deixe um campo em branco para limpá-lo. Nome, concursos de interesse e data da prova não são editados
            aqui.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-bio">Bio</Label>
            <textarea
              id="edit-profile-bio"
              rows={3}
              maxLength={500}
              placeholder="Conte em poucas linhas o que você está estudando."
              aria-invalid={Boolean(errors.bio)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-20 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3"
              {...register("bio")}
            />
            <FieldError message={errors.bio?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-avatar">URL do avatar</Label>
            <Input
              id="edit-profile-avatar"
              type="text"
              inputMode="url"
              placeholder="https://exemplo.com/minha-foto.png"
              aria-invalid={Boolean(errors.avatarUrl)}
              {...register("avatarUrl")}
            />
            <FieldError message={errors.avatarUrl?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-phone">Telefone</Label>
              <Input id="edit-profile-phone" type="tel" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-birth-date">Data de nascimento</Label>
              <Input
                id="edit-profile-birth-date"
                type="date"
                aria-invalid={Boolean(errors.birthDate)}
                {...register("birthDate")}
              />
              <FieldError message={errors.birthDate?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-city">Cidade</Label>
              <Input id="edit-profile-city" aria-invalid={Boolean(errors.city)} {...register("city")} />
              <FieldError message={errors.city?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-state">Estado</Label>
              <NativeSelect id="edit-profile-state" aria-invalid={Boolean(errors.state)} {...register("state")}>
                <option value="">Não informado</option>
                {BR_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={errors.state?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-contest">Concurso principal</Label>
            <NativeSelect
              id="edit-profile-contest"
              aria-invalid={Boolean(errors.targetContestId)}
              {...register("targetContestId")}
            >
              <option value="">Não informado</option>
              {contestOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.targetContestId?.message} />
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
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
