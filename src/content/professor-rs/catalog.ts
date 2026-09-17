import { bmAmendment, foundationLessons } from "./lessons";
import { validatePack, type CoursePack, type ProfessorSource } from "./schema";

const checkedAt = "2026-09-13";
const source = (
  title: string,
  url: string,
  kind: ProfessorSource["kind"] = "portal",
  note = "Consultar atos e retificações nesta fonte oficial; não pressupõe inscrições abertas.",
): ProfessorSource => ({ title, url, kind, checkedAt, verified: true, note });
export const officialSources = {
  pm: source(
    "Brigada Militar — Soldado 2025",
    "https://www.brigadamilitar.rs.gov.br/concurso-publico-para-o-cargo-de-militar-estadual-na-graduacao-de-soldado-de-primeira-classe",
  ),
  cbm: source("CBMRS — Soldado 2025", "https://bombeiros.rs.gov.br/soldado-bombeiro-militar-2025"),
  pc: source(
    "Polícia Civil — Escrivão e Inspetor 2025",
    "https://www4.pc.rs.gov.br/concurso-publico-para-escrivao-e-inspetor-2025",
  ),
  pp: source(
    "Polícia Penal — Concurso 2026 e normativas",
    "https://policiapenal.rs.gov.br/concursos-6a07201952b85",
  ),
  poa: source(
    "Porto Alegre — Edital 103/2024, Guarda Municipal",
    "https://www2.portoalegre.rs.gov.br/dopa/ver_conteudo.php?protocolo=505887",
    "edital",
  ),
  canoas: source(
    "Canoas — Guarda Municipal, Edital 131/2023",
    "https://www.canoas.rs.gov.br/wp-content/uploads/2023/05/Guarda-Municipal.pdf",
    "edital",
    "Edital histórico de 2023 para referência; não comprova novo concurso ou inscrições vigentes.",
  ),
};
const base = [
  "interpretacao",
  "concordancia",
  "crase",
  "porcentagem",
  "logica",
  "informatica",
  "constitucional",
  "administrativo",
  "penal",
  "humanos",
];
type Definition = {
  slug: string;
  title: string;
  career: CoursePack["career"];
  jurisdiction: string;
  role: string;
  examLabel: string;
  sources: ProfessorSource[];
  lessons: string[];
  remaining: [string, string, string][];
};
const definitions: Definition[] = [
  {
    slug: "brigada-militar-rs",
    title: "Brigada Militar RS — Soldado",
    career: "PM",
    jurisdiction: "Rio Grande do Sul",
    role: "Soldado de primeira classe",
    examLabel: "SD-P 01/2025 — referência",
    sources: [
      officialSources.pm,
      foundationLessons.find((l) => l.id === "interpretacao")!.resources[0]!,
      bmAmendment,
    ],
    lessons: [...base, "intencao-comunicativa", "variacao-linguistica"],
    remaining: [
      [
        "legislacao-militar",
        "Legislação Específica",
        "Estatuto dos militares, organização e legislação indicada no Anexo I",
      ],
      [
        "conhecimentos-gerais",
        "Conhecimentos Gerais",
        "História, geografia e atualidades conforme programa",
      ],
      ["direitos-programa", "Direitos Humanos", "Tratados e demais itens do programa oficial"],
      [
        "portugues-programa",
        "Língua Portuguesa",
        "Ortografia, morfologia, sintaxe, pontuação, semântica e demais itens",
      ],
      [
        "matematica-programa",
        "Matemática e Raciocínio Lógico",
        "Demais itens do programa e exercícios de aprofundamento",
      ],
    ],
  },
  {
    slug: "bombeiros-rs",
    title: "Bombeiros RS — Soldado",
    career: "BOMBEIROS",
    jurisdiction: "Rio Grande do Sul",
    role: "Soldado bombeiro militar",
    examLabel: "DA/DRH 01/2025 — referência",
    sources: [officialSources.cbm, foundationLessons.find((l) => l.id === "fisica")!.resources[0]!],
    lessons: [...base, "fisica", "quimica", "biologia"],
    remaining: [
      [
        "legislacao-bombeiros",
        "Legislação Específica",
        "Legislação estadual e institucional do Anexo II",
      ],
      [
        "gerais-bombeiros",
        "Conhecimentos Gerais",
        "Demais conteúdos gerais e história/geografia previstos no edital",
      ],
      [
        "ciencias-programa",
        "Ciências Naturais",
        "Química, física e biologia: demais itens do programa",
      ],
      ["portugues-programa", "Língua Portuguesa", "Demais itens de língua portuguesa do programa"],
      [
        "matematica-programa",
        "Matemática e Raciocínio Lógico",
        "Demais itens de matemática e raciocínio lógico",
      ],
    ],
  },
  {
    slug: "policia-civil-rs",
    title: "Polícia Civil RS — Escrivão e Inspetor",
    career: "PC",
    jurisdiction: "Rio Grande do Sul",
    role: "Escrivão e Inspetor de Polícia",
    examLabel: "06/2025 — referência",
    sources: [
      officialSources.pc,
      foundationLessons.find((l) => l.id === "estatistica")!.resources[0]!,
    ],
    lessons: [
      ...base,
      "processual",
      "estatistica",
      "contabilidade",
      "redacao",
      "logica-demorgan",
      "logica-quantificadores",
      "estatistica-frequencias",
      "estatistica-dispersao",
      "probabilidade-eventos",
      "probabilidade-condicional",
    ],
    remaining: [
      ["estatutaria-pc", "Legislação Estatutária", "Estatuto e regime jurídico do cargo"],
      [
        "contabilidade-programa",
        "Contabilidade Geral",
        "Escrituração, demonstrações e demais itens do programa",
      ],
      [
        "estatistica-posicao",
        "Estatística",
        "Médias geométrica e harmônica, moda, percentis, quartis e dados agrupados",
      ],
      [
        "estatistica-variaveis",
        "Estatística",
        "Variáveis aleatórias, funções de distribuição, esperança e momentos",
      ],
      ["estatistica-discretas", "Estatística", "Distribuições binomial, Poisson e hipergeométrica"],
      [
        "estatistica-continuas",
        "Estatística",
        "Distribuições uniforme, normal, exponencial, t, F e qui-quadrado",
      ],
      [
        "estatistica-amostragem",
        "Estatística",
        "Amostragem e distribuições amostrais de médias e proporções",
      ],
      [
        "estatistica-estimacao",
        "Estatística",
        "Estimação, intervalos de confiança e tamanho de amostra",
      ],
      [
        "estatistica-testes",
        "Estatística",
        "Testes de hipóteses, erros, significância e comparações entre populações",
      ],
      [
        "estatistica-regressao",
        "Estatística",
        "Covariância, correlação e regressão simples e múltipla",
      ],
      [
        "estatistica-indices",
        "Estatística",
        "Números índices, Laspeyres, Paasche e mudança de base",
      ],
      [
        "estatistica-series",
        "Estatística",
        "Séries temporais, estacionariedade, ARIMA e Box-Jenkins",
      ],
      [
        "logica-argumentos",
        "Matemática e Raciocínio Lógico",
        "Diagramas, argumentos categóricos, dedução e relações entre elementos",
      ],
      [
        "informatica-programa",
        "Informática",
        "Tecnologias, investigação digital e demais itens do programa",
      ],
      ["direito-programa", "Direito", "Desdobrar todos os itens jurídicos dos anexos em aulas"],
      [
        "portugues-programa",
        "Língua Portuguesa",
        "Gramática e interpretação: cobertura integral do programa",
      ],
    ],
  },
  {
    slug: "policia-penal-rs",
    title: "Polícia Penal RS — Policial Penal",
    career: "PP",
    jurisdiction: "Rio Grande do Sul",
    role: "Policial Penal",
    examLabel: "01/2026 — portal oficial localizado",
    sources: [
      officialSources.pp,
      source(
        "FUNDATEC — Polícia Penal, concurso 1092",
        "https://www.fundatec.org.br/portal/concursos/index_concursos.php?concurso=1092",
        "portal",
        "Destino vinculado pelo portal oficial. Extração do edital ainda pendente.",
      ),
    ],
    lessons: [...base, "processual", "execucao"],
    remaining: [
      [
        "estatuto-pp",
        "Legislação Estatutária",
        "LC RS 16.449/2025 e regime jurídico conforme edital",
      ],
      [
        "programa-pp",
        "Programa oficial",
        "Extrair e conferir integralmente o anexo do cargo Policial Penal 2026",
      ],
      [
        "lep-programa",
        "Execução Penal",
        "Direitos, deveres, disciplina, estabelecimentos e benefícios conforme programa",
      ],
    ],
  },
  {
    slug: "gcm-porto-alegre",
    title: "Guarda Municipal — Porto Alegre",
    career: "GCM",
    jurisdiction: "Porto Alegre / RS",
    role: "Guarda Municipal",
    examLabel: "CP 794 — Edital 103/2024, referência",
    sources: [
      officialSources.poa,
      source(
        "Prefeitura — publicação do concurso da Guarda",
        "https://prefeitura.poa.br/smseg/noticias/divulgado-o-edital-com-informacoes-do-concurso-para-guarda-municipal",
      ),
    ],
    lessons: [...base, "guardas"],
    remaining: [
      [
        "municipal-poa",
        "Legislação Municipal",
        "Estatuto, plano de carreira e normas de Porto Alegre previstos no edital",
      ],
      [
        "programa-poa",
        "Programa oficial",
        "Conferir e desdobrar integralmente anexos e retificações do CP 794",
      ],
    ],
  },
  {
    slug: "gcm-canoas",
    title: "Guarda Municipal — Canoas",
    career: "GCM",
    jurisdiction: "Canoas / RS",
    role: "Guarda Municipal",
    examLabel: "131/2023 — referência histórica",
    sources: [officialSources.canoas],
    lessons: [...base, "guardas"],
    remaining: [
      [
        "municipal-canoas",
        "Legislação Municipal",
        "Estatuto e legislação da Guarda de Canoas indicados no edital",
      ],
      [
        "programa-canoas",
        "Programa oficial",
        "Localizar eventual edital mais recente e conferir o programa completo",
      ],
    ],
  },
];

