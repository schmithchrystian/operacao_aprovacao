# Infraestrutura econômica e custo de operação

Consulta às páginas oficiais em **13/09/2026, US/Pacific**. Valores em **USD**, antes de tributos, câmbio, IOF, domínio, gateway de pagamento, desenvolvimento e suporte. Preços públicos não são contratação nem garantia de fatura. Verificar plano, região, recursos e condições vigentes no momento de contratar.

## 1. Recomendação

Manter Next.js/TypeScript/Prisma e um único aplicativo, com **Vercel Pro + Supabase Pro + Bunny Stream**, e-mail transacional e limites compartilhados. Escolher região do aplicativo próxima do banco e do público brasileiro após medir latência. Dev local e CI com Postgres descartável; staging isolado, com dados sintéticos.

Essa combinação prioriza baixo custo de manutenção e compatibilidade com o código. Não é o menor preço possível de máquina: concentra operação de banco/deploy em serviços gerenciados e evita a reescrita que uma migração de stack traria.

| Componente | Proposta e preço público consultado | Controle de custo |
|---|---|---|
| Aplicativo | [Vercel Pro](https://vercel.com/pricing): base de US$20/mês, com crédito de uso anunciado de US$20 | Uma pessoa com acesso de desenvolvimento; medir compute/build e excedentes. Não somar o crédito como desconto extra na mensalidade |
| Banco | [Supabase Pro](https://supabase.com/pricing): US$25/mês; crédito de compute cobre um Micro | Um projeto de produção; backups diários com sete dias de retenção no plano consultado |
| Staging | Projeto separado; Micro adicional em organização Pro começa em cerca de US$10/mês | Local/CI efêmero durante desenvolvimento; evitar manter três ambientes pagos sem necessidade. [Regra de cobrança](https://supabase.com/docs/guides/platform/billing-faq) |
| Vídeo | [Bunny Stream](https://bunny.net/pricing/stream/): mínimo anunciado US$1/mês; armazenamento a partir de US$0,01/GB e entrega a partir de US$0,005/GB | Medir GB realmente armazenados/transcodificados e entregues; preço mínimo anunciado não é tarifa garantida para qualquer região/tier |
| E-mail | [Resend](https://resend.com/pricing): gratuito até 3.000/mês e 100/dia; Pro anunciado US$20/mês para 50.000 | Não enviar notificações de estudo a cada ação; limitar e agrupar; onboarding pode estourar o limite diário mesmo com baixo volume mensal |
| Rate limit | [Upstash Redis](https://upstash.com/pricing/redis): começar dentro da franquia quando elegível | Contar operações por requisição e TTL; a decisão deve usar uso real, sem assumir que todo heartbeat cabe grátis |
| Arquivos | Supabase Storage com buckets privados e entrega autorizada | A franquia/egress deve ser conferida; originais e backups de arquivos em destino independente |
| DNS/TLS | DNS do domínio e TLS gerenciado pelo host; Cloudflare pode cuidar do DNS | Evitar proxy/cache adicional sem necessidade; páginas privadas nunca em cache público |
| Erros e uptime | Uma solução de erros e uma de uptime, em plano inicial compatível com uso | Evitar várias ferramentas pagas cobrindo o mesmo sinal; amostrar e remover dados pessoais |
| Backups extras | Dump/arquivos em armazenamento independente | Reservar orçamento e testar restauração. PITR não está incluído automaticamente no preço-base de US$25 |

**Base mínima de aplicativo + banco: US$45/mês.** Com staging Micro pago: cerca de **US$55/mês**, antes de mídia e demais serviços. Uma meta inicial de orçamento de **US$60–100/mês** é plausível no cenário de 50 alunos × 10 horas de vídeo/mês, catálogo pequeno e franquias suficientes; é **estimativa de planejamento**, não teto automático ou cotação.

O Vercel Hobby não é a opção para um SaaS comercial: sua [descrição oficial](https://vercel.com/docs/plans/hobby) restringe o plano a uso pessoal não comercial. O número de usuários não muda essa condição.

## 2. Alternativas comparadas

| Alternativa | Custo público / hipótese | Vantagem | Custo ou risco adicional | Decisão |
|---|---|---|---|---|
| Vercel Pro + Supabase Pro | US$45 base | Next nativo e banco com backup gerenciado; menor trabalho operacional | Uso variável, custos de staging e PITR separados | **Recomendação-base** |
| Railway Pro com app + Postgres | [Mínimo US$20 de uso/mês](https://railway.com/pricing); CPU, RAM, volume e saída cobrados pelo consumo | Processo Node contínuo, deploy simples; pode reduzir a fatura de baixo tráfego | Não significa app e banco ilimitados por US$20; gerenciar backup/restore e dimensionamento explicitamente | Alternativa se medição comprovar economia total e recuperação equivalente |
| VPS com Node + Postgres | Não cotada nesta revisão | Potencial de menor mensalidade de infraestrutura | Patches, firewall, deploy, backups externos, monitoramento e recuperação ficam com a equipe | Só adotar com responsável operacional e ensaio de restore; não é economia automática |
| Reescrever para outra plataforma/edge | Exige orçamento de migração | Pode ajudar cargas específicas | Retrabalho em Prisma/Auth/Node e testes; não remove pendências do produto | Não recomendado para lançar este repositório |

Uma economia hipotética de US$20/mês equivale a US$240/ano. Compare esse valor ao esforço de manter uma segunda arquitetura. O custo total é **infra + desenvolvimento + manutenção + incidentes**, não só a fatura do servidor.

## 3. Simulação de vídeo — premissas explícitas

Hipótese de consumo: **10 horas por aluno ativo/mês**, bitrate médio entregue de **2 Mbps**, aproximadamente **0,9 GB/h** em base decimal, sem overhead. Para Bunny, considerar **100 GB efetivamente faturados de catálogo**, uma réplica, e dois cenários de preço de entrega para sensibilidade. Transcodificações/réplicas podem elevar o armazenamento real.

Fórmulas:

```text
horas_entregues = alunos_ativos × horas_por_aluno
GB_entregues ≈ horas_entregues × Mbps_medio × 0,45
custo_Bunny ≈ GB_armazenados × tarifa_storage + GB_entregues × tarifa_entrega
```

| Alunos ativos | Horas entregues | GB estimados | Cenário US$0,005/GB + US$1 storage | Cenário US$0,045/GB + US$1 storage |
|---:|---:|---:|---:|---:|
| 50 | 500 | 450 | US$3,25 | US$21,25 |
| 500 | 5.000 | 4.500 | US$23,50 | US$203,50 |
| 5.000 | 50.000 | 45.000 | US$226,00 | US$2.026,00 |

A primeira tarifa é o “a partir de” anunciado para Stream; a segunda é uma **referência de sensibilidade** da tarifa regional de CDN anunciada para América do Sul na [página Bunny](https://bunny.net/pricing), não confirmação de preço final de uma biblioteca Stream específica. Validar tier, cobertura e qualidade no Brasil. Não comparar provedores assumindo que o menor preço serve todas as regiões com o mesmo serviço.

Como alternativa de cobrança por minutos, [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/) anuncia armazenamento em blocos de **US$5 por 1.000 minutos** e entrega de **US$1 por 1.000 minutos**, sem egress separado. Para **100 horas de catálogo** (6.000 minutos, US$30) e o mesmo consumo de 10 horas/aluno, a simulação é:

| Alunos ativos | Minutos entregues | Vídeo/mês, incluindo US$30 de catálogo |
|---:|---:|---:|
| 50 | 30.000 | US$60 |
| 500 | 300.000 | US$330 |
| 5.000 | 3.000.000 | US$3.030 |

Os modelos de catálogo não são equivalentes em bytes: “100 GB faturados” e “100 horas” são premissas diferentes, declaradas para cada fórmula. O piloto deve medir catálogo transcodificado e bitrate para fazer a comparação definitiva. Em ambos os casos, manter o tráfego de vídeo fora do servidor Next e autorizar reprodução no backend.

## 4. Heartbeats e banco

O player atual envia heartbeat periódico a cada **10 segundos** (`lesson-player.tsx:26`). Com 10 horas assistidas por aluno, isso gera aproximadamente **3.600 heartbeats/aluno/mês**, além dos eventos de play/pause/seek e do modo foco.

| Alunos ativos no cenário | Heartbeats periódicos/mês |
|---:|---:|
| 50 | 180.000 |
| 500 | 1.800.000 |
| 5.000 | 18.000.000 |

Cada heartbeat atual pode disparar várias consultas e recomputações. O volume de chamadas não equivale ao mesmo número de operações Redis ou queries; multiplicar pela instrumentação real. Para reduzir custo, otimizar as consultas/estado agregado e evitar recarregar o curso inteiro em cada chamada. Não aumentar intervalo sem retestar o algoritmo de tempo, seus limites e o progresso do aluno.

## 5. Backups e níveis de serviço

Para o piloto, o cronograma propõe **RPO até 24 h e RTO até 4 h**, a validar por restore. O [Supabase Pro](https://supabase.com/docs/guides/platform/backups) oferece backup diário com retenção de sete dias; PITR é adicional e exige orçamento próprio. A retenção do banco não protege automaticamente os objetos do Storage, vídeos e configurações.

Quando houver cobrança, a reconciliação com o gateway deve reconstruir eventos financeiros ocorridos após o ponto restaurado. Se a operação não puder aceitar perda potencial de um dia de progresso, contratar/configurar menor RPO antes do lançamento, recalculando orçamento. Não anunciar disponibilidade de 99,9% ou recuperação garantida sem medir o conjunto dos serviços.

## 6. Regras de orçamento

- Definir alertas em 50%, 80% e 100% do orçamento e responsável de resposta; verificar quais provedores realmente oferecem teto de gasto, em vez de apenas aviso.
- Não suspender automaticamente acesso de alunos pagantes sem política de contingência. Limitar abuso, uploads e processos não essenciais primeiro.
- Medir custo por aluno ativo: `custo_total / alunos_ativos`; margem inclui taxas do gateway, tributos, suporte e produção de conteúdo.
- Reservar desenvolvimento pelo esforço do [cronograma](CRONOGRAMA.md): `576 h × valor/hora`, além de revisão independente e contingência. Não foi inventada uma taxa profissional nem um orçamento fechado de implantação.
- Habilitar planos pagos somente quando houver necessidade de staging/produção real. Não pagar várias regiões, múltiplas soluções de auth, ferramentas duplicadas ou add-ons de observabilidade antes de medir.
- Reavaliar com dados de 30 dias de operação e ao atingir 500 alunos ativos; as simulações de 5.000 alunos não dimensionam CPU/banco nem garantem que os planos-base sejam suficientes.
