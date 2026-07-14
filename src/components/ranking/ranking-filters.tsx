"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PERIOD_OPTIONS,
  SCOPE_OPTIONS,
  buildRankingHref,
  type ParsedRankingQuery,
  type RankingScopeOption,
  type ScopeParam,
} from "./ranking-query";

interface RankingFiltersProps {
  query: ParsedRankingQuery;
  contestOptions: RankingScopeOption[];
  courseOptions: RankingScopeOption[];
}

const SELECT_CLASS = cn(
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
);

/**
 * Filtros de período e escopo do ranking. Client Component: só reescreve a URL (searchParams)
 * — quem busca os dados é sempre a página (Server Component), que relê `getRankingAction` a
 * cada navegação. Nenhum cálculo/ordenação acontece aqui. Só oferece os escopos que o backend
 * suporta (`@/server/services/gamification/ranking/scope.ts`): global, concurso, curso, cidade,
 * estado — sem "turma", que não existe no schema ainda.
 */
export function RankingFilters({ query, contestOptions, courseOptions }: RankingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scopeKeyDraft, setScopeKeyDraft] = useState(query.scopeKey);
  // Ressincroniza o rascunho do campo livre (cidade/estado) quando a URL muda "por fora"
  // (ex.: navegação pela paginação/voltar do navegador) — padrão de "ajustar estado a partir
  // de props" do React (sem `useEffect`, evitando o cascading render apontado pelo lint).
  const [scopeKeyForDraft, setScopeKeyForDraft] = useState(query.scopeKey);
  if (query.scopeKey !== scopeKeyForDraft) {
    setScopeKeyForDraft(query.scopeKey);
    setScopeKeyDraft(query.scopeKey);
  }

  function navigate(overrides: Partial<ParsedRankingQuery>) {
    router.push(buildRankingHref(pathname, query, overrides));
  }

  function handlePeriodChange(event: ChangeEvent<HTMLSelectElement>) {
    navigate({ period: event.target.value as ParsedRankingQuery["period"], page: 1 });
  }

  function handleScopeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextScope = event.target.value as ScopeParam;
    const nextScopeKey =
      nextScope === "concurso"
        ? (contestOptions[0]?.value ?? "")
        : nextScope === "curso"
          ? (courseOptions[0]?.value ?? "")
          : "";

    setScopeKeyDraft(nextScopeKey);
    navigate({ scope: nextScope, scopeKey: nextScopeKey, page: 1 });
  }

  function handleScopeKeySelectChange(event: ChangeEvent<HTMLSelectElement>) {
    navigate({ scopeKey: event.target.value, page: 1 });
  }

  function handleScopeKeySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ scopeKey: scopeKeyDraft.trim(), page: 1 });
  }

  const scopeKeyOptions: RankingScopeOption[] | null =
    query.scope === "concurso" ? contestOptions : query.scope === "curso" ? courseOptions : null;
  const isFreeTextScope = query.scope === "cidade" || query.scope === "estado";

  return (
    <fieldset className="border-border bg-card/40 flex flex-wrap items-end gap-4 rounded-lg border p-3">
      <legend className="sr-only">Filtros de ranking</legend>

      <div className="text-muted-foreground flex items-center gap-1.5 pb-1.5 text-xs font-medium tracking-wide uppercase">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        Filtros
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ranking-periodo" className="text-muted-foreground text-xs font-medium">
          Período
        </label>
        <select
          id="ranking-periodo"
          className={SELECT_CLASS}
          value={query.period}
          onChange={handlePeriodChange}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ranking-escopo" className="text-muted-foreground text-xs font-medium">
          Escopo
        </label>
        <select id="ranking-escopo" className={SELECT_CLASS} value={query.scope} onChange={handleScopeChange}>
          {SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {scopeKeyOptions ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="ranking-chave-select" className="text-muted-foreground text-xs font-medium">
            {query.scope === "concurso" ? "Concurso" : "Curso"}
          </label>
          {scopeKeyOptions.length > 0 ? (
            <select
              id="ranking-chave-select"
              className={cn(SELECT_CLASS, "max-w-56")}
              value={query.scopeKey}
              onChange={handleScopeKeySelectChange}
            >
              {scopeKeyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-muted-foreground text-xs">Nenhuma opção disponível ainda.</p>
          )}
        </div>
      ) : null}

      {isFreeTextScope ? (
        <form className="flex items-end gap-2" onSubmit={handleScopeKeySubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="ranking-chave-texto" className="text-muted-foreground text-xs font-medium">
              {query.scope === "cidade" ? "Cidade" : "Estado (UF)"}
            </label>
            <Input
              id="ranking-chave-texto"
              className="h-8 w-40"
              value={scopeKeyDraft}
              onChange={(event) => setScopeKeyDraft(event.target.value)}
              placeholder={query.scope === "cidade" ? "Ex.: São Paulo" : "Ex.: SP"}
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Aplicar
          </Button>
        </form>
      ) : null}
    </fieldset>
  );
}
