import type { ModuleEntity } from "@/server/repositories/contracts/module-repository";
import type { LessonEntity } from "@/server/repositories/contracts/lesson-repository";
import { SUBJECT_IDS } from "./subjects";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — módulos e aulas dos 3 cursos
 * (Fase 6), em ORDEM CRONOLÓGICA (`order` crescente, único por curso/módulo).
 *
 * `buildModule` só monta os objetos a partir de um seed compacto para reduzir repetição —
 * não contém regra de negócio (liberação/progresso ficam em
 * `src/server/services/courses/progress.ts`).
 */

interface LessonSeed {
  title: string;
  durationMinutes: number;
}

interface ModuleSeed {
  slug: string;
  title: string;
  subjectId: string;
  lessons: LessonSeed[];
}

interface BuiltModule {
  module: ModuleEntity;
  lessons: LessonEntity[];
}

function buildModule(courseId: string, order: number, seed: ModuleSeed): BuiltModule {
  const moduleId = `${courseId}-m${order}`;
  const moduleEntity: ModuleEntity = {
    id: moduleId,
    courseId,
    subjectId: seed.subjectId,
    order,
    slug: seed.slug,
    title: seed.title,
    description: null,
    teacherId: null,
    status: "PUBLISHED",
    deletedAt: null,
  };
  const lessons: LessonEntity[] = seed.lessons.map((lessonSeed, index) => ({
    id: `${moduleId}-l${index + 1}`,
    moduleId,
    order: index + 1,
    title: lessonSeed.title,
    durationMinutes: lessonSeed.durationMinutes,
    requiresLessonId: null,
    videoUrl: null,
    teacherId: null,
    status: "PUBLISHED",
    deletedAt: null,
  }));
  return { module: moduleEntity, lessons };
}

function buildCourseModules(courseId: string, seeds: ModuleSeed[]): BuiltModule[] {
  return seeds.map((seed, index) => buildModule(courseId, index + 1, seed));
}

const COURSE_1_MODULES: ModuleSeed[] = [
  {
    slug: "lingua-portuguesa",
    title: "Língua Portuguesa",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    lessons: [
      { title: "Interpretação de texto", durationMinutes: 30 },
      { title: "Ortografia e acentuação", durationMinutes: 25 },
      { title: "Classes gramaticais", durationMinutes: 35 },
      { title: "Concordância verbal e nominal", durationMinutes: 30 },
    ],
  },
  {
    slug: "raciocinio-logico",
    title: "Raciocínio Lógico",
    subjectId: SUBJECT_IDS.raciocinioLogico,
    lessons: [
      { title: "Estruturas lógicas e proposições", durationMinutes: 30 },
      { title: "Lógica de argumentação", durationMinutes: 30 },
      { title: "Sequências e padrões numéricos", durationMinutes: 25 },
      { title: "Problemas de raciocínio aplicados", durationMinutes: 35 },
    ],
  },
  {
    slug: "direito-constitucional",
    title: "Direito Constitucional",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    lessons: [
      { title: "Princípios fundamentais da Constituição", durationMinutes: 40 },
      { title: "Direitos e garantias fundamentais", durationMinutes: 45 },
      { title: "Organização do Estado", durationMinutes: 35 },
      { title: "Segurança pública na Constituição", durationMinutes: 30 },
    ],
  },
  {
    slug: "direito-administrativo",
    title: "Direito Administrativo",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    lessons: [
      { title: "Princípios da administração pública", durationMinutes: 30 },
      { title: "Poderes administrativos", durationMinutes: 35 },
      { title: "Atos administrativos", durationMinutes: 30 },
      { title: "Responsabilidade civil do Estado", durationMinutes: 30 },
    ],
  },
  {
    slug: "direitos-humanos",
    title: "Direitos Humanos",
    subjectId: SUBJECT_IDS.direitosHumanos,
    lessons: [
      { title: "Fundamentos dos direitos humanos", durationMinutes: 25 },
      { title: "Direitos humanos e atuação policial", durationMinutes: 30 },
      { title: "Uso da força e direitos humanos", durationMinutes: 30 },
      { title: "Casos práticos e jurisprudência", durationMinutes: 25 },
    ],
  },
  {
    slug: "atualidades",
    title: "Atualidades",
    subjectId: SUBJECT_IDS.atualidades,
    lessons: [
      { title: "Panorama de segurança pública no Brasil", durationMinutes: 20 },
      { title: "Atualidades em políticas públicas", durationMinutes: 20 },
      { title: "Temas emergentes e debates", durationMinutes: 20 },
      { title: "Revisão de atualidades", durationMinutes: 20 },
    ],
  },
  {
    slug: "redacao",
    title: "Redação",
    subjectId: SUBJECT_IDS.redacao,
    lessons: [
      { title: "Estrutura da redação dissertativa", durationMinutes: 30 },
      { title: "Coesão e coerência textual", durationMinutes: 30 },
      { title: "Erros comuns e como evitá-los", durationMinutes: 25 },
      { title: "Prática de redação com correção", durationMinutes: 40 },
    ],
  },
];

