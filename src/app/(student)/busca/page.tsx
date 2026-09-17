import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { searchContentAction } from "@/server/actions/search";
export const metadata: Metadata = { title: "Busca" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const result = query ? await searchContentAction({ query, page: params.page ?? 1 }) : null;
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Busca" }]} />
    <h1 className="text-2xl font-semibold">Busca</h1>
    <form action="/busca" role="search" className="flex gap-2">
      <label htmlFor="search-query" className="sr-only">Buscar conteúdo</label>
      <input id="search-query" name="q" type="search" required minLength={2} maxLength={100} defaultValue={query} placeholder="Cursos, aulas e flashcards" className="border-input bg-background min-w-0 flex-1 rounded border px-3 py-2" />
      <button className="bg-primary text-primary-foreground rounded px-4 py-2" type="submit">Buscar</button>
    </form>
    {result && !result.ok ? <ErrorState title="Não foi possível buscar" description={result.error.message} /> : !result || !result.data.total
      ? <EmptyState icon={Search} title={query ? "Nenhum resultado encontrado" : "Encontre seu próximo conteúdo"} description={query ? "Tente outro termo. A busca inclui seus conteúdos acessíveis." : "Digite pelo menos duas letras para começar."} />
      : <><p role="status">{result.data.total} resultado(s) para “{query}”.</p>
        <ul className="space-y-3">{result.data.items.map(item => <li key={`${item.kind}:${item.id}`} className="rounded border p-3">
          <span className="text-muted-foreground text-xs">{item.kind}</span><Link href={item.href} className="text-primary block font-medium underline">{item.title}</Link>
        </li>)}</ul>
        <nav aria-label="Páginas da busca" className="flex gap-4">
          {result.data.page > 1 ? <Link href={`/busca?q=${encodeURIComponent(query)}&page=${result.data.page - 1}`}>Anterior</Link> : null}
          <span>Página {result.data.page}</span>{result.data.page * 20 < result.data.total ? <Link href={`/busca?q=${encodeURIComponent(query)}&page=${result.data.page + 1}`}>Próxima</Link> : null}
        </nav></>}
  </div>;
}
