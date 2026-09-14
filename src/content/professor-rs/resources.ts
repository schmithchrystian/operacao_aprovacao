import type { ProfessorSource } from "./schema";
const checkedAt = "2026-09-13";
/** Referências descobertas em páginas institucionais/metadados; sem espelhar vídeos ou obras. */
export const additionalResources: Record<string, ProfessorSource[]> = {
  porcentagem: [
    {
      title: "UNIVESP — Porcentagem",
      url: "https://www.youtube.com/watch?v=RSs7GY-0Itw",
      kind: "video",
      checkedAt,
      verified: false,
      note: "Vídeo vinculado pela própria UNIVESP em apps.univesp.br/recursos-ao-conteudista/modulo-2/. Reprodução no YouTube não verificada neste ambiente.",
    },
  ],
  interpretacao: [
    {
      title: "UNIVESP — A coerência textual — Vanessa Martins do Monte (2024)",
      url: "https://www.youtube.com/watch?v=C49wMfj6KP0",
      kind: "video",
      checkedAt,
      verified: false,
      note: "Complemento sobre coerência para leitura e interpretação; metadados públicos localizados, reprodução não verificada.",
    },
  ],
  redacao: [
    {
      title: "UNIVESP — A coerência textual — Vanessa Martins do Monte (2024)",
      url: "https://www.youtube.com/watch?v=C49wMfj6KP0",
      kind: "video",
      checkedAt,
      verified: false,
      note: "Assista com foco na coerência entre tese e argumentos. Metadados localizados; reprodução não verificada.",
    },
  ],
  administrativo: [
    {
      title: "TV Justiça — Saber Direito: Administração pública, aula 1 — Cláudia Gonçalves",
      url: "https://www.youtube.com/watch?v=VOnrP8w6gEs",
      kind: "video",
      checkedAt,
      verified: false,
      note: "Aula histórica de 2010 para fundamentos constitucionais. Confrontar normas e jurisprudência com a versão aplicável ao edital. Reprodução não verificada.",
    },
  ],
  constitucional: [
    {
      title: "Câmara dos Deputados — Constituição Federal em formatos digitais",
      url: "https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988",
      kind: "livro",
      checkedAt,
      verified: false,
      note: "Edição digital oficial em HTML, PDF, DOCX e áudio. Conferir a atualização indicada no arquivo e o marco temporal do edital.",
    },
  ],
  humanos: [
    {
      title: "Câmara dos Deputados — Constituição Federal em formatos digitais",
      url: "https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988",
      kind: "livro",
      checkedAt,
      verified: false,
      note: "Leitura complementar: fundamentos da República e art. 5º. O texto integral não substitui o estudo dos tratados exigidos no edital.",
    },
  ],
};
