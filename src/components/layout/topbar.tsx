import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentSession } from "@/server/authorization";
import { logoutAction } from "@/server/actions/auth";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsMenu } from "./notifications-menu";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Barra superior do shell do aluno: busca (placeholder), notificações (placeholder),
 * tema e menu de perfil. Server Component — a interatividade fica isolada nos
 * componentes client (MobileNav, ThemeToggle, DropdownMenu/Avatar do shadcn).
 *
 * O usuário exibido vem da fronteira de servidor `getCurrentSession()`
 * (hoje sobre mock; Auth.js real na Fase 4), nunca de `@/mocks` direto.
 */
const FALLBACK_USER = { name: "Aluno", email: "" } as const;

export async function Topbar() {
  const session = await getCurrentSession();
  const currentUser = session ?? FALLBACK_USER;

  return (
    <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/70 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <MobileNav />

      <form action="/busca" role="search" className="flex flex-1 items-center gap-2">
        <Label htmlFor="global-search" className="sr-only">
          Buscar
        </Label>
        <div className="relative w-full max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="global-search"
            name="q"
            required
            minLength={2}
            maxLength={100}
            type="search"
            placeholder="Buscar cursos, aulas, flashcards..."
            className="pl-8"
          />
        </div>
      </form>

      <ThemeToggle />

      <NotificationsMenu />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
              aria-label="Menu do perfil"
            />
          }
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{currentUser.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm leading-none font-medium">{currentUser.name}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs leading-none">
              {currentUser.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/perfil" />}>Perfil</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/seguranca" />}>
            Segurança da conta
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Configurações</DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <DropdownMenuItem render={<button type="submit" className="w-full text-left" />}>
              Sair
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
