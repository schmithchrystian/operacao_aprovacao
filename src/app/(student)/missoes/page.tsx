import type { Metadata } from "next";
import Link from "next/link";
import { listMyMissionsAction } from "@/server/actions/missions";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
export const metadata: Metadata = { title: "Minhas missões" };
export default async function MissionsPage() {
  const result = await listMyMissionsAction();
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Minhas missões" }]} />
    <h1 className="text-2xl font-semibold">Minhas missões</h1>
    <Link href="/montar-estudo" className="text-primary underline">Montar nova missão</Link>
    {!result.ok ? <ErrorState title="Não foi possível carregar as missões" description={result.error.message} /> : result.data.length === 0 ? <p>Você ainda não iniciou uma missão de estudo.</p> : <ul className="space-y-3">
      {result.data.map(mission => <li key={mission.id} className="space-y-1 rounded border p-4">
        <Link href={`/missoes/${encodeURIComponent(mission.id)}`} className="text-primary font-medium underline">{mission.blocks[0]?.title ?? "Missão de estudo"}</Link>
        <p className="text-muted-foreground text-sm">{mission.status === "ACTIVE" ? `Em andamento · bloco ${mission.currentBlockIndex + 1} de ${mission.blocks.length}` : mission.status === "FINISHED" ? "Concluída" : "Encerrada"} · {mission.totalMinutes} minutos planejados</p>
      </li>)}
    </ul>}
  </div>;
}
