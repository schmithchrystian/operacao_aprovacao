"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserX, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { UserEntity } from "@/server/repositories/contracts/user-repository";
import { setUserActiveAction } from "@/server/actions/admin/users";
import { formatDatePtBr } from "@/lib/utils";
import { ChangeRoleDialog } from "./change-role-dialog";

interface UsersManagerProps {
  initialUsers: UserEntity[];
  /** Alterar papel é `SENSITIVE_ADMIN_ONLY_ROLES` (só admin) — ativar/desativar é
   *  `CONTENT_MANAGE_ROLES` (admin + moderador), então não depende deste flag. */
  isAdmin: boolean;
}

const ROLE_LABEL: Record<UserEntity["role"], string> = {
  aluno: "Aluno",
  professor: "Professor",
  moderador: "Moderador",
  admin: "Admin",
};

/** Gestão de usuários (Fase 17 — item 4 da tarefa). "Turmas" não existem no schema atual
 *  (pendência explícita do backend, `@/contracts/admin-users.ts`) — fora do escopo desta tela. */
export function UsersManager({ initialUsers, isAdmin }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);

  const handleToggleActive = async (user: UserEntity): Promise<boolean> => {
    const result = await setUserActiveAction({ userId: user.id, isActive: !user.isActive });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setUsers((prev) => prev.map((u) => (u.id === result.data.id ? result.data : u)));
    toast.success(result.data.isActive ? "Conta ativada." : "Conta desativada.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground text-sm">
          Alterar papel e ativar/desativar contas. Gestão de turmas ainda não existe no backend.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário cadastrado" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={user.isActive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}
                  >
                    {user.isActive ? "Ativa" : "Desativada"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDatePtBr(user.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {isAdmin ? (
                      <ChangeRoleDialog
                        user={user}
                        onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
                      />
                    ) : null}
                    <ConfirmDialog
                      render={<Button type="button" variant={user.isActive ? "destructive" : "outline"} size="sm" />}
                      title={user.isActive ? "Desativar conta" : "Ativar conta"}
                      description={
                        user.isActive
                          ? `"${user.name}" não conseguirá mais entrar na plataforma. Confirma?`
                          : `"${user.name}" voltará a conseguir entrar na plataforma. Confirma?`
                      }
                      confirmLabel={user.isActive ? "Desativar" : "Ativar"}
                      destructive={user.isActive}
                      onConfirm={() => handleToggleActive(user)}
                    >
                      {user.isActive ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
                      {user.isActive ? "Desativar" : "Ativar"}
                    </ConfirmDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
