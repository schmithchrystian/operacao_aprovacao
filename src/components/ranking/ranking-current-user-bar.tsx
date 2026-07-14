import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RankingListEntryDTO } from "@/server/services/gamification";
import { RankingAvatar } from "./ranking-avatar";
import { RankingEvolution } from "./ranking-evolution";
import { buildRankingHref, type ParsedRankingQuery } from "./ranking-query";

interface RankingCurrentUserBarProps {
  entry: RankingListEntryDTO;
  query: ParsedRankingQuery;
  currentPage: number;
  pageSize: number;
}

/**
 * Linha fixa do usuário autenticado: sempre mostra a posição REAL dele (`currentUser`,
 * resolvida no servidor a partir da sessão — nunca mascarada para o próprio usuário), mesmo
 * que esteja fora da página atual ou tenha optado por não aparecer nas listagens públicas.
 * Server Component — sticky no rodapé do conteúdo da página.
 */
export function RankingCurrentUserBar({ entry, query, currentPage, pageSize }: RankingCurrentUserBarProps) {
  const ownerPage = entry.position > 0 ? Math.max(1, Math.ceil(entry.position / pageSize)) : null;
  const isOnCurrentPage = ownerPage === currentPage;

  return (
    <div
      className="border-primary/40 bg-card sticky bottom-3 z-20 rounded-lg border p-3 shadow-lg backdrop-blur sm:p-4"
      role="status"
      aria-label="Sua posição no ranking"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Sua posição</span>
          <span className="font-bold">{entry.position > 0 ? `${entry.position}º` : "—"}</span>
          <RankingAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} size="sm" />
          <span className="truncate font-medium">{entry.displayName}</span>
          <span className="text-muted-foreground text-sm">{entry.points.toLocaleString("pt-BR")} pontos</span>
          <RankingEvolution value={entry.evolution} />
        </div>
        {!isOnCurrentPage && ownerPage ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildRankingHref("/ranking", query, { page: ownerPage })} />}
          >
            Ver minha posição
          </Button>
        ) : null}
      </div>
    </div>
  );
}
