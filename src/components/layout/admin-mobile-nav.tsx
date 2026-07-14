"use client";

import { useState } from "react";
import { Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@/types";
import { AdminSidebarNav } from "./admin-sidebar-nav";

interface AdminMobileNavProps {
  role: Role;
}

/** Menu de navegação admin recolhível para telas pequenas — mesmo padrão de
 *  `@/components/layout/mobile-nav.tsx` (o equivalente do lado do aluno). */
export function AdminMobileNav({ role }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu administrativo" />}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 p-0">
        <SheetHeader className="border-sidebar-border flex-row items-center gap-2 space-y-0 border-b px-5 py-4">
          <ShieldCheck className="text-sidebar-primary h-5 w-5" aria-hidden="true" />
          <SheetTitle className="text-sidebar-foreground text-base">Admin · Operação Aprovação</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-3 py-4">
          <AdminSidebarNav role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
