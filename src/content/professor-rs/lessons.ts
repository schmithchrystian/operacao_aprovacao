import { additionalResources } from "./resources";
import quantitativeLessons from "./quantitative.json";
import { lessonSchema } from "./schema";
import type { ProfessorLesson, ProfessorSource } from "./schema";
const date = "2026-09-13";
const law = (title: string, url: string): ProfessorSource => ({
  title,
  url,
  kind: "lei",
  checkedAt: date,
  verified: true,
  note: "Texto oficial; observar a data-limite de atualização fixada no edital.",
});
const cf = law(
  "Constituição Federal — arts. 1º, 5º, 37 e 144",
  "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
);
const cp = law(
  "Código Penal — texto compilado",
  "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
);
const cpp = law(
  "Código de Processo Penal",
  "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm",
);
const lep = law("Lei de Execução Penal", "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm");
const gcm = law(
  "Estatuto Geral das Guardas Municipais",
  "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13022.htm",
);
const pc: ProfessorSource = {
  title: "PC RS — programa do edital de agentes 06/2025",
  url: "https://www.pc.rs.gov.br/upload/arquivos/202510/24083812-edital-de-abertura-agentes-admin-correto.pdf",
  kind: "edital",
  checkedAt: date,
  verified: true,
  note: "Referência do programa; não é livro didático nem prova anterior.",
};
const bm: ProfessorSource = {
  title: "Brigada Militar — edital SD-P 01/2025",
  url: "https://www.brigadamilitar.rs.gov.br/upload/arquivos/202503/21083520-edital-da-dresa-n-sd-p-01-2025.pdf",
  kind: "edital",
  checkedAt: date,
  verified: true,
  note: "Referência de programa; conferir retificações no portal oficial.",
};
const cbm: ProfessorSource = {
  title: "CBMRS — edital de soldado 01/2025",
  url: "https://www.bombeiros.rs.gov.br/upload/arquivos/202508/21130423-973-01-edital-da-drh-n-sd-b-012025-abertura-das-inscricoes-rev-07-final-01.pdf",
  kind: "edital",
  checkedAt: date,
  verified: true,
  note: "Referência para ciências naturais e demais disciplinas.",
};

export const bmAmendment: ProfessorSource = {
  title: "Brigada Militar — retificação SD-P 02/2025",
  url: "https://www.brigadamilitar.rs.gov.br/upload/arquivos/202503/28074607-edital-dadresa-n-sd-p-02-2025-retifica-edtial-de-abertura.pdf",
  kind: "edital",
  checkedAt: date,
  verified: true,
  note: "Item 2 inclui intenção comunicativa e variação linguística. Também altera referências; esta conferência não substitui a revisão dos demais atos.",
};