const COURSE_2_MODULES: ModuleSeed[] = [
  {
    slug: "lingua-portuguesa",
    title: "Língua Portuguesa",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    lessons: [
      { title: "Interpretação de texto", durationMinutes: 30 },
      { title: "Ortografia e acentuação", durationMinutes: 25 },
      { title: "Concordância e regência", durationMinutes: 30 },
      { title: "Redação oficial básica", durationMinutes: 25 },
    ],
  },
  {
    slug: "matematica",
    title: "Matemática",
    subjectId: SUBJECT_IDS.matematica,
    lessons: [
      { title: "Operações fundamentais", durationMinutes: 25 },
      { title: "Razão e proporção", durationMinutes: 25 },
      { title: "Porcentagem e juros simples", durationMinutes: 30 },
      { title: "Resolução de problemas", durationMinutes: 30 },
    ],
  },
  {
    slug: "legislacao-guardas",
    title: "Legislação Especial",
    subjectId: SUBJECT_IDS.legislacaoEspecial,
    lessons: [
      { title: "Estatuto Geral das Guardas Municipais", durationMinutes: 35 },
      { title: "Atribuições da Guarda Civil Municipal", durationMinutes: 30 },
      { title: "Uso de força e algemas", durationMinutes: 30 },
      { title: "Cooperação com a segurança pública", durationMinutes: 25 },
    ],
  },
  {
    slug: "direito-administrativo",
    title: "Direito Administrativo",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    lessons: [
      { title: "Princípios da administração pública", durationMinutes: 30 },
      { title: "Poderes administrativos", durationMinutes: 35 },
      { title: "Atos administrativos municipais", durationMinutes: 30 },
      { title: "Licitações e contratos (noções)", durationMinutes: 25 },
    ],
  },
  {
    slug: "direitos-humanos",
    title: "Direitos Humanos",
    subjectId: SUBJECT_IDS.direitosHumanos,
    lessons: [
      { title: "Fundamentos dos direitos humanos", durationMinutes: 25 },
      { title: "Abordagem policial e direitos humanos", durationMinutes: 30 },
      { title: "Grupos vulneráveis", durationMinutes: 25 },
      { title: "Casos práticos municipais", durationMinutes: 25 },
    ],
  },
  {
    slug: "legislacao-transito",
    title: "Legislação de Trânsito",
    subjectId: SUBJECT_IDS.legislacaoTransito,
    lessons: [
      { title: "Código de Trânsito Brasileiro — princípios", durationMinutes: 30 },
      { title: "Infrações e penalidades", durationMinutes: 30 },
      { title: "Sinalização viária", durationMinutes: 25 },
      { title: "Fiscalização de trânsito municipal", durationMinutes: 25 },
    ],
  },
  {
    slug: "administracao-publica",
    title: "Administração Pública",
    subjectId: SUBJECT_IDS.administracaoPublica,
    lessons: [
      { title: "Organização administrativa", durationMinutes: 25 },
      { title: "Administração direta e indireta", durationMinutes: 25 },
      { title: "Princípios da gestão pública", durationMinutes: 25 },
      { title: "Controle da administração pública", durationMinutes: 25 },
    ],
  },
];

const COURSE_3_MODULES: ModuleSeed[] = [
  {
    slug: "lingua-portuguesa",
    title: "Língua Portuguesa",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    lessons: [
      { title: "Interpretação de texto", durationMinutes: 30 },
      { title: "Ortografia e acentuação", durationMinutes: 25 },
      { title: "Classes gramaticais", durationMinutes: 30 },
      { title: "Concordância verbal e nominal", durationMinutes: 30 },
    ],
  },
  {
    slug: "informatica",
    title: "Informática",
    subjectId: SUBJECT_IDS.informatica,
    lessons: [
      { title: "Conceitos básicos de hardware e software", durationMinutes: 25 },
      { title: "Sistemas operacionais", durationMinutes: 25 },
      { title: "Segurança da informação", durationMinutes: 30 },
      { title: "Ferramentas de escritório", durationMinutes: 25 },
    ],
  },
  {
    slug: "direito-penal",
    title: "Direito Penal",
    subjectId: SUBJECT_IDS.direitoPenal,
    lessons: [
      { title: "Teoria geral do crime", durationMinutes: 40 },
      { title: "Crimes contra a pessoa", durationMinutes: 35 },
      { title: "Crimes contra a administração pública", durationMinutes: 35 },
      { title: "Execução penal — noções gerais", durationMinutes: 40 },
    ],
  },
  {
    slug: "direito-processual-penal",
    title: "Direito Processual Penal",
    subjectId: SUBJECT_IDS.direitoProcessualPenal,
    lessons: [
      { title: "Princípios do processo penal", durationMinutes: 30 },
      { title: "Inquérito policial", durationMinutes: 30 },
      { title: "Prisões e medidas cautelares", durationMinutes: 35 },
      { title: "Execução penal e processo", durationMinutes: 30 },
    ],
  },
  {
    slug: "criminologia",
    title: "Criminologia",
    subjectId: SUBJECT_IDS.criminologia,
    lessons: [
      { title: "Introdução à criminologia", durationMinutes: 25 },
      { title: "Teorias da criminalidade", durationMinutes: 30 },
      { title: "Criminologia e sistema prisional", durationMinutes: 30 },
      { title: "Prevenção e ressocialização", durationMinutes: 25 },
    ],
  },
  {
    slug: "etica-servico-publico",
    title: "Ética no Serviço Público",
    subjectId: SUBJECT_IDS.eticaServicoPublico,
    lessons: [
      { title: "Ética e conduta do agente público", durationMinutes: 25 },
      { title: "Código de ética do servidor", durationMinutes: 25 },
      { title: "Regime disciplinar", durationMinutes: 30 },
      { title: "Responsabilização do agente público", durationMinutes: 25 },
    ],
  },
];

const built = [
  ...buildCourseModules("course-1", COURSE_1_MODULES),
  ...buildCourseModules("course-2", COURSE_2_MODULES),
  ...buildCourseModules("course-3", COURSE_3_MODULES),
];

export const mockModules: ModuleEntity[] = built.map((item) => item.module);
export const mockLessons: LessonEntity[] = built.flatMap((item) => item.lessons);
