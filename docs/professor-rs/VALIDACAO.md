# Validação — Professor RS — 13/09/2026

## Resultado

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado. Após ensaio de desenvolvimento, tipos do Next foram regenerados com `next typegen` e o diretório de tipos temporário foi preservado fora do projeto, eliminando conflito entre tipos de desenvolvimento e produção.
- `npm run check`: aprovado, **837 testes em 125 arquivos**, incluindo 14 testes específicos do Professor RS.
- Build Next.js 16.3.5 com `--webpack`: aprovada em cópia isolada do projeto, `APP_ENV=demo`, `DATA_SOURCE=mock` e segredos aleatórios efêmeros. Inclui `/professor-rs` e `/professor-rs/[slug]`. Não equivale a uma implantação de produção.
- CLI `status policia-civil-rs`: apresenta 14 aulas, mapa parcial de 20 blocos e lacunas explícitas.
- CLI `research policia-civil-rs` sem credenciais: saída 1, sem chamada externa, instruindo configurar `OPENAI_API_KEY` e `PROFESSOR_RS_MODEL`.

## Testes cobertos

Integridade dos seis pacotes; gabarito fora do intervalo; IDs duplicados; tópico órfão; URLs inseguras; publicação incompleta; alteração de conteúdo depois da revisão por hash; limites diários de 30/60/90/240 minutos; conservação do tempo de aula e revisão; dias de descanso; data/disponibilidade inválida; autenticação de correção e planejamento; questões fora do curso; recusa e truncamento da resposta de IA; ausência de busca; falha HTTP sem vazamento de resposta do provedor.

## Navegador

Teste manual no Browser com a conta fictícia do modo mock e build local isolada:

- Login, navegação pelo item Professor RS e visualização dos seis cartões: aprovados.
- Inspeção visual do catálogo no layout desktop: aprovada.
- Abertura da trilha de PC, aula de interpretação, conteúdo escrito, resumo e recursos: aprovada.
- Exercício respondido com um acerto e um erro: resultado **1 de 2**, gabaritos e justificativas apresentados após envio, alternativas bloqueadas na correção.
- Cronograma da PC com início em 14/09/2026, cinco dias por semana e 60 minutos/dia: **30 dias com atividades até 04/11/2026**, com revisões e distribuição dentro da carga escolhida.

O primeiro servidor de desenvolvimento não respondeu às navegações. A verificação acima foi feita após a build em um servidor de produção local; não houve redução das guardas de autenticação. Não foi realizado teste visual em dispositivo móvel real.

## Não executado

Geração real de cursos pela API, revisão integral de todos os editais, importação em PostgreSQL e deploy em nuvem. As variáveis necessárias não estavam configuradas no ambiente. Os exercícios de fundamentos não são simulados que reproduzem as regras oficiais. A biblioteca não foi promovida artificialmente a curso completo.
