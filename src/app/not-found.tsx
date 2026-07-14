import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-primary text-sm font-semibold tracking-widest uppercase">Erro 404</p>
        <EmptyState
          icon={Compass}
          title="Página não encontrada"
          description="O conteúdo que você procura não existe ou foi movido."
          action={
            <Link href="/dashboard" className={cn(buttonVariants())}>
              Voltar para o início
            </Link>
          }
        />
      </div>
    </div>
  );
}
