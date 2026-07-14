import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRankingHref, type ParsedRankingQuery } from "./ranking-query";

interface RankingPaginationProps {
  query: ParsedRankingQuery;
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Paginação da listagem (o backend pagina — `RANKING_PAGE_SIZE` por página). Server Component:
 * só monta links `<Link>` preservando os filtros atuais, nenhuma busca de dados no cliente.
 */
export function RankingPagination({ query, page, pageSize, total }: RankingPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Paginação do ranking" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} participante{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          render={hasPrev ? <Link href={buildRankingHref("/ranking", query, { page: page - 1 })} /> : undefined}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          render={hasNext ? <Link href={buildRankingHref("/ranking", query, { page: page + 1 })} /> : undefined}
        >
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
