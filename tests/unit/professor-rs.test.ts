import { describe, expect, it, vi, beforeEach } from "vitest";
import { professorCatalog } from "@/content/professor-rs/catalog";
import { validatePack, assessPack } from "@/content/professor-rs/schema";
import { buildProfessorPlan } from "@/content/professor-rs/planner";
import { packDigest, validatePublication } from "@/server/services/professor-rs/publication";
import { extractResponse, researchCourse } from "@/server/services/professor-rs/agent";
import { AuthError } from "@/server/errors";
vi.mock("@/server/authorization", () => ({ requireUser: vi.fn() }));
import { requireUser } from "@/server/authorization";
import { gradeProfessorQuiz, generateProfessorPlan } from "@/server/actions/professor-rs";
const seed = professorCatalog[0]!;

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({
    userId: "student-test",
    role: "aluno",
    name: "Teste",
    email: "test@example.com",
  });
});
describe("Professor RS: integridade e publicação", () => {
  it("valida as seis trilhas sem alegar cobertura integral", () => {
    expect(professorCatalog).toHaveLength(6);
    for (const pack of professorCatalog) {
      expect(validatePack(pack)).toEqual(pack);
      expect(assessPack(pack).readyForReview).toBe(false);
    }
  });
  it("recusa gabaritos impossíveis, tópicos órfãos e IDs repetidos", () => {
    const invalid = structuredClone(seed);
    invalid.lessons[0]!.practice[0]!.correctIndex = 4;
    expect(() => validatePack(invalid)).toThrow("Gabarito inválido");
    const repeated = structuredClone(seed);
    repeated.lessons[0]!.practice[0]!.options = ["Alternativa igual", "Alternativa igual"];
    expect(() => validatePack(repeated)).toThrow("Alternativas duplicadas");
    const orphan = structuredClone(seed);
    orphan.lessons[0]!.topicIds = ["inexistente"];
    expect(() => validatePack(orphan)).toThrow("Tópico inexistente");
    expect(() => validatePack({ ...seed, lessons: [...seed.lessons, seed.lessons[0]] })).toThrow(
      "IDs duplicados",
    );
  });
  it("recusa links executáveis e credenciais em URL", () => {
    for (const url of ["javascript:alert(1)", "https://user:password@example.com/a"]) {
      expect(() => validatePack({ ...seed, sources: [{ ...seed.sources[0], url }] })).toThrow();
    }
  });
  it("não publica biblioteca incompleta mesmo com revisão alegada", () => {
    expect(() => validatePublication(seed, {})).toThrow("Curso incompleto");
  });
  it("vincula a revisão ao conteúdo exato e exige fontes e exercícios", () => {
    const complete = structuredClone(seed);
    complete.syllabusVerified = true;
    complete.pending = [];
    complete.topics = complete.topics.filter((topic) =>
      complete.lessons.some((lesson) => lesson.topicIds.includes(topic.id)),
    );
    complete.sources.push(
      { ...complete.sources[0]!, kind: "prova" },
      { ...complete.sources[0]!, kind: "gabarito" },
    );
    for (const lesson of complete.lessons) {
      lesson.resources.push(
        { ...complete.sources[0]!, kind: "video" },
        { ...complete.sources[0]!, kind: "livro" },
      );
      const initial = [...lesson.practice];
      while (lesson.practice.length < 5)
        lesson.practice.push({ ...initial[0]!, id: `${lesson.id}-extra${lesson.practice.length}` });
      while (lesson.flashcards.length < 5) lesson.flashcards.push({ ...lesson.flashcards[0]! });
    }
    const review = {
      sha256: packDigest(complete),
      reviewer: "Revisor de teste",
      reviewedAt: new Date().toISOString(),
      approved: true,
      syllabusAndAmendmentsChecked: true,
      answersAndSourcesChecked: true,
      rightsChecked: true,
    };
    expect(validatePublication(complete, review).pack.title).toBe(seed.title);
    complete.lessons[0]!.workedExample += " Alteração depois da revisão.";
    expect(() => validatePublication(complete, review)).toThrow("mudou desde a revisão");
  });
});
describe("Professor RS: cadência", () => {
  it.each([30, 60, 90, 240])(
    "respeita carga de %i minutos e revisa todas as aulas",
    (minutesPerDay) => {
      const plan = buildProfessorPlan(seed, {
        startDate: "2026-09-14",
        daysPerWeek: 3,
        minutesPerDay,
      });
      expect(plan.length).toBeGreaterThan(0);
      for (const day of plan)
        expect(day.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBeLessThanOrEqual(
          minutesPerDay,
        );
      const tasks = plan.flatMap((day) => day.tasks);
      expect(tasks.filter((t) => t.type === "aula").reduce((sum, t) => sum + t.minutes, 0)).toBe(
        seed.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
      );
      expect(tasks.filter((t) => t.type === "revisao").reduce((sum, t) => sum + t.minutes, 0)).toBe(
        seed.lessons.length * 30,
      );
      for (const day of plan) {
        const offset = (Date.parse(day.date) - Date.parse("2026-09-14")) / 86400000;
        expect(offset % 7).toBeLessThan(3);
      }
    },
  );
  it("recusa datas impossíveis e disponibilidades inválidas", () => {
    expect(() =>
      buildProfessorPlan(seed, { startDate: "2026-02-30", daysPerWeek: 5, minutesPerDay: 60 }),
    ).toThrow();
    expect(() =>
      buildProfessorPlan(seed, { startDate: "2026-09-14", daysPerWeek: 0, minutesPerDay: 60 }),
    ).toThrow();
  });
});
describe("Professor RS: autorização e IA", () => {
  it("recusa correção e planejamento sem sessão", async () => {
    vi.mocked(requireUser).mockRejectedValue(new AuthError());
    expect((await gradeProfessorQuiz({ slug: seed.slug, answers: {} })).ok).toBe(false);
    expect((await generateProfessorPlan({ slug: seed.slug, options: {} })).ok).toBe(false);
  });
  it("corrige no servidor somente questões válidas do curso", async () => {
    const q = seed.lessons[0]!.practice[0]!;
    const result = await gradeProfessorQuiz({
      slug: seed.slug,
      answers: { [q.id]: q.correctIndex },
    });
    expect(result.ok && result.data.correct).toBe(1);
    expect((await gradeProfessorQuiz({ slug: seed.slug, answers: { inexistente: 0 } })).ok).toBe(
      false,
    );
    expect((await gradeProfessorQuiz({ slug: seed.slug, answers: { [q.id]: 4 } })).ok).toBe(false);
  });
  it("recusa respostas incompletas, recusas e texto sem pesquisa", () => {
    expect(() => extractResponse({ status: "incomplete" })).toThrow("incompleta");
    expect(() => extractResponse({ status: "completed", output: [] })).toThrow("busca");
    expect(() =>
      extractResponse({
        status: "completed",
        output: [
          { type: "web_search_call", status: "completed" },
          { type: "message", content: [{ type: "refusal" }] },
        ],
      }),
    ).toThrow("recusou");
  });
  it("não usa rede sem credenciais e não vaza erro do provedor", async () => {
    const fetcher = vi.fn();
    await expect(
      researchCourse({ apiKey: "", model: "configured-model", fetcher }, seed),
    ).rejects.toThrow("Configure");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response("secret-provider-detail", { status: 429 }));
    await expect(
      researchCourse({ apiKey: "test-key", model: "configured-model", fetcher }, seed),
    ).rejects.toThrow("HTTP 429");
    const request = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(request.store).toBe(false);
    expect(request.tool_choice).toBe("required");
    expect(request.tools[0].filters.allowed_domains).toContain("rs.gov.br");
  });
});
