import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SimuladosHubLinkCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Contador já pronto (ex.: nº de tentativas/questões) — nenhum cálculo acontece aqui. */
  count: number;
  countLabel: string;
}

/**
 * Cartão-link do hub de simulados (Histórico / Caderno de erros / Favoritos). Server
 * Component — o `Link` inteiro é a área clicável/focável (não só um botão interno), o que
 * mantém o cartão inteiro acessível por teclado com uma única parada de foco.
 */
export function SimuladosHubLinkCard({ href, icon: Icon, title, description, count, countLabel }: SimuladosHubLinkCardProps) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="hover:ring-foreground/20 h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4">
          <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold">{title}</p>
            <p className="text-muted-foreground truncate text-xs">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-right">
            <div>
              <p className="text-foreground text-lg leading-none font-semibold">
                {count.toLocaleString("pt-BR")}
              </p>
              <p className="text-muted-foreground text-[0.65rem] uppercase">{countLabel}</p>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
