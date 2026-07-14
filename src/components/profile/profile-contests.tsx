import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OwnProfileDTO } from "./types";

interface ProfileContestsProps {
  profile: OwnProfileDTO;
}

/**
 * "Concursos de interesse" (Fase 16 — UI do agente `frontend`). Só exibição — a lista é DERIVADA
 * das matrículas reais do aluno (`resolveInterestedContests`, `@/server/services/profile/shared`),
 * nunca editável diretamente por aqui (não existe campo para isso em `updateProfileInputSchema`;
 * o jeito de "adicionar um concurso de interesse" é se matricular num curso dele, em `/cursos`).
 * O concurso PRINCIPAL (`targetContestId`, editável em `EditProfileDialog`) é destacado à parte.
 */
export function ProfileContests({ profile }: ProfileContestsProps) {
  const { mainContest, interestedContests } = profile;

  if (!mainContest && interestedContests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Concursos de interesse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {mainContest ? (
            <Badge className="gap-1">
              <Target className="h-3 w-3" aria-hidden="true" />
              {mainContest.contestName} (principal)
            </Badge>
          ) : null}
          {interestedContests
            .filter((contest) => contest.contestId !== mainContest?.contestId)
            .map((contest) => (
              <Badge key={contest.contestId} variant="outline">
                {contest.contestName}
              </Badge>
            ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Derivado dos cursos em que você está matriculado — matricule-se em um curso de outro concurso em{" "}
          <span className="text-foreground font-medium">Cursos</span> para adicioná-lo aqui.
        </p>
      </CardContent>
    </Card>
  );
}