export const professorCatalog: CoursePack[] = definitions.map((definition) => {
  const lessons = definition.lessons.map((id) =>
    foundationLessons.find((lesson) => lesson.id === id)!,
  );
  return validatePack({
    schemaVersion: 1,
    slug: definition.slug,
    version: "base-2026-09-14-r3",
    title: definition.title,
    career: definition.career,
    jurisdiction: definition.jurisdiction,
    role: definition.role,
    examLabel: definition.examLabel,
    board: definition.slug === "gcm-canoas" ? "Conferir no edital histórico" : "FUNDATEC",
    checkedAt,
    notice:
      "Biblioteca inicial de fundamentos. O curso integral do edital ainda está em produção; esta trilha não comprova inscrições abertas nem cobertura total do concurso.",
    syllabusVerified: false,
    sources: definition.sources,
    topics: [
      ...lessons.map((lesson) => ({
        id: lesson.id,
        subject: lesson.subject,
        title: lesson.title,
        sourceUrl:
          lesson.resources.find((resource) => resource.kind === "edital")?.url ??
          definition.sources[0]!.url,
      })),
      ...definition.remaining.map(([id, subject, title]) => ({
        id,
        subject,
        title,
        sourceUrl:
          definition.career === "PC" && (subject === "Estatística" || id === "logica-argumentos")
            ? foundationLessons.find((lesson) => lesson.id === "estatistica")!.resources[0]!.url
            : definition.sources[0]!.url,
      })),
    ],
    lessons,
    pending: [
      "Conferir programa detalhado, requisitos, cronograma, TAF e retificações vigentes.",
      "Ampliar o banco de questões e produzir simulados com distribuição e critérios do edital.",
      "Revisar pedagogicamente todas as aulas e indicar livros por edição e videoaulas por assunto.",
    ],
  });
});