type Seed = {
  id: string;
  subject: string;
  title: string;
  concept: string;
  method: string;
  example: string;
  summary: [string, string];
  questions: [string, string, string, string, string][];
  source: ProfessorSource;
};
const seeds: Seed[] = [
  {
    id: "intencao-comunicativa",
    subject: "Língua Portuguesa",
    title: "Intenção comunicativa: finalidade, gênero e pistas do texto",
    concept:
      "A intenção comunicativa é a finalidade construída pelo texto em uma situação de comunicação: informar, orientar, convencer, solicitar, advertir ou produzir humor, por exemplo. O assunto responde sobre o que se fala; a finalidade responde para que aquele texto foi produzido. Um comunicado sobre trânsito pode informar uma interdição, enquanto uma campanha sobre o mesmo assunto pode tentar mudar comportamentos. O gênero oferece pistas, mas não determina sozinho a resposta: uma notícia pode incorporar opinião em uma fala citada sem que a finalidade principal de todo o texto deixe de ser informativa. É preciso distinguir a voz do autor, a voz de uma personagem e a fala de uma fonte entrevistada.",
    method:
      "Resolva em quatro passos. Primeiro, identifique quem fala, para quem e em que situação. Segundo, localize marcas como imperativos, dados, justificativas, avaliações e chamadas à ação. Terceiro, formule a finalidade com um verbo e um complemento: orientar o candidato sobre documentos, por exemplo. Quarto, compare essa formulação com as alternativas e com o alcance do comando, que pode perguntar sobre uma frase ou sobre o texto inteiro. Um imperativo pode orientar, convidar ou ordenar; não o interprete automaticamente como autoritarismo. Uma pergunta também pode funcionar como pedido indireto. Não atribua uma intenção psicológica secreta ao autor: sustente a análise em evidências do enunciado.",
    example:
      "Considere: 'O atendimento será encerrado às 17h. Para evitar deslocamentos desnecessários, confira os documentos antes de sair.' A primeira frase comunica um horário. A segunda orienta uma ação e apresenta sua justificativa. Se a pergunta tratar apenas da segunda frase, a finalidade é orientar o leitor a verificar os documentos; se tratar do conjunto, a resposta precisa contemplar a informação e a orientação. A alternativa 'criticar todos os usuários despreparados' acrescenta uma avaliação ausente. Já 'exigir que ninguém compareça' contradiz a possibilidade de atendimento. A palavra evitar não transforma o aviso em proibição.",
    summary: [
      "Assunto e finalidade são perguntas diferentes: sobre o quê e para quê.",
      "Justifique a finalidade com marcas do texto e respeite o trecho solicitado.",
    ],
    questions: [
      [
        "Em 'Antes de comparecer, confira a documentação exigida', qual é a finalidade predominante?",
        "Orientar uma preparação para o atendimento.",
        "Narrar um atendimento já realizado.",
        "O verbo confira solicita uma ação anterior ao comparecimento; não há relato de um fato passado.",
        "Como identificar uma orientação?",
      ],
      [
        "Um aviso e uma campanha abordam trânsito. Isso significa que têm necessariamente a mesma finalidade?",
        "Não; um pode informar e o outro persuadir.",
        "Sim; o assunto determina sempre a finalidade.",
        "O tema pode coincidir sem que a ação pretendida sobre o leitor seja a mesma.",
        "Assunto determina finalidade?",
      ],
      [
        "Um cartaz diz 'Doe livros: sua leitura pode chegar a outras pessoas'. Qual pista sustenta a finalidade persuasiva?",
        "O convite à doação acompanhado de uma razão para agir.",
        "A apresentação neutra de um inventário de livros.",
        "Doe convoca o leitor e a segunda oração apresenta um benefício que procura motivar a ação.",
        "O que sustenta a persuasão?",
      ],
      [
        "Em uma notícia, uma fonte afirma 'o serviço é excelente'. É correto atribuir automaticamente essa avaliação ao jornalista?",
        "Não; é preciso distinguir a fala citada da voz do autor.",
        "Sim; toda fala citada expressa necessariamente a opinião do jornalista.",
        "A atribuição da fala a uma fonte delimita sua autoria; sua presença não prova adesão do jornalista.",
        "Como distinguir vozes?",
      ],
      [
        "Na recepção, 'Você poderia me informar o horário?' funciona principalmente como:",
        "Um pedido de informação formulado de maneira indireta.",
        "Uma avaliação técnica da capacidade intelectual do atendente.",
        "O contexto de atendimento e o objeto da pergunta indicam solicitação de informação, não um teste de capacidade.",
        "Como funciona um pedido indireto?",
      ],
    ],
    source: bmAmendment,
  },
  {
    id: "variacao-linguistica",
    subject: "Língua Portuguesa",
    title: "Variação linguística: usos, registros e adequação",
    concept:
      "Uma língua apresenta variações associadas à região, aos grupos sociais, à época e à situação de uso. A variação regional é chamada diatópica; a social, diastrática; a histórica, diacrônica; e a situacional, diafásica. Essas dimensões podem coexistir. Uma expressão regional não revela, por si só, escolaridade, competência ou caráter do falante. Registro formal e informal descrevem escolhas relacionadas à situação comunicativa. A norma-padrão funciona como referência codificada e pode ser exigida em uma redação de concurso; isso não significa que todos os demais usos sejam desprovidos de regras ou inferiores como formas de comunicação.",
    method:
      "Observe a evidência antes de classificar. Se o enunciado compara palavras usadas em regiões, a pista é geográfica. Se compara documentos de épocas distintas, é temporal. Se a mesma pessoa escreve de modos diferentes para um amigo e para uma instituição, a mudança decorre da situação. Não confunda canal com registro: pode haver fala formal em uma cerimônia e escrita informal em uma conversa digital. Em questões de reescrita, preserve o sentido e adapte vocabulário, tratamento e construção sintática ao contexto solicitado. Em questões gramaticais que exigem norma-padrão, aplique a regra pedida sem transformar a avaliação de uma construção em julgamento sobre o falante.",
    example:
      "Uma candidata envia ao amigo 'Me manda o endereço?' e escreve à organização 'Solicito o envio do endereço do local de prova'. O objetivo básico de obter o endereço permanece, mas o grau de formalidade e a relação com o destinatário mudam. A evidência principal é variação situacional, pois se trata da mesma pessoa adaptando seu uso. Não há informação suficiente para concluir que mudou de região ou de grupo social. Se a questão pedir adequação a um requerimento formal, a segunda formulação atende melhor ao gênero; isso não torna a primeira incapaz de comunicar o pedido na conversa entre amigos.",
    summary: [
      "Região, grupo, época e situação são dimensões de variação que podem se combinar.",
      "Adequação depende do contexto; fala não é sinônimo de informalidade e escrita não é sinônimo de formalidade.",
    ],
    questions: [
      [
        "A mesma pessoa adapta seu vocabulário ao conversar com amigos e ao apresentar um requerimento. Qual dimensão se destaca?",
        "Variação situacional ou diafásica.",
        "Variação histórica ou diacrônica.",
        "O contraste informado é entre situações e destinatários, não entre épocas da língua.",
        "O que é variação situacional?",
      ],
      [
        "Palavras diferentes para um mesmo objeto em localidades distintas exemplificam principalmente:",
        "Variação regional ou diatópica.",
        "Incapacidade de comunicação dos falantes.",
        "A distribuição geográfica de formas linguísticas é uma manifestação da diversidade regional, não prova de incapacidade.",
        "O que é variação regional?",
      ],
      [
        "Uma palestra solene pode apresentar linguagem formal, mesmo sendo oral?",
        "Sim; canal oral e registro formal são compatíveis.",
        "Não; toda produção oral é informal.",
        "A formalidade depende da situação comunicativa e das escolhas de linguagem, não exclusivamente do canal.",
        "Fala pode ser formal?",
      ],
      [
        "O contraste entre formas de tratamento em cartas antigas e mensagens atuais pode evidenciar:",
        "Variação histórica ou diacrônica.",
        "Obrigatoriamente uma diferença entre regiões contemporâneas.",
        "Quando a comparação destaca períodos diferentes, a evidência principal é a mudança ao longo do tempo.",
        "O que é variação histórica?",
      ],
      [
        "Uma prova exige reescrever uma frase conforme a norma-padrão. Qual procedimento é adequado?",
        "Aplicar as regras solicitadas e preservar o sentido, sem julgar a pessoa que usou outra variedade.",
        "Concluir que o falante de outra variedade não conhece nenhuma regra linguística.",
        "A adequação ao padrão pedido é uma tarefa específica; variedades também têm regularidades e não autorizam julgamentos sobre seus usuários.",
        "Como aplicar a norma-padrão?",
      ],
    ],
    source: bmAmendment,
  },
  {
    id: "interpretacao",
    subject: "Língua Portuguesa",
    title: "Interpretação: informação, inferência e extrapolação",
    concept:
      "Uma informação explícita aparece diretamente no texto. Uma inferência resulta da combinação de pistas textuais, sem exigir uma opinião pessoal. Uma extrapolação acrescenta algo que o texto não permite concluir. Na prova, a alternativa pode repetir palavras do enunciado e mesmo assim alterar seu sentido com termos como sempre, apenas e todos.",
    method:
      "Leia primeiro o comando: ele pede a ideia central, uma informação específica ou uma inferência? Marque o trecho que sustenta sua resposta. Compare o alcance das palavras: alguns não significa todos; possibilidade não equivale a certeza. Elimine alternativas que dependam de conhecimento externo quando o comando pedir uma conclusão do texto.",
    example:
      "Texto: 'Após a implantação do agendamento, o tempo médio de espera caiu. Parte dos usuários ainda prefere atendimento presencial.' Pode-se concluir que houve redução da espera e que a preferência presencial não desapareceu. Não se pode concluir que todo usuário foi atendido mais rápido, nem que o agendamento foi a única causa da mudança.",
    summary: [
      "Toda resposta precisa de apoio textual identificável.",
      "Não transforme uma possibilidade ou parte do grupo em regra absoluta.",
    ],
    questions: [
      [
        "O texto afirma: 'Alguns candidatos revisaram a prova'. Qual conclusão é válida?",
        "Uma parte dos candidatos revisou a prova.",
        "Todos revisaram a prova.",
        "A palavra alguns não autoriza concluir que todos praticaram a ação.",
        "Qual erro existe em trocar 'pode ocorrer' por 'ocorre sempre'?",
      ],
      [
        "Trocar 'pode ocorrer' por 'ocorre sempre' preserva o sentido?",
        "Não, transforma possibilidade em afirmação universal.",
        "Sim, as expressões são equivalentes.",
        "Pode indica possibilidade; sempre indica uma frequência universal que não foi afirmada.",
        "O que diferencia possibilidade de certeza?",
      ],
    ],
    source: bm,
  },
  {
    id: "concordancia",
    subject: "Língua Portuguesa",
    title: "Concordância verbal e verbos impessoais",
    concept:
      "Na regra geral, o verbo concorda com o núcleo do sujeito, e não com o substantivo mais próximo. Sujeito é a expressão sobre a qual se declara algo; seu núcleo concentra a função sintática. Verbos impessoais não têm sujeito: haver com sentido de existir e fazer indicando tempo decorrido permanecem no singular.",
    method:
      "Localize o verbo, procure o sujeito e retire mentalmente os termos acessórios. Em 'A análise dos documentos exige cuidado', documentos não é o sujeito de exige. Diferencie haver de existir: 'Havia vagas', mas 'Existiam vagas'. Em locução verbal impessoal, a impessoalidade alcança o auxiliar: 'Deve haver vagas'.",
    example:
      "Na frase 'Os resultados da avaliação foram publicados', o núcleo resultados está no plural e determina foram. Já em 'Faz dois anos que estudo', faz indica tempo decorrido e permanece no singular. O erro comum é flexionar faz porque anos está próximo do verbo.",
    summary: [
      "Concorde com o núcleo do sujeito, não por proximidade.",
      "Haver no sentido de existir e fazer temporal são impessoais.",
    ],
    questions: [
      [
        "Qual frase está de acordo com a norma-padrão?",
        "Havia muitos candidatos na sala.",
        "Haviam muitos candidatos na sala.",
        "Haver com sentido existencial é impessoal e permanece na terceira pessoa do singular.",
        "Como se flexiona haver com sentido de existir?",
      ],
      [
        "Complete: 'A relação dos inscritos ___ disponível'.",
        "está",
        "estão",
        "O núcleo do sujeito é relação, no singular; dos inscritos é um termo subordinado.",
        "Qual termo determina a concordância verbal?",
      ],
    ],
    source: bm,
  },
  {
    id: "crase",
    subject: "Língua Portuguesa",
    title: "Crase: regência, artigo e teste de substituição",
    concept:
      "Crase é a fusão de duas vogais a, frequentemente a preposição a com o artigo feminino a. O acento grave marca essa fusão. Para decidir, verifique separadamente se o termo anterior exige preposição e se o termo seguinte aceita artigo. A presença de palavra feminina, isoladamente, não basta.",
    method:
      "Substitua a expressão feminina por masculina equivalente. Se surge ao, há forte indicação de à: dirigir-se à escola / ao colégio. Antes de verbo, não há artigo feminino, portanto não ocorre essa fusão. Locuções femininas, como à tarde, exigem atenção própria; o teste não resolve sozinho todos os casos de crase.",
    example:
      "Em 'O candidato entregou o recurso à comissão', entregar algo a alguém exige a preposição e comissão aceita artigo. Em 'O candidato começou a estudar', estudar é verbo e não recebe artigo. Em 'O candidato visitou a escola', visitar é transitivo direto nessa construção, por isso não há preposição para fundir.",
    summary: [
      "Verifique regência e artigo em duas etapas.",
      "Não use crase diante de verbo nem por ser uma palavra feminina.",
    ],
    questions: [
      [
        "Qual preenchimento está correto: 'Dirigiu-se ___ comissão'?",
        "à",
        "a, porque nunca há crase após verbo",
        "Dirigir-se exige a preposição a e comissão admite o artigo a: ocorre a fusão.",
        "Quais elementos formam a crase mais comum?",
      ],
      [
        "Em 'começou a estudar', ocorre crase?",
        "Não, estudar é verbo e não admite artigo feminino.",
        "Sim, toda preposição a recebe acento grave.",
        "O acento grave não marca qualquer preposição: depende de fusão ou construção específica.",
        "Pode haver artigo feminino diante de verbo?",
      ],
    ],
    source: bm,
  },
  {
    id: "porcentagem",
    subject: "Matemática e Raciocínio Lógico",
    title: "Porcentagem e variações sucessivas",
    concept:
      "Uma porcentagem é uma razão de base cem: 15% significa 15/100. Para calcular uma parte, multiplique a base pela taxa decimal. Aumentos e descontos sucessivos incidem sobre bases diferentes, por isso devem ser multiplicados. O fator de aumento de p% é 1+p/100; o fator de desconto é 1-p/100.",
    method:
      "Anote a base antes de qualquer conta. Converta porcentagem em decimal e verifique se o problema pede a parte ou o total final. Em variações sucessivas, use produto de fatores. Confira a plausibilidade: um desconto de 20% deve deixar 80% do valor inicial, nunca aumentar o resultado.",
    example:
      "Uma apostila de R$100 recebe aumento de 20% e desconto de 20%. O valor final é 100 × 1,20 × 0,80 = R$96. A segunda taxa incide sobre R$120. Assim, taxas percentuais opostas não se anulam quando aplicadas sucessivamente.",
    summary: [
      "Percentual depende da base de cálculo.",
      "Aumentos e descontos sucessivos exigem multiplicação de fatores.",
    ],
    questions: [
      [
        "Quanto é 15% de 200?",
        "30",
        "15",
        "200 × 0,15 = 30; a taxa é aplicada ao total 200.",
        "Como calcular p% de uma quantidade?",
      ],
      [
        "Após aumento de 10% e desconto de 10%, um valor de 100 torna-se:",
        "99",
        "100",
        "100 × 1,10 × 0,90 = 99; as bases das duas taxas são diferentes.",
        "Taxas opostas sucessivas sempre se anulam?",
      ],
    ],
    source: bm,
  },
  {
    id: "logica",
    subject: "Matemática e Raciocínio Lógico",
    title: "Condicional e negação de proposições",
    concept:
      "Uma proposição admite valor verdadeiro ou falso. Na condicional 'se P, então Q', a única situação falsa ocorre quando P é verdadeiro e Q é falso. A condicional não afirma que P aconteceu. Sua negação não é outra condicional: é a conjunção 'P e não Q'.",
    method:
      "Traduza as frases para letras e mantenha a ordem das partes. Para negar 'todos', basta afirmar a existência de ao menos um contraexemplo. Para negar 'P e Q', use 'não P ou não Q'. Para negar 'P ou Q', use 'não P e não Q'. Não confunda uma frase com sua recíproca.",
    example:
      "Considere 'Se estudo, então reviso'. A negação é 'Estudo e não reviso'. Já 'Se reviso, então estudo' é a recíproca e não é equivalente à original. A contrapositiva 'Se não reviso, então não estudo' é equivalente à condicional inicial na lógica proposicional clássica.",
    summary: [
      "P → Q é falsa apenas com P verdadeira e Q falsa.",
      "Negar uma afirmação universal exige um contraexemplo.",
    ],
    questions: [
      [
        "A negação de 'Se P, então Q' é:",
        "P e não Q",
        "Se não P, então não Q",
        "A negação descreve exatamente o único caso em que a condicional é falsa.",
        "Qual é a negação da condicional?",
      ],
      [
        "A negação de 'Todos os inscritos compareceram' é:",
        "Pelo menos um inscrito não compareceu.",
        "Nenhum inscrito compareceu.",
        "Para tornar uma afirmação universal falsa, basta existir um contraexemplo.",
        "Como negar uma proposição universal?",
      ],
    ],
    source: pc,
  },
  {
    id: "estatistica",
    subject: "Estatística",
    title: "Média, mediana e dispersão",
    concept:
      "A média aritmética soma os valores e divide pelo número de observações. A mediana é o centro dos dados ordenados; com quantidade par, é a média dos dois valores centrais. A moda é o valor de maior frequência. Essas medidas descrevem posição, mas não mostram sozinhas a variabilidade do conjunto.",
    method:
      "Ordene a série antes de buscar a mediana. Não retire valores extremos sem autorização do problema. Para comparar conjuntos, observe também amplitude e dispersão. Na média ponderada, multiplique cada valor pelo peso e divida pela soma dos pesos, não pela quantidade de valores.",
    example:
      "Nos tempos 2, 3, 3 e 12 minutos, a média é 20/4 = 5; a mediana é (3+3)/2 = 3; a moda é 3; a amplitude é 12-2 = 10. O tempo 12 desloca a média, mostrando por que a mediana pode representar melhor o centro quando há valores extremos.",
    summary: [
      "A mediana depende da ordenação dos dados.",
      "Média e mediana respondem de forma diferente a valores extremos.",
    ],
    questions: [
      [
        "A mediana dos valores 1, 9 e 2 é:",
        "2",
        "4",
        "Ordenando os valores: 1, 2, 9. O valor central é 2.",
        "Qual etapa precede o cálculo da mediana?",
      ],
      [
        "A média ponderada de 6 (peso 1) e 9 (peso 2) é:",
        "8",
        "7,5",
        "(6 × 1 + 9 × 2)/(1+2) = 24/3 = 8.",
        "Qual é o denominador da média ponderada?",
      ],
    ],
    source: pc,
  },
  {
    id: "contabilidade",
    subject: "Contabilidade Geral",
    title: "Patrimônio e equação contábil",
    concept:
      "O ativo representa recursos econômicos controlados pela entidade, o passivo reúne obrigações presentes, e o patrimônio líquido é a participação residual após deduzir o passivo do ativo. A equação básica é Ativo = Passivo + Patrimônio Líquido. Entrada de dinheiro não significa automaticamente receita.",
    method:
      "Identifique o fato e quais elementos mudaram. Na obtenção de empréstimo, entram recursos no ativo e surge obrigação no passivo: não há receita por esse motivo. Na compra à vista de equipamento, há troca entre componentes do ativo. Analise o efeito patrimonial antes de escolher contas de débito e crédito.",
    example:
      "Uma entidade tem ativo de R$80 mil e passivo de R$30 mil. Seu patrimônio líquido é R$50 mil. Se contrata empréstimo de R$10 mil e recebe o dinheiro, passa a ter ativo de R$90 mil e passivo de R$40 mil. O patrimônio líquido continua R$50 mil.",
    summary: [
      "Patrimônio líquido é ativo menos passivo.",
      "Empréstimo recebido aumenta ativo e passivo, sem ser receita.",
    ],
    questions: [
      [
        "Ativo de 100 e passivo de 40 implicam patrimônio líquido de:",
        "60",
        "140",
        "Pela equação patrimonial, PL = A − P = 100 − 40 = 60.",
        "Como calcular o patrimônio líquido?",
      ],
      [
        "O recebimento de empréstimo bancário representa, por si só:",
        "Aumento do ativo e do passivo.",
        "Receita de vendas.",
        "Há entrada de recursos e uma obrigação de devolver, não geração de receita de vendas.",
        "Receber dinheiro sempre significa obter receita?",
      ],
    ],
    source: pc,
  },
  {
    id: "informatica",
    subject: "Informática",
    title: "Segurança digital: phishing, autenticação e cópias",
    concept:
      "Phishing usa mensagens enganosas para induzir uma pessoa a revelar dados ou executar uma ação. A aparência de um remetente não comprova sua identidade. Autenticação multifator combina fatores distintos, como senha e posse de um dispositivo. Cópia de segurança precisa permitir restauração: sincronização isolada pode replicar exclusões.",
    method:
      "Confira o endereço real de um link e procure o serviço por caminho conhecido quando receber pedidos inesperados. Use senhas únicas e verificação adicional. Em questões, distinga confidencialidade (acesso), integridade (ausência de alteração indevida) e disponibilidade (acesso quando necessário). Um controle pode ajudar mais de um objetivo.",
    example:
      "Uma mensagem afirma que sua inscrição será cancelada e exige pagamento imediato por link abreviado. A ação adequada é consultar o portal oficial da banca por endereço conhecido e conferir o edital. O uso de HTTPS no link recebido indica proteção do transporte, mas não prova que o site pertence à banca.",
    summary: [
      "HTTPS não comprova a legitimidade de uma instituição.",
      "Backup deve ser testado por restauração e protegido de alterações indevidas.",
    ],
    questions: [
      [
        "Um site de golpe pode utilizar HTTPS?",
        "Sim, criptografia de transporte não comprova legitimidade.",
        "Não, HTTPS elimina a possibilidade de fraude.",
        "Um certificado protege a conexão com um domínio, mas não garante a honestidade de seu operador.",
        "O que HTTPS não garante?",
      ],
      [
        "O objetivo principal de preservar integridade é:",
        "Evitar alteração indevida dos dados.",
        "Garantir que todos possam ler qualquer dado.",
        "Integridade trata da correção e preservação dos dados; acesso restrito é confidencialidade.",
        "O que significa integridade da informação?",
      ],
    ],
    source: pc,
  },
  {
    id: "constitucional",
    subject: "Direito Constitucional",
    title: "Direitos fundamentais e inviolabilidade do domicílio",
    concept:
      "O artigo 5º da Constituição reúne direitos e garantias. Uma garantia oferece instrumentos para proteger direitos. A inviolabilidade do domicílio protege a esfera privada e tem exceções expressas. Para resolver uma questão, leia a hipótese completa e identifique consentimento, flagrante, desastre, socorro ou determinação judicial.",
    method:
      "Separe a regra das exceções. Sem consentimento do morador, a Constituição admite entrada em flagrante delito, desastre, para prestar socorro ou, durante o dia, por determinação judicial. Não transporte a limitação 'durante o dia' para todas as hipóteses. Casos reais exigem também os requisitos legais e jurisprudenciais aplicáveis.",
    example:
      "Uma questão puramente literal descreve necessidade de prestar socorro a alguém no interior de uma casa durante a noite. O art. 5º, XI, prevê socorro como exceção e não o limita ao período diurno. Isso é diferente de ingresso exclusivamente por determinação judicial, cujo texto constitucional exige o dia.",
    summary: [
      "Leia cada exceção e seus requisitos sem generalizar.",
      "O requisito diurno aparece na hipótese de determinação judicial.",
    ],
    questions: [
      [
        "No texto do art. 5º, XI, a exigência 'durante o dia' acompanha:",
        "A determinação judicial.",
        "Todas as hipóteses de ingresso sem consentimento.",
        "O dispositivo liga a restrição diurna à determinação judicial, não a desastre ou socorro.",
        "A qual exceção se liga o requisito diurno?",
      ],
      [
        "A prestação de socorro está entre as exceções constitucionais à inviolabilidade do domicílio?",
        "Sim, consta expressamente no art. 5º, XI.",
        "Não, depende sempre de consentimento prévio.",
        "O texto constitucional inclui a prestação de socorro entre as exceções à proteção domiciliar.",
        "O socorro é exceção constitucional à inviolabilidade domiciliar?",
      ],
    ],
    source: cf,
  },
  {
    id: "administrativo",
    subject: "Direito Administrativo",
    title: "Princípios expressos da Administração Pública",
    concept:
      "O caput do art. 37 da Constituição explicita legalidade, impessoalidade, moralidade, publicidade e eficiência. Esses princípios orientam a Administração direta e indireta dos Poderes e entes federativos. A atuação administrativa precisa de fundamento jurídico e finalidade pública; um resultado eficiente não legitima uma ilegalidade.",
    method:
      "Relacione o fato ao princípio predominante sem presumir exclusividade. Promoção pessoal em publicidade pública compromete a impessoalidade. Divulgação permite controle, respeitadas hipóteses legais de sigilo. Eficiência exige desempenho adequado e uso responsável de recursos dentro da legalidade, e não supressão indiscriminada de procedimentos.",
    example:
      "Um gestor usa uma campanha custeada pelo município para exaltar sua imagem pessoal. Mesmo que a campanha divulgue um serviço útil, a associação promocional a uma pessoa contraria a finalidade institucional. A análise deve considerar o art. 37 e o caráter educativo, informativo ou de orientação social da publicidade.",
    summary: [
      "Os cinco princípios expressos devem ser estudados em conjunto.",
      "Eficiência não autoriza descumprir a lei.",
    ],
    questions: [
      [
        "Qual alternativa contém apenas princípios expressos no caput do art. 37?",
        "Legalidade, impessoalidade e eficiência.",
        "Pessoalidade, sigilo absoluto e lucratividade.",
        "Legalidade, impessoalidade, moralidade, publicidade e eficiência são os princípios expressos.",
        "Quais são os princípios expressos do art. 37?",
      ],
      [
        "Eliminar exigência legal apenas para acelerar um procedimento é legitimado pela eficiência?",
        "Não, eficiência deve respeitar a legalidade.",
        "Sim, rapidez sempre prevalece sobre a lei.",
        "Os princípios devem ser harmonizados; eficiência não cria autorização para ignorar exigências legais.",
        "Eficiência pode afastar qualquer exigência legal?",
      ],
    ],
    source: cf,
  },
  {
    id: "penal",
    subject: "Direito Penal",
    title: "Legalidade e aplicação da lei penal no tempo",
    concept:
      "A legalidade penal exige lei anterior que defina o crime e estabeleça a pena. Lei penal posterior mais grave não deve retroagir para prejudicar o agente. A lei posterior favorável pode alcançar fatos anteriores, inclusive nas hipóteses previstas no Código Penal para condenações definitivas. Compare o conteúdo da norma, não apenas sua data.",
    method:
      "Construa uma linha do tempo com data do fato, lei então vigente e lei posterior. Pergunte qual delas beneficia o agente no caso concreto. Diferencie lei que deixa de considerar um fato criminoso de lei que apenas reduz a pena. Evite confundir retroatividade da norma favorável com aplicação irrestrita de qualquer lei nova.",
    example:
      "Em um exemplo abstrato, o fato foi praticado quando a pena mínima era dois anos. Lei posterior reduz a mínima para um ano sem criar condição mais gravosa relevante ao caso. A análise de lei mais benéfica permite aplicar o regime favorável ao fato anterior; uma elevação posterior não teria o mesmo efeito.",
    summary: [
      "Crime e pena dependem de lei anterior.",
      "Lei penal posterior favorável pode retroagir; a prejudicial não.",
    ],
    questions: [
      [
        "A lei penal posterior mais grave pode retroagir para prejudicar o réu?",
        "Não, vale a irretroatividade da lei penal prejudicial.",
        "Sim, porque é a norma mais recente.",
        "A Constituição e o Código Penal protegem contra a retroatividade da lei penal mais gravosa.",
        "Qual lei penal posterior pode retroagir?",
      ],
      [
        "O princípio da legalidade penal exige:",
        "Lei anterior definindo o crime e cominando a pena.",
        "Apenas desaprovação social da conduta.",
        "O art. 1º do Código Penal exige previsão legal anterior de crime e pena.",
        "Desaprovação social basta para criar um crime?",
      ],
    ],
    source: cp,
  },
  {
    id: "processual",
    subject: "Direito Processual Penal",
    title: "Prova e cadeia de custódia",
    concept:
      "A cadeia de custódia documenta a história cronológica do vestígio, permitindo acompanhar sua posse e manuseio. O CPP disciplina o tema nos arts. 158-A e seguintes. Vestígio é elemento material relacionado à infração; é necessário preservar sua identidade e integridade para que a análise posterior seja confiável.",
    method:
      "Diferencie reconhecer, isolar, fixar, coletar, acondicionar, transportar, receber, processar, armazenar e descartar. Em questões, procure a finalidade da etapa e o registro da passagem entre responsáveis. Não conclua automaticamente o resultado jurídico de qualquer falha sem considerar o caso, a legislação e a jurisprudência exigida no edital.",
    example:
      "Uma equipe coleta um objeto e o encaminha para exame. Identificação, acondicionamento e registro dos responsáveis permitem relacionar o objeto analisado ao recolhido. Se o problema pergunta por que registrar a transferência, a resposta central é rastreabilidade e preservação da história do vestígio.",
    summary: [
      "Cadeia de custódia registra a história e o manuseio do vestígio.",
      "Preservar identidade e integridade sustenta a confiabilidade da prova.",
    ],
    questions: [
      [
        "Qual é a finalidade central da cadeia de custódia?",
        "Documentar a história cronológica do vestígio.",
        "Dispensar o registro de responsáveis.",
        "O art. 158-A vincula a cadeia de custódia à documentação da história do vestígio.",
        "Qual é o objetivo da cadeia de custódia?",
      ],
      [
        "Registrar a transferência de um vestígio entre responsáveis contribui para:",
        "Rastreabilidade do manuseio.",
        "Eliminar a necessidade de identificação.",
        "A transferência documentada permite acompanhar posse e manuseio do vestígio.",
        "Por que registrar transferências de vestígios?",
      ],
    ],
    source: cpp,
  },
  {
    id: "humanos",
    subject: "Direitos Humanos",
    title: "Dignidade, igualdade e vedação à tortura",
    concept:
      "A dignidade da pessoa humana é fundamento da República. A Constituição proíbe tortura e tratamento desumano ou degradante. Direitos fundamentais também protegem pessoas investigadas, acusadas e presas: a restrição de liberdade não elimina a integridade física e moral. A atuação estatal deve observar as garantias aplicáveis.",
    method:
      "Separe restrição legítima de um direito de supressão da condição de sujeito de direitos. Em questão, identifique a medida concreta e o fundamento constitucional. Desconfie de alternativas que apresentem gravidade da suspeita como autorização genérica para tortura, humilhação ou discriminação.",
    example:
      "O enunciado diz que alguém foi condenado e pergunta se por isso perde a proteção da integridade física e moral. A resposta é negativa: o art. 5º, XLIX, assegura essa proteção aos presos. A condenação restringe direitos nos termos legais, mas não extingue a dignidade.",
    summary: [
      "A pessoa presa mantém a proteção de sua integridade física e moral.",
      "A gravidade de uma suspeita não legitima tortura ou tratamento degradante.",
    ],
    questions: [
      [
        "A Constituição assegura aos presos:",
        "Respeito à integridade física e moral.",
        "Perda de todos os direitos fundamentais.",
        "O art. 5º, XLIX, prevê expressamente a proteção da integridade física e moral.",
        "Qual proteção o art. 5º, XLIX, assegura?",
      ],
      [
        "A dignidade da pessoa humana é, no art. 1º da Constituição:",
        "Fundamento da República.",
        "Benefício reservado a quem não responde a processo.",
        "A dignidade é fundamento constitucional e não um prêmio condicionado à ausência de processo.",
        "Onde a Constituição situa a dignidade humana?",
      ],
    ],
    source: cf,
  },
  {
    id: "execucao",
    subject: "Execução Penal",
    title: "Finalidade da execução e assistência",
    concept:
      "A Lei de Execução Penal tem como objetivos efetivar a decisão criminal e proporcionar condições para a integração social do condenado e do internado. A assistência é dever do Estado e busca prevenir o crime e orientar o retorno à convivência em sociedade. A lei enumera modalidades de assistência e protege direitos não atingidos pela sentença ou pela lei.",
    method:
      "Leia os arts. 1º, 3º, 10 e 11 da LEP. Faça um quadro com assistência material, à saúde, jurídica, educacional, social e religiosa. Não substitua a enumeração legal por termos parecidos. Regras sobre benefícios e progressão devem ser estudadas em versão atualizada e com o marco temporal exigido no edital.",
    example:
      "Uma questão afirma que a execução serve exclusivamente ao cumprimento material da pena. A afirmação é incompleta: o art. 1º também prevê condições para a integração social. Outra afirma que assistência educacional não aparece na lei; basta confrontar com a enumeração do art. 11.",
    summary: [
      "A execução busca efetivar a decisão e favorecer a integração social.",
      "A assistência prevista na LEP é dever do Estado.",
    ],
    questions: [
      [
        "A assistência ao preso e ao internado, segundo a LEP, é:",
        "Dever do Estado.",
        "Favor sem previsão legal.",
        "O art. 10 da LEP define a assistência como dever do Estado.",
        "Quem tem o dever de assistência previsto na LEP?",
      ],
      [
        "Qual modalidade aparece no art. 11 da LEP?",
        "Assistência educacional.",
        "Assistência eleitoral obrigatória como modalidade enumerada.",
        "A assistência educacional integra a lista legal, ao lado de outras modalidades expressas.",
        "A LEP prevê assistência educacional?",
      ],
    ],
    source: lep,
  },
  {
    id: "guardas",
    subject: "Legislação das Guardas",
    title: "Guardas municipais: princípios e proteção municipal",
    concept:
      "A Lei 13.022/2014 estabelece normas gerais para guardas municipais e trata de proteção municipal preventiva, ressalvadas competências dos demais entes. Entre os princípios mínimos estão proteção dos direitos humanos fundamentais, preservação da vida, patrulhamento preventivo, compromisso com a evolução social da comunidade e uso progressivo da força.",
    method:
      "Estude os arts. 2º a 5º separando natureza, princípios e competências. Não trate a lei federal como substituta do estatuto de cada município. Jurisprudência sobre atribuições das guardas e legislação municipal precisam integrar a leitura específica do concurso, conforme o conteúdo e a data de atualização previstos em edital.",
    example:
      "Uma questão pergunta se o uso progressivo da força consta dos princípios mínimos de atuação. A resposta está no art. 3º. Já uma questão sobre regime disciplinar de Porto Alegre não pode ser respondida apenas com normas de Canoas: a jurisdição integra o conteúdo da questão.",
    summary: [
      "Lei federal e legislação municipal têm funções diferentes no estudo.",
      "Princípios de atuação incluem direitos humanos e preservação da vida.",
    ],
    questions: [
      [
        "A Lei 13.022/2014 inclui entre os princípios mínimos:",
        "Uso progressivo da força.",
        "Supressão da proteção dos direitos humanos.",
        "O art. 3º inclui o uso progressivo da força e a proteção dos direitos humanos fundamentais.",
        "O uso progressivo da força é princípio previsto na lei?",
      ],
      [
        "Para estudar regime funcional da guarda de um município, basta o estatuto de outro?",
        "Não, é necessário consultar a legislação da jurisdição do concurso.",
        "Sim, todos os municípios têm leis idênticas.",
        "A lei federal estabelece normas gerais, mas não torna idênticos todos os regimes municipais.",
        "Por que separar os cursos de GCM por município?",
      ],
    ],
    source: gcm,
  },
  {
    id: "fisica",
    subject: "Ciências Naturais",
    title: "Física: velocidade média e unidades",
    concept:
      "Velocidade média relaciona deslocamento e intervalo de tempo; em problemas de distância percorrida, a rapidez média usa distância total dividida pelo tempo total. Unidades devem ser compatíveis. Para converter km/h em m/s, divida por 3,6; para a conversão inversa, multiplique por 3,6.",
    method:
      "Identifique se o problema usa deslocamento ou distância total. Converta as unidades antes da substituição na fórmula e mantenha a unidade no resultado. Não faça média simples das velocidades em trechos com tempos diferentes: calcule primeiro distância e tempo totais.",
    example:
      "Um veículo percorre 60 km em uma hora e mais 60 km em duas horas. A rapidez média é 120/3 = 40 km/h. A média simples de 60 e 30 seria 45, incorreta porque os tempos dos trechos são diferentes. Convertendo 36 km/h para m/s: 36/3,6 = 10.",
    summary: [
      "Use grandezas e unidades compatíveis.",
      "A rapidez média é distância total dividida por tempo total.",
    ],
    questions: [
      [
        "36 km/h equivalem a:",
        "10 m/s",
        "129,6 m/s",
        "Para converter km/h em m/s, divide-se por 3,6: 36/3,6 = 10.",
        "Como converter km/h para m/s?",
      ],
      [
        "120 km percorridos em 3 horas correspondem a rapidez média de:",
        "40 km/h",
        "360 km/h",
        "A rapidez média é 120 km divididos por 3 h, resultando em 40 km/h.",
        "Qual fórmula fornece a rapidez média?",
      ],
    ],
    source: cbm,
  },
  {
    id: "quimica",
    subject: "Ciências Naturais",
    title: "Química: matéria, misturas e transformações",
    concept:
      "Substância pura possui composição definida; uma mistura combina substâncias e pode apresentar uma ou mais fases. Transformação física não cria necessariamente nova substância: mudança de estado é exemplo. Transformação química envolve formação de novas espécies. O número de componentes não é obrigatoriamente igual ao número de fases.",
    method:
      "Conte fases observáveis e componentes separadamente. Água com sal totalmente dissolvido apresenta uma fase, embora tenha mais de um componente. Água e gelo de água pura têm duas fases e um componente. Escolha métodos de separação pela propriedade física relevante, como tamanho de partículas, densidade e temperatura de ebulição.",
    example:
      "Um copo com água e sal totalmente dissolvido contém mistura homogênea. Filtração comum não separa o sal dissolvido, pois não há partículas retidas como em água com areia. Evaporação pode recuperar o sal; destilação permite também recuperar o solvente, em condições adequadas.",
    summary: [
      "Fase não é sinônimo de componente.",
      "O método de separação depende das propriedades do sistema.",
    ],
    questions: [
      [
        "Água pura líquida em contato com gelo de água pura apresenta:",
        "Um componente e duas fases.",
        "Dois componentes e uma fase.",
        "A substância é a mesma, água; os estados sólido e líquido constituem fases diferentes.",
        "Fase e componente são sinônimos?",
      ],
      [
        "Filtração comum separa sal completamente dissolvido em água?",
        "Não, o sal dissolvido não é retido como um sólido suspenso.",
        "Sim, qualquer filtro retém íons dissolvidos.",
        "Filtração comum separa sólidos suspensos; não remove por si só substâncias dissolvidas.",
        "O que a filtração comum separa?",
      ],
    ],
    source: cbm,
  },
  {
    id: "biologia",
    subject: "Ciências Naturais",
    title: "Biologia: células e organização dos seres vivos",
    concept:
      "A célula é unidade básica de organização dos seres vivos. Células procarióticas não possuem núcleo delimitado por membrana; eucarióticas possuem. Membrana plasmática delimita a célula e participa das trocas. Material genético contém informação hereditária e ribossomos participam da síntese de proteínas.",
    method:
      "Construa comparações por estrutura, evitando atribuir a toda célula características exclusivas de algum grupo. Bactérias são procariontes e não possuem mitocôndrias. Células vegetais e animais são eucarióticas, mas parede celular e cloroplastos não são características típicas de células animais.",
    example:
      "Uma questão descreve uma célula sem envoltório nuclear e com ribossomos. A ausência de núcleo delimitado é compatível com célula procariótica. Não significa ausência de material genético: o DNA está presente, mas não em um núcleo envolvido por membrana.",
    summary: [
      "Procariontes não possuem núcleo delimitado por membrana.",
      "Ausência de núcleo delimitado não significa ausência de DNA.",
    ],
    questions: [
      [
        "Uma bactéria típica apresenta:",
        "Material genético sem núcleo delimitado por membrana.",
        "Ausência de material genético.",
        "Bactérias são procariontes e possuem DNA, embora não tenham núcleo delimitado.",
        "Bactérias possuem DNA?",
      ],
      [
        "Ribossomos participam diretamente da:",
        "Síntese de proteínas.",
        "Formação de um núcleo em toda bactéria.",
        "Ribossomos realizam tradução, etapa da síntese de proteínas.",
        "Qual é a função dos ribossomos?",
      ],
    ],
    source: cbm,
  },
  {
    id: "redacao",
    subject: "Redação",
    title: "Redação: tese, argumento e revisão",
    concept:
      "Uma dissertação argumentativa defende uma tese por argumentos articulados. Tema é o assunto delimitado; tese é a posição sustentada. Cada parágrafo deve desenvolver uma ideia e explicar sua relação com a tese. Citações decoradas não substituem análise e podem gerar erro quando atribuídas de forma incorreta.",
    method:
      "Antes de escrever, delimite o tema, formule uma tese e escolha dois argumentos distintos. Estruture introdução, desenvolvimento e conclusão coerentes. Revise progressão, conectivos, concordância e pontuação. Use exatamente os limites de linhas, gênero e critérios do edital do seu cargo; não copie regras de outra banca.",
    example:
      "Tema de treino: desafios da prevenção da violência urbana. Uma tese possível é que coordenação institucional e melhoria do diagnóstico local favorecem políticas preventivas. No desenvolvimento, explique como cada mecanismo funciona e quais limites enfrenta, sem inventar dados estatísticos. Termine retomando a tese em vez de introduzir outro tema.",
    summary: [
      "Tese deve responder ao recorte temático.",
      "Revisão precisa conferir conteúdo, coerência e norma-padrão.",
    ],
    questions: [
      [
        "Em uma redação argumentativa, a tese é:",
        "A posição central defendida pelo texto.",
        "Qualquer citação inserida na introdução.",
        "A tese organiza o posicionamento e deve ser sustentada pelos argumentos desenvolvidos.",
        "O que é tese?",
      ],
      [
        "Qual atitude melhora a confiabilidade de um argumento?",
        "Explicar o mecanismo sem inventar estatísticas.",
        "Criar uma porcentagem para tornar o texto convincente.",
        "Dados inventados comprometem a argumentação; a explicação pode ser construída sem números falsos.",
        "É adequado inventar dados para fortalecer um argumento?",
      ],
    ],
    source: pc,
  },
];

const seedLessons: ProfessorLesson[] = seeds.map((seed) => ({
  id: seed.id,
  subject: seed.subject,
  title: seed.title,
  topicIds: [seed.id],
  minutes: 45,
  objectives: [`Explicar e aplicar: ${seed.title.toLocaleLowerCase("pt-BR")}.`],
  sections: [
    { title: "Entenda o conceito", text: seed.concept },
    { title: "Como resolver na prova", text: seed.method },
  ],
  workedExample: seed.example,
  summary: seed.summary,
  practice: seed.questions.map(([statement, correct, wrong, explanation], index) => ({
    id: `${seed.id}-q${index + 1}`,
    statement,
    options: index % 2 ? [wrong, correct] : [correct, wrong],
    correctIndex: index % 2,
    explanation,
  })),
  flashcards: seed.questions.map(([front, correct, , explanation]) => ({
    front,
    back: `${correct} ${explanation}`,
  })),
  resources: [seed.source, ...(additionalResources[seed.id] ?? [])],
}));

export const foundationLessons: ProfessorLesson[] = [
  ...seedLessons,
  ...quantitativeLessons.map((lesson) => lessonSchema.parse(lesson)),
];
