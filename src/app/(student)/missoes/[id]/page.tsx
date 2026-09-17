import type { Metadata } from "next";
import { getMyMissionAction } from "@/server/actions/missions";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { MissionRunner } from "@/components/study-session/mission-runner";
export const metadata: Metadata = { title: "Missão de estudo" };
export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyMissionAction({ id });
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Missões", href: "/missoes" }, { label: "Missão de estudo" }]} />
    <h1 className="text-2xl font-semibold">Missão de estudo</h1>
    {result.ok ? <MissionRunner key={`${result.data.id}:${result.data.status}:${result.data.currentBlockIndex}`} initialMission={result.data} /> : <ErrorState title="Missão indisponível" description={result.error.message} />}
  </div>;
}
