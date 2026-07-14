import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeakContentsCard } from "@/components/tracking/weak-contents-card";
import { PendingContentsCard } from "@/components/tracking/pending-contents-card";
import { OverdueReviewsCard } from "@/components/tracking/overdue-reviews-card";
import type {
  TrackingOverdueReviewDTO,
  TrackingPendingContentDTO,
  TrackingWeakContentDTO,
} from "@/contracts/tracking";

describe("WeakContentsCard", () => {
  const items: TrackingWeakContentDTO[] = [
    { subjectId: "s1", subjectName: "Direito Penal", topicId: null, topicName: null, accuracyPercent: 40, totalAnswered: 10 },
    {
      subjectId: "s1",
      subjectName: "Direito Penal",
      topicId: "t1",
      topicName: "Crimes contra a pessoa",
      accuracyPercent: 30,
      totalAnswered: 5,
    },
  ];

  it("lista matérias e assuntos fracos com o percentual de acerto", () => {
    render(<WeakContentsCard items={items} />);

    expect(screen.getByText("Direito Penal")).toBeTruthy();
    expect(screen.getByText("Crimes contra a pessoa")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("30%")).toBeTruthy();
  });

  it("mostra um estado vazio positivo quando não há conteúdo fraco", () => {
    render(<WeakContentsCard items={[]} />);

    expect(screen.getByText(/nenhum conteúdo fraco identificado/i)).toBeTruthy();
  });
});

describe("PendingContentsCard", () => {
  const items: TrackingPendingContentDTO[] = [
    { subjectId: "s1", subjectName: "Raciocínio Lógico" },
    { subjectId: "s2", subjectName: "Informática" },
  ];

  it("lista as matérias ainda sem nenhum estudo registrado", () => {
    render(<PendingContentsCard items={items} />);

    expect(screen.getByText("Raciocínio Lógico")).toBeTruthy();
    expect(screen.getByText("Informática")).toBeTruthy();
  });

  it("mostra um estado vazio positivo quando não há matéria pendente", () => {
    render(<PendingContentsCard items={[]} />);

    expect(screen.getByText(/todas as matérias já têm algum estudo registrado/i)).toBeTruthy();
  });
});

describe("OverdueReviewsCard", () => {
  const items: TrackingOverdueReviewDTO[] = [
    {
      itemId: "item-1",
      title: "Revisar Direito Constitucional",
      subjectName: "Direito Constitucional",
      targetDate: "2026-06-01T00:00:00.000Z",
      daysLate: 5,
    },
  ];

  it("lista revisões atrasadas com o número de dias de atraso", () => {
    render(<OverdueReviewsCard items={items} />);

    expect(screen.getByText("Revisar Direito Constitucional")).toBeTruthy();
    expect(screen.getByText("5 dias")).toBeTruthy();
  });

  it("mostra um estado vazio positivo quando não há revisão atrasada", () => {
    render(<OverdueReviewsCard items={[]} />);

    expect(screen.getByText(/nenhuma revisão atrasada/i)).toBeTruthy();
  });
});
