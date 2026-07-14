import type { QuestionDifficulty, QuestionEntity } from "@/server/repositories/contracts/question-repository";
import type { QuestionOptionEntity } from "@/server/repositories/contracts/question-option-repository";
import { SUBJECT_IDS } from "./subjects";
import { TOPIC_IDS } from "./topics";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — banco de questões (Fase 10 —
 * agente `simulations`). 36 questões (≥30 exigido), 4 alternativas cada (144 no total),
 * distribuídas entre 8 matérias/16 assuntos, 4 bancas e as 3 dificuldades.
 *
 * `buildQuestions` só monta os objetos a partir de um seed compacto (mesmo padrão de
 * `modules.ts#buildModule`) — nenhuma regra de negócio aqui. `correctLabel` é a ÚNICA fonte
 * da resposta certa; nunca duplicar esse dado em outro lugar do domínio.
 */

const BOARDS = ["CESPE/CEBRASPE", "FGV", "VUNESP", "IBFC"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;
type OptionLabel = (typeof OPTION_LABELS)[number];

interface QuestionSeed {
  id: string;
  statement: string;
  subjectId: string;
  topicId: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  correctLabel: OptionLabel;
  options: readonly [string, string, string, string];
}

const QUESTION_SEEDS: QuestionSeed[] = [
  // Língua Portuguesa (5)
  {
    id: "question-portugues-01",
    statement:
      "Em um texto dissertativo-argumentativo, o uso predominante de conjunções como 'porém', 'contudo' e 'todavia' indica principalmente:",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.interpretacaoTexto,
    difficulty: "EASY",
    explanation: "Essas conjunções são adversativas e introduzem ideias de contraste/oposição entre orações.",
    correctLabel: "B",
    options: [
      "Adição de ideias semelhantes.",
      "Contraste ou oposição entre ideias.",
      "Relação de causa e consequência.",
      "Conclusão do raciocínio anterior.",
    ],
  },
  {
    id: "question-portugues-02",
    statement: "Assinale a alternativa em que a concordância verbal está de acordo com a norma-padrão.",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.gramaticaNormativa,
    difficulty: "MEDIUM",
    explanation:
      "Com sujeito composto posposto ao verbo, a concordância pode ser feita com o núcleo mais próximo ou no plural; a alternativa correta segue a regra de concordância com o elemento mais próximo.",
    correctLabel: "A",
    options: [
      "Chegou os candidatos e o fiscal para o início da prova.",
      "Chegaram o candidato e a fiscal para o início da prova, mas atrasado.",
      "Fazem dois anos que o edital foi publicado.",
      "Haviam muitos candidatos na fila de inscrição.",
    ],
  },
  {
    id: "question-portugues-03",
    statement:
      "No trecho 'O policial, cuja missão era proteger a comunidade, agiu com serenidade', o pronome relativo 'cuja' estabelece relação de:",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.gramaticaNormativa,
    difficulty: "HARD",
    explanation: "'Cuja' é pronome relativo possessivo e concorda em gênero/número com o substantivo que o segue ('missão').",
    correctLabel: "C",
    options: [
      "Causa entre o policial e a missão.",
      "Comparação entre o policial e a comunidade.",
      "Posse entre o policial e a missão.",
      "Finalidade da ação policial.",
    ],
  },
  {
    id: "question-portugues-04",
    statement: "Qual das alternativas apresenta um exemplo de coesão referencial por substituição pronominal?",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.interpretacaoTexto,
    difficulty: "MEDIUM",
    explanation: "A substituição de um termo por um pronome que retoma o referente é coesão referencial.",
    correctLabel: "D",
    options: [
      "Repetição do mesmo substantivo em orações seguidas.",
      "Uso de sinônimos para evitar repetição.",
      "Uso de conectivos para ligar duas ideias.",
      "Substituição de 'os agentes' por 'eles' na oração seguinte.",
    ],
  },
  {
    id: "question-portugues-05",
    statement: "Assinale a alternativa em que todas as palavras estão acentuadas corretamente segundo a norma vigente.",
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.gramaticaNormativa,
    difficulty: "EASY",
    explanation: "'Polícia', 'júri' e 'ítem' seguem regras de acentuação de proparoxítonas/paroxítonas, exceto 'ítem', que é grafado 'item' (paroxítona terminada em 'm', sem acento).",
    correctLabel: "A",
    options: [
      "Polícia, júri, item.",
      "Policia, juri, ítem.",
      "Polícia, juri, item.",
      "Policía, júri, itém.",
    ],
  },

  // Matemática (4)
  {
    id: "question-matematica-01",
    statement: "Um concurso teve 4.000 inscritos, dos quais 15% foram eliminados na prova objetiva. Quantos candidatos permaneceram?",
    subjectId: SUBJECT_IDS.matematica,
    topicId: TOPIC_IDS.operacoesPorcentagem,
    difficulty: "EASY",
    explanation: "15% de 4.000 = 600 eliminados; 4.000 - 600 = 3.400 permaneceram.",
    correctLabel: "C",
    options: ["3.000", "3.200", "3.400", "3.600"],
  },
  {
    id: "question-matematica-02",
    statement: "Se um recruta corre 2,5 km em 15 minutos, mantendo o mesmo ritmo, quantos km ele percorrerá em 42 minutos?",
    subjectId: SUBJECT_IDS.matematica,
    topicId: TOPIC_IDS.resolucaoProblemas,
    difficulty: "MEDIUM",
    explanation: "Regra de três simples: 2,5/15 = x/42 → x = 7 km.",
    correctLabel: "B",
    options: ["6,3 km", "7,0 km", "7,5 km", "8,4 km"],
  },
  {
    id: "question-matematica-03",
    statement:
      "Uma equipe de 6 policiais conclui uma vistoria em 8 horas. Mantida a mesma produtividade individual, quantas horas levariam 4 policiais para concluir a mesma vistoria?",
    subjectId: SUBJECT_IDS.matematica,
    topicId: TOPIC_IDS.resolucaoProblemas,
    difficulty: "HARD",
    explanation: "Regra de três inversa: 6 × 8 = 4 × x → x = 12 horas.",
    correctLabel: "D",
    options: ["8 horas", "9 horas", "10 horas", "12 horas"],
  },
  {
    id: "question-matematica-04",
    statement: "O valor de 20% de 20% de 500 é:",
    subjectId: SUBJECT_IDS.matematica,
    topicId: TOPIC_IDS.operacoesPorcentagem,
    difficulty: "EASY",
    explanation: "20% de 500 = 100; 20% de 100 = 20.",
    correctLabel: "A",
    options: ["20", "25", "40", "100"],
  },

  // Raciocínio Lógico (4)
  {
    id: "question-raciocinio-01",
    statement: "Se a proposição 'Se chove, então a rua fica molhada' é verdadeira, qual afirmação é logicamente equivalente a ela?",
    subjectId: SUBJECT_IDS.raciocinioLogico,
    topicId: TOPIC_IDS.logicaProposicional,
    difficulty: "MEDIUM",
    explanation: "A contrapositiva ('se a rua não está molhada, não choveu') é logicamente equivalente ao condicional original.",
    correctLabel: "C",
    options: [
      "Se a rua fica molhada, então chove.",
      "Se não chove, a rua não fica molhada.",
      "Se a rua não está molhada, então não choveu.",
      "Chove e a rua não fica molhada.",
    ],
  },
  {
    id: "question-raciocinio-02",
    statement: "Qual é o próximo número da sequência: 2, 6, 12, 20, 30, ...?",
    subjectId: SUBJECT_IDS.raciocinioLogico,
    topicId: TOPIC_IDS.sequenciasPadroes,
    difficulty: "EASY",
    explanation: "Os termos são n(n+1): 1·2, 2·3, 3·4, 4·5, 5·6, 6·7 = 42.",
    correctLabel: "B",
    options: ["36", "42", "40", "44"],
  },
  {
    id: "question-raciocinio-03",
    statement:
      "Considere a negação da proposição 'Todos os candidatos aprovados fizeram o curso preparatório'. Essa negação é corretamente expressa por:",
    subjectId: SUBJECT_IDS.raciocinioLogico,
    topicId: TOPIC_IDS.logicaProposicional,
    difficulty: "HARD",
    explanation: "A negação de um quantificador universal ('todos') é um existencial com a proposição negada ('existe pelo menos um que não').",
    correctLabel: "A",
    options: [
      "Existe pelo menos um candidato aprovado que não fez o curso preparatório.",
      "Nenhum candidato aprovado fez o curso preparatório.",
      "Todos os candidatos não aprovados fizeram o curso preparatório.",
      "Existe um candidato que fez o curso e não foi aprovado.",
    ],
  },
  {
    id: "question-raciocinio-04",
    statement: "Em uma fila, Ana está na frente de Bruno, e Bruno está na frente de Carla. Se Diego está atrás de Carla, quem está no início da fila?",
    subjectId: SUBJECT_IDS.raciocinioLogico,
    topicId: TOPIC_IDS.sequenciasPadroes,
    difficulty: "EASY",
    explanation: "A ordem é Ana, Bruno, Carla, Diego — Ana está no início.",
    correctLabel: "A",
    options: ["Ana", "Bruno", "Carla", "Diego"],
  },

  // Informática (4)
  {
    id: "question-informatica-01",
    statement: "Qual das opções a seguir é um exemplo de autenticação de dois fatores (2FA)?",
    subjectId: SUBJECT_IDS.informatica,
    topicId: TOPIC_IDS.segurancaInformacao,
    difficulty: "EASY",
    explanation: "2FA combina algo que o usuário sabe (senha) com algo que ele possui (código enviado ao celular).",
    correctLabel: "D",
    options: [
      "Usar apenas uma senha forte.",
      "Trocar a senha periodicamente.",
      "Usar a mesma senha em vários sistemas.",
      "Senha mais código enviado por SMS ao celular.",
    ],
  },
  {
    id: "question-informatica-02",
    statement: "No contexto de sistemas operacionais, o que é um 'processo' em execução?",
    subjectId: SUBJECT_IDS.informatica,
    topicId: TOPIC_IDS.conceitosBasicosInformatica,
    difficulty: "MEDIUM",
    explanation: "Um processo é uma instância de um programa em execução, com seu próprio espaço de memória.",
    correctLabel: "B",
    options: [
      "Um arquivo armazenado permanentemente no disco.",
      "Uma instância de um programa em execução.",
      "Um tipo de vírus de computador.",
      "Uma pasta do sistema de arquivos.",
    ],
  },
  {
    id: "question-informatica-03",
    statement: "Um ataque de 'phishing' tem como principal característica:",
    subjectId: SUBJECT_IDS.informatica,
    topicId: TOPIC_IDS.segurancaInformacao,
    difficulty: "MEDIUM",
    explanation: "Phishing busca enganar a vítima para que ela forneça dados sigilosos, geralmente via mensagens/e-mails falsos.",
    correctLabel: "A",
    options: [
      "Enganar a vítima para obter dados sigilosos por meio de mensagens falsas.",
      "Sobrecarregar um servidor com requisições simultâneas.",
      "Criptografar arquivos e exigir resgate.",
      "Explorar falha de hardware para acesso físico.",
    ],
  },
  {
    id: "question-informatica-04",
    statement: "Qual extensão de arquivo é tipicamente associada a documentos de planilha eletrônica?",
    subjectId: SUBJECT_IDS.informatica,
    topicId: TOPIC_IDS.conceitosBasicosInformatica,
    difficulty: "EASY",
    explanation: "'.xlsx' é a extensão padrão de planilhas do Microsoft Excel.",
    correctLabel: "C",
    options: [".docx", ".pdf", ".xlsx", ".mp4"],
  },

  // Direito Constitucional (5)
  {
    id: "question-constitucional-01",
    statement: "Segundo a Constituição Federal, a segurança pública é dever do Estado, direito e responsabilidade:",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.direitosFundamentais,
    difficulty: "EASY",
    explanation: "Art. 144, CF: a segurança pública é dever do Estado, direito e responsabilidade de todos.",
    correctLabel: "B",
    options: [
      "Exclusiva das forças policiais.",
      "De todos, exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio.",
      "Exclusiva do Poder Executivo federal.",
      "Restrita aos órgãos de inteligência.",
    ],
  },
  {
    id: "question-constitucional-02",
    statement: "É correto afirmar que os direitos e garantias fundamentais previstos na Constituição:",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.direitosFundamentais,
    difficulty: "MEDIUM",
    explanation: "O rol do art. 5º é reconhecido pela doutrina/jurisprudência como não exaustivo (§2º do art. 5º).",
    correctLabel: "A",
    options: [
      "Não são exaustivos, admitindo-se direitos decorrentes de tratados e princípios adotados.",
      "Estão limitados exclusivamente ao rol do art. 5º.",
      "Podem ser suprimidos por lei ordinária a qualquer tempo.",
      "Aplicam-se apenas a cidadãos brasileiros natos.",
    ],
  },
  {
    id: "question-constitucional-03",
    statement: "A forma de Estado adotada pelo Brasil, com repartição de competências entre entes federativos, é denominada:",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.organizacaoEstado,
    difficulty: "EASY",
    explanation: "O Brasil adota a Federação, com autonomia entre União, Estados, Distrito Federal e Municípios.",
    correctLabel: "C",
    options: ["Estado unitário", "Confederação", "Federação", "Estado regional"],
  },
  {
    id: "question-constitucional-04",
    statement: "Sobre o princípio da dignidade da pessoa humana na atuação das forças de segurança, é correto dizer que:",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.direitosFundamentais,
    difficulty: "HARD",
    explanation: "A dignidade da pessoa humana é fundamento da República (art. 1º, III) e vincula toda atuação estatal, inclusive policial, limitando o uso da força ao estritamente necessário.",
    correctLabel: "D",
    options: [
      "É um princípio meramente programático, sem efeito prático.",
      "Aplica-se apenas às relações entre particulares.",
      "Autoriza o uso de força ilimitada em situações de emergência.",
      "É fundamento da República e limita o uso da força ao necessário e proporcional.",
    ],
  },
  {
    id: "question-constitucional-05",
    statement: "Compete a qual ente federativo organizar e manter a polícia civil e a polícia militar, segundo a Constituição?",
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.organizacaoEstado,
    difficulty: "MEDIUM",
    explanation: "Art. 144, §6º, CF: as polícias civis e militares são organizadas e mantidas pelos Estados (e DF).",
    correctLabel: "B",
    options: ["União", "Estados e Distrito Federal", "Municípios", "Somente a União, por delegação"],
  },

  // Direito Administrativo (4)
  {
    id: "question-administrativo-01",
    statement: "São atributos do ato administrativo, EXCETO:",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.atosAdministrativos,
    difficulty: "MEDIUM",
    explanation: "Presunção de legitimidade, autoexecutoriedade e imperatividade são atributos clássicos; 'irrevogabilidade absoluta' não é atributo — atos podem ser revogados por conveniência/oportunidade.",
    correctLabel: "D",
    options: ["Presunção de legitimidade", "Autoexecutoriedade", "Imperatividade", "Irrevogabilidade absoluta"],
  },
  {
    id: "question-administrativo-02",
    statement: "O poder de polícia da Administração Pública tem como finalidade principal:",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.poderesAdministrativos,
    difficulty: "EASY",
    explanation: "O poder de polícia condiciona/restringe direitos individuais em prol do interesse público.",
    correctLabel: "A",
    options: [
      "Condicionar e restringir o exercício de direitos individuais em prol do interesse coletivo.",
      "Punir servidores públicos por faltas disciplinares.",
      "Organizar internamente os órgãos da Administração.",
      "Delegar competências legislativas ao Executivo.",
    ],
  },
  {
    id: "question-administrativo-03",
    statement: "Um ato administrativo praticado com desvio de finalidade é considerado:",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.atosAdministrativos,
    difficulty: "HARD",
    explanation: "Desvio de finalidade é vício quanto ao elemento 'finalidade', tornando o ato ilegal (anulável), não apenas inconveniente.",
    correctLabel: "C",
    options: [
      "Válido, pois a Administração tem discricionariedade plena.",
      "Inexistente, por ausência de forma.",
      "Ilegal, por vício de finalidade, sujeito a anulação.",
      "Irrevogável, por ser ato vinculado.",
    ],
  },
  {
    id: "question-administrativo-04",
    statement: "O poder hierárquico permite à Administração Pública, entre outras coisas:",
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.poderesAdministrativos,
    difficulty: "MEDIUM",
    explanation: "O poder hierárquico permite ordenar, coordenar, controlar e corrigir as atividades dos órgãos subordinados.",
    correctLabel: "B",
    options: [
      "Punir particulares que descumprem contratos administrativos.",
      "Ordenar, fiscalizar e corrigir a atuação de órgãos e agentes subordinados.",
      "Editar leis em sentido estrito.",
      "Anular decisões do Poder Judiciário.",
    ],
  },

  // Direito Penal (5)
  {
    id: "question-penal-01",
    statement: "Para que um fato seja considerado crime, segundo a teoria tripartida, ele deve ser:",
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.teoriaDoCrime,
    difficulty: "MEDIUM",
    explanation: "A teoria tripartida exige fato típico, ilícito (antijurídico) e culpável.",
    correctLabel: "A",
    options: [
      "Típico, ilícito e culpável.",
      "Apenas típico.",
      "Típico e punível, independentemente de ilicitude.",
      "Ilícito e culpável, independentemente de tipicidade.",
    ],
  },
  {
    id: "question-penal-02",
    statement: "O crime que se consuma com a mera conduta, independentemente do resultado naturalístico, é denominado:",
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.teoriaDoCrime,
    difficulty: "HARD",
    explanation: "Crime de mera conduta é aquele em que a lei não exige resultado naturalístico para a consumação.",
    correctLabel: "C",
    options: ["Crime material", "Crime omissivo impróprio", "Crime de mera conduta", "Crime culposo"],
  },
  {
    id: "question-penal-03",
    statement: "O crime de furto, previsto no Código Penal, tem como principal bem jurídico protegido:",
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.crimesEmEspecie,
    difficulty: "EASY",
    explanation: "O furto tutela o patrimônio (posse/propriedade de coisa alheia móvel).",
    correctLabel: "D",
    options: ["A vida", "A liberdade individual", "A administração pública", "O patrimônio"],
  },
  {
    id: "question-penal-04",
    statement: "A diferença essencial entre furto e roubo está em que o roubo é praticado mediante:",
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.crimesEmEspecie,
    difficulty: "MEDIUM",
    explanation: "O roubo exige violência/grave ameaça ou outro meio que reduza a capacidade de resistência da vítima; o furto não.",
    correctLabel: "B",
    options: [
      "Fraude contra a vítima.",
      "Violência ou grave ameaça à pessoa.",
      "Abuso de confiança.",
      "Uso de documento falso.",
    ],
  },
  {
    id: "question-penal-05",
    statement: "Age em legítima defesa quem, usando moderadamente os meios necessários, repele:",
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.teoriaDoCrime,
    difficulty: "EASY",
    explanation: "Legítima defesa (art. 25, CP): repelir injusta agressão, atual ou iminente, a direito próprio ou de outrem.",
    correctLabel: "A",
    options: [
      "Injusta agressão atual ou iminente a direito próprio ou de outrem.",
      "Qualquer agressão passada, mesmo já cessada.",
      "Ordem legítima de superior hierárquico.",
      "Ameaça hipotética e futura.",
    ],
  },

  // Direitos Humanos (5)
  {
    id: "question-direitos-humanos-01",
    statement: "A Declaração Universal dos Direitos Humanos (1948) tem como principal característica:",
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.fundamentosDireitosHumanos,
    difficulty: "EASY",
    explanation: "A Declaração de 1948 consagra a universalidade e indivisibilidade dos direitos humanos.",
    correctLabel: "C",
    options: [
      "Ter força de tratado vinculante com sanções automáticas.",
      "Aplicar-se apenas aos países signatários da ONU.",
      "Consagrar a universalidade e indivisibilidade dos direitos humanos.",
      "Restringir-se a direitos civis, excluindo direitos sociais.",
    ],
  },
  {
    id: "question-direitos-humanos-02",
    statement: "No uso da força por agentes de segurança pública, o princípio da proporcionalidade exige que:",
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.atuacaoPolicialDireitosHumanos,
    difficulty: "MEDIUM",
    explanation: "A força empregada deve ser proporcional à ameaça enfrentada, na medida estritamente necessária.",
    correctLabel: "D",
    options: [
      "A força máxima seja sempre utilizada preventivamente.",
      "Armas de fogo sejam o primeiro recurso em qualquer abordagem.",
      "A proporcionalidade seja avaliada apenas após o incidente.",
      "A força empregada seja proporcional à ameaça e limitada ao necessário.",
    ],
  },
  {
    id: "question-direitos-humanos-03",
    statement: "Os grupos vulneráveis, no contexto de abordagem policial, exigem atenção especial porque:",
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.atuacaoPolicialDireitosHumanos,
    difficulty: "MEDIUM",
    explanation: "Grupos vulneráveis (crianças, idosos, pessoas com deficiência etc.) demandam abordagem diferenciada para evitar violações de direitos.",
    correctLabel: "A",
    options: [
      "Estão mais sujeitos a violações de direitos e demandam abordagem diferenciada.",
      "Têm menos direitos garantidos constitucionalmente.",
      "Não podem ser abordados em nenhuma hipótese.",
      "Possuem foro privilegiado automático.",
    ],
  },
  {
    id: "question-direitos-humanos-04",
    statement: "A tortura, segundo tratados internacionais de direitos humanos ratificados pelo Brasil, é:",
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.fundamentosDireitosHumanos,
    difficulty: "EASY",
    explanation: "A tortura é absolutamente proibida, sem exceções, mesmo em estado de guerra ou emergência.",
    correctLabel: "B",
    options: [
      "Permitida em situações excepcionais de guerra.",
      "Absolutamente vedada, sem exceções.",
      "Permitida mediante autorização judicial.",
      "Regulada apenas por legislação interna, sem previsão internacional.",
    ],
  },
  {
    id: "question-direitos-humanos-05",
    statement: "O uso de câmeras corporais (bodycams) por policiais é apontado por especialistas como medida que principalmente:",
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.atuacaoPolicialDireitosHumanos,
    difficulty: "HARD",
    explanation: "Bodycams aumentam a transparência e a accountability das abordagens, subsidiando apuração de condutas.",
    correctLabel: "C",
    options: [
      "Substitui integralmente o treinamento em direitos humanos.",
      "Elimina totalmente a necessidade de investigação de condutas.",
      "Aumenta a transparência e a responsabilização (accountability) das abordagens.",
      "É proibida pela legislação de proteção de dados.",
    ],
  },
];

function buildQuestions(): { questions: QuestionEntity[]; options: QuestionOptionEntity[] } {
  const questions: QuestionEntity[] = [];
  const options: QuestionOptionEntity[] = [];

  QUESTION_SEEDS.forEach((seed, index) => {
    questions.push({
      id: seed.id,
      statement: seed.statement,
      subjectId: seed.subjectId,
      topicId: seed.topicId,
      board: BOARDS[index % BOARDS.length]!,
      difficulty: seed.difficulty,
      explanation: seed.explanation,
      status: "PUBLISHED",
      createdAt: "2026-01-10T00:00:00.000Z",
    });

    seed.options.forEach((text, optionIndex) => {
      const label = OPTION_LABELS[optionIndex]!;
      options.push({
        id: `${seed.id}-opt-${label}`,
        questionId: seed.id,
        label,
        text,
        isCorrect: label === seed.correctLabel,
        order: optionIndex + 1,
      });
    });
  });

  return { questions, options };
}

const built = buildQuestions();
export const mockQuestions: QuestionEntity[] = built.questions;
export const mockQuestionOptions: QuestionOptionEntity[] = built.options;
