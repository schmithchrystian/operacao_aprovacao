import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionReviewList } from "@/components/simulations/question-review-list";
import type { QuestionResultDTO } from "@/contracts/simulations";

const questions: QuestionResultDTO[] = [
  {
    questionId: "q1",
    statement: "Questão respondida corretamente",
    subjectName: "Direito Penal",
    topicName: null,
    board: null,
    difficulty: "EASY",
    options: [
      { id: "a", label: "A", text: "Errada", isCorrect: false },
      { id: "b", label: "B", text: "Certa", isCorrect: true },
    ],
    selectedOptionId: "b",
    isCorrect: true,
    explanation: "Porque sim.",
  },
  {
    questionId: "q2",
    statement: "Questão respondida errada",
    subjectName: "Matemática",
    topicName: null,
    board: null,
    difficulty: "MEDIUM",
    options: [
      { id: "c", label: "A", text: "Errada escolhida", isCorrect: false },
      { id: "d", label: "B", text: "Certa não escolhida", isCorrect: true },
    ],
    selectedOptionId: "c",
    isCorrect: false,
    explanation: null,
  },
  {
    questionId: "q3",
    statement: "Questão não respondida",
    subjectName: "Português",
    topicName: null,
    board: null,
    difficulty: "HARD",
    options: [
      { id: "e", label: "A", text: "Opção A", isCorrect: true },
      { id: "f", label: "B", text: "Opção B", isCorrect: false },
    ],
    selectedOptionId: null,
    isCorrect: null,
    explanation: null,
  },
];

describe("QuestionReviewList", () => {
  it("marca a alternativa correta com o rótulo 'Gabarito'", () => {
    render(<QuestionReviewList questions={questions} />);
    const gabaritoLabels = screen.getAllByText("Gabarito");
    expect(gabaritoLabels.length).toBe(3); // uma por questão
  });

  it("marca a alternativa escolhida errada com o rótulo 'Sua resposta'", () => {
    render(<QuestionReviewList questions={questions} />);
    expect(screen.getByText("Sua resposta")).toBeTruthy();
  });

  it("indica quando a questão não foi respondida", () => {
    render(<QuestionReviewList questions={questions} />);
    expect(screen.getByText(/você não respondeu esta questão/i)).toBeTruthy();
  });

  it("exibe a explicação quando disponível", () => {
    render(<QuestionReviewList questions={questions} />);
    expect(screen.getByText("Porque sim.")).toBeTruthy();
  });

  it("questões erradas/não respondidas iniciam expandidas; certas iniciam recolhidas", () => {
    render(<QuestionReviewList questions={questions} />);
    const detailsElements = document.querySelectorAll("details");
    expect(detailsElements.length).toBe(3);
    expect(detailsElements[0]?.hasAttribute("open")).toBe(false); // q1: correta
    expect(detailsElements[1]?.hasAttribute("open")).toBe(true); // q2: errada
    expect(detailsElements[2]?.hasAttribute("open")).toBe(true); // q3: não respondida
  });
});
