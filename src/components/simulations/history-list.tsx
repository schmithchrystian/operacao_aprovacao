import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ATTEMPT_STATUS_BADGE_CLASS, ATTEMPT_STATUS_LABEL } from "@/components/simulations/labels";
import { cn, formatDatePtBr } from "@/lib/utils";
import type { HistoryItemDTO } from "@/contracts/simulations";

interface HistoryListProps {
  items: HistoryItemDTO[];
}

function actionFor(item: HistoryItemDTO): { href: string; label: string } | null {
  if (item.status === "FINISHED") {
    return { href: `/simulados/${item.attemptId}/resultado`, label: "Ver resultado" };
  }
  if (item.status === "IN_PROGRESS") {
    return { href: `/simulados/${item.attemptId}`, label: "Continuar" };
  }
  return null;
}

/**
 * Histórico de tentativas (qualquer status), mais recente primeiro — já vem ordenado do
 * backend (`getHistory`). Mesmo padrão responsivo de `RankingResults`: tabela em telas médias+,
 * cards empilhados no mobile. Server Component — nenhum cálculo de nota/aproveitamento
 * acontece aqui.
 */
export function HistoryList({ items }: HistoryListProps) {
  return (
    <>
      <div className="border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Histórico de tentativas de simulado</caption>
          <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Simulado
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Data
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Acertos
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Aproveitamento
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {items.map((item) => {
              const action = actionFor(item);
              return (
                <tr key={item.attemptId}>
                  <td className="px-3 py-2 font-medium">{item.mockExamTitle ?? "Simulado personalizado"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={ATTEMPT_STATUS_BADGE_CLASS[item.status]}>
                      {ATTEMPT_STATUS_LABEL[item.status]}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-3 py-2">{formatDatePtBr(item.startedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {item.correctCount !== null ? `${item.correctCount}/${item.totalQuestions}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.scorePercent !== null ? `${Math.round(item.scorePercent)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {action ? (
                      <Link href={action.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                        {action.label}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((item) => {
          const action = actionFor(item);
          return (
            <li key={item.attemptId}>
              <Card>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.mockExamTitle ?? "Simulado personalizado"}</p>
                      <p className="text-muted-foreground text-xs">{formatDatePtBr(item.startedAt)}</p>
                    </div>
                    <Badge variant="outline" className={ATTEMPT_STATUS_BADGE_CLASS[item.status]}>
                      {ATTEMPT_STATUS_LABEL[item.status]}
                    </Badge>
                  </div>
                  <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <dt className="font-medium">Acertos</dt>
                      <dd>{item.correctCount !== null ? `${item.correctCount}/${item.totalQuestions}` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Aproveitamento</dt>
                      <dd>{item.scorePercent !== null ? `${Math.round(item.scorePercent)}%` : "—"}</dd>
                    </div>
                  </dl>
                  {action ? (
                    <Link
                      href={action.href}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}
                    >
                      {action.label}
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
