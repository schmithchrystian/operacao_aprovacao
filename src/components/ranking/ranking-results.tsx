import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RankingListEntryDTO } from "@/server/services/gamification";
import { RankingAvatar } from "./ranking-avatar";
import { RankingEvolution } from "./ranking-evolution";

interface RankingResultsProps {
  items: RankingListEntryDTO[];
}

function LevelCell({ entry }: { entry: RankingListEntryDTO }) {
  return (
    <span className="text-muted-foreground text-sm">
      Nível {entry.level.index} — {entry.level.name}
    </span>
  );
}

function CurrentUserTag() {
  return (
    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
      Você
    </Badge>
  );
}

/**
 * Lista paginada dos demais colocados (fora do pódio). Tabela em telas médias/grandes, cards
 * empilhados no mobile — mesmos dados, apenas layout responsivo. Recebe `items` já paginados,
 * ordenados e com mascaramento de privacidade resolvido pelo backend (`getRanking`); nenhum
 * cálculo/ordenação/desmascaramento acontece aqui. Server Component.
 */
export function RankingResults({ items }: RankingResultsProps) {
  return (
    <section aria-labelledby="ranking-lista-heading" className="space-y-3">
      <h2 id="ranking-lista-heading" className="text-lg font-semibold tracking-tight">
        Classificação
      </h2>

      {/* Tabela (md+) */}
      <div className="border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Classificação do ranking, por posição</caption>
          <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Pos.
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Aluno
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Nível
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Concurso
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Pontos
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Horas válidas
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Aulas
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Aproveitamento
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Sequência
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Evolução
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {items.map((entry) => (
              <tr key={entry.userId} className={cn(entry.isCurrentUser && "bg-primary/5")}>
                <th scope="row" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  {entry.position > 0 ? `${entry.position}º` : "—"}
                </th>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <RankingAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} size="sm" />
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="max-w-40 truncate">{entry.displayName}</span>
                      {entry.isCurrentUser ? <CurrentUserTag /> : null}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <LevelCell entry={entry} />
                </td>
                <td className="text-muted-foreground px-3 py-2">{entry.contestName ?? "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{entry.points.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-right">{entry.validHours === null ? "Privado" : `${entry.validHours.toLocaleString("pt-BR")}h`}</td>
                <td className="px-3 py-2 text-right">{entry.lessonsCompleted ?? "Privado"}</td>
                <td className="px-3 py-2 text-right">{entry.accuracyPercent === null ? "Privado" : `${Math.round(entry.accuracyPercent)}%`}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Flame className="text-primary h-3.5 w-3.5" aria-hidden="true" />
                    {entry.streakDays ?? "Privado"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <RankingEvolution value={entry.evolution} className="justify-end" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <ul className="space-y-3 md:hidden">
        {items.map((entry) => (
          <li key={entry.userId}>
            <Card className={cn(entry.isCurrentUser && "ring-2 ring-primary/60")}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-7 shrink-0 text-sm font-semibold">
                    {entry.position > 0 ? `${entry.position}º` : "—"}
                  </span>
                  <RankingAvatar name={entry.displayName} avatarUrl={entry.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{entry.displayName}</span>
                      {entry.isCurrentUser ? <CurrentUserTag /> : null}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      Nível {entry.level.index} — {entry.level.name}
                      {entry.contestName ? ` · ${entry.contestName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{entry.points.toLocaleString("pt-BR")}</p>
                    <p className="text-muted-foreground text-[10px]">pontos</p>
                  </div>
                </div>
                <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="font-medium">Horas válidas</dt>
                    <dd>{entry.validHours === null ? "Privado" : `${entry.validHours.toLocaleString("pt-BR")}h`}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Aulas</dt>
                    <dd>{entry.lessonsCompleted ?? "Privado"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Aproveitamento</dt>
                    <dd>{entry.accuracyPercent === null ? "Privado" : `${Math.round(entry.accuracyPercent)}%`}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Sequência</dt>
                    <dd className="flex items-center gap-1">
                      <Flame className="text-primary h-3 w-3" aria-hidden="true" />
                      {entry.streakDays === null ? "Privado" : `${entry.streakDays} dias`}
                    </dd>
                  </div>
                </dl>
                <RankingEvolution value={entry.evolution} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
