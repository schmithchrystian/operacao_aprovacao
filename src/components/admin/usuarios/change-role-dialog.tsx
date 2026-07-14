"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { RoleInput } from "@/contracts/admin-users";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";
import { changeUserRoleAction } from "@/server/actions/admin/users";

interface ChangeRoleDialogProps {
  user: UserEntity;
  onSaved: (user: UserEntity) => void;
}

const ROLE_LABEL: Record<RoleInput, string> = {
  aluno: "Aluno",
  professor: "Professor",
  moderador: "Moderador",
  admin: "Admin",
};

/**
 * Diálogo "Alterar papel" — operação SENSÍVEL, só exibida para `admin`
 * (`SENSITIVE_ADMIN_ONLY_ROLES`, `@/server/services/admin/roles.ts`). Dica visual apenas: o
 * componente pai (`users-manager.tsx`) só renderiza isto quando `isAdmin`, mas o servidor
 * (`changeUserRoleAction`) rejeita de novo com `FORBIDDEN` se um moderador chegar a chamá-la.
 * Não usa `ConfirmDialog` genérico porque precisa de um campo de seleção antes de confirmar.
 */
export function ChangeRoleDialog({ user, onSaved }: ChangeRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleInput>(user.role);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await changeUserRoleAction({ userId: user.id, role });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      toast.success(`Papel alterado para ${ROLE_LABEL[result.data.role]}.`);
      setOpen(false);
      onSaved(result.data);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <UserCog aria-hidden="true" />
        Alterar papel
      </DialogTrigger>
      <DialogContent aria-describedby={`change-role-description-${user.id}`}>
        <DialogHeader>
          <DialogTitle>Alterar papel</DialogTitle>
          <DialogDescription id={`change-role-description-${user.id}`}>
            {user.name} ({user.email}) — papel atual: {ROLE_LABEL[user.role]}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`change-role-select-${user.id}`}>Novo papel</Label>
          <NativeSelect
            id={`change-role-select-${user.id}`}
            value={role}
            onChange={(e) => setRole(e.target.value as RoleInput)}
          >
            <option value="aluno">Aluno</option>
            <option value="professor">Professor</option>
            <option value="moderador">Moderador</option>
            <option value="admin">Admin</option>
          </NativeSelect>
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isPending || role === user.role}>
            {isPending ? "Salvando..." : "Confirmar alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
