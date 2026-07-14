import type { TopicEntity } from "@/server/repositories/contracts/topic-repository";
import { SUBJECT_IDS } from "./subjects";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23). Assuntos (Fase 10 — agente
 * `simulations`) usados para o filtro "assunto" e para exibir o assunto de uma questão.
 * Apenas as matérias efetivamente cobertas pelo banco de questões mock (`./questions.ts`)
 * têm assuntos aqui — as demais matérias do catálogo (`subjects.ts`) seguem sem questões
 * nesta fase.
 */
export const TOPIC_IDS = {
  interpretacaoTexto: "topic-interpretacao-texto",
  gramaticaNormativa: "topic-gramatica-normativa",
  operacoesPorcentagem: "topic-operacoes-porcentagem",
  resolucaoProblemas: "topic-resolucao-problemas",
  logicaProposicional: "topic-logica-proposicional",
  sequenciasPadroes: "topic-sequencias-padroes",
  conceitosBasicosInformatica: "topic-conceitos-basicos-informatica",
  segurancaInformacao: "topic-seguranca-informacao",
  direitosFundamentais: "topic-direitos-fundamentais",
  organizacaoEstado: "topic-organizacao-estado",
  atosAdministrativos: "topic-atos-administrativos",
  poderesAdministrativos: "topic-poderes-administrativos",
  teoriaDoCrime: "topic-teoria-do-crime",
  crimesEmEspecie: "topic-crimes-em-especie",
  fundamentosDireitosHumanos: "topic-fundamentos-direitos-humanos",
  atuacaoPolicialDireitosHumanos: "topic-atuacao-policial-direitos-humanos",
} as const;

/** Seed compacto (id/subjectId/name) — `deletedAt` (Fase 17) é aplicado uniformemente abaixo. */
const TOPIC_SEEDS: ReadonlyArray<Pick<TopicEntity, "id" | "subjectId" | "name">> = [
  { id: TOPIC_IDS.interpretacaoTexto, subjectId: SUBJECT_IDS.linguaPortuguesa, name: "Interpretação de Texto" },
  { id: TOPIC_IDS.gramaticaNormativa, subjectId: SUBJECT_IDS.linguaPortuguesa, name: "Gramática Normativa" },
  { id: TOPIC_IDS.operacoesPorcentagem, subjectId: SUBJECT_IDS.matematica, name: "Operações e Porcentagem" },
  { id: TOPIC_IDS.resolucaoProblemas, subjectId: SUBJECT_IDS.matematica, name: "Resolução de Problemas" },
  { id: TOPIC_IDS.logicaProposicional, subjectId: SUBJECT_IDS.raciocinioLogico, name: "Lógica Proposicional" },
  { id: TOPIC_IDS.sequenciasPadroes, subjectId: SUBJECT_IDS.raciocinioLogico, name: "Sequências e Padrões" },
  {
    id: TOPIC_IDS.conceitosBasicosInformatica,
    subjectId: SUBJECT_IDS.informatica,
    name: "Conceitos Básicos",
  },
  { id: TOPIC_IDS.segurancaInformacao, subjectId: SUBJECT_IDS.informatica, name: "Segurança da Informação" },
  {
    id: TOPIC_IDS.direitosFundamentais,
    subjectId: SUBJECT_IDS.direitoConstitucional,
    name: "Direitos Fundamentais",
  },
  {
    id: TOPIC_IDS.organizacaoEstado,
    subjectId: SUBJECT_IDS.direitoConstitucional,
    name: "Organização do Estado",
  },
  {
    id: TOPIC_IDS.atosAdministrativos,
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    name: "Atos Administrativos",
  },
  {
    id: TOPIC_IDS.poderesAdministrativos,
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    name: "Poderes Administrativos",
  },
  { id: TOPIC_IDS.teoriaDoCrime, subjectId: SUBJECT_IDS.direitoPenal, name: "Teoria do Crime" },
  { id: TOPIC_IDS.crimesEmEspecie, subjectId: SUBJECT_IDS.direitoPenal, name: "Crimes em Espécie" },
  {
    id: TOPIC_IDS.fundamentosDireitosHumanos,
    subjectId: SUBJECT_IDS.direitosHumanos,
    name: "Fundamentos dos Direitos Humanos",
  },
  {
    id: TOPIC_IDS.atuacaoPolicialDireitosHumanos,
    subjectId: SUBJECT_IDS.direitosHumanos,
    name: "Atuação Policial e Direitos Humanos",
  },
];

export const mockTopics: TopicEntity[] = TOPIC_SEEDS.map((seed) => ({ ...seed, deletedAt: null }));
