# Cloudflare — Plano de Uso (Operação Aprovação)

> Produzido pelo subagente `security`. Avalia o que usar da Cloudflare na frente de uma app
> **Next.js hospedada na Vercel** (ver `TARGET_ARCHITECTURE.md`). Regra de ouro deste doc:
> **Cloudflare como DNS autoritativo é seguro e recomendado; o PROXY laranja na frente da
> Vercel é opcional e deve começar DESLIGADO (DNS-only).** Preços/limites de plano: **verificar
> no painel Cloudflare** — não fixados aqui.

---

## 1. Decisão central — proxy laranja NA FRENTE da Vercel

**Recomendação: começar DNS-only (nuvem cinza), ativar o proxy laranja só depois de testes documentados — e só se houver necessidade concreta que a Vercel não cubra.**

Por quê (fato confirmado, KB da Vercel):
- A própria **Vercel não recomenda um reverse proxy na frente dela**. O proxy laranja:
  1. **Reduz a visibilidade de tráfego** que a Vercel usa para segurança/DDoS/analytics (a Vercel passa a ver o IP da Cloudflare, não do visitante);
  2. **Adiciona latência** (salto extra Cloudflare → Vercel, ambos já são CDN de borda — dupla borda);
  3. **Causa conflitos de cache** (duas camadas de cache decidindo TTL);
  4. Pode gerar o aviso **"Invalid Configuration"** na Vercel e complicar a **emissão/renovação automática do certificado** (a Vercel valida o domínio por trás do proxy).
- Com a Vercel você **já tem**: CDN global, TLS automático (Let's Encrypt), proteção DDoS L3/L7 na borda e (nos planos aplicáveis) Vercel WAF/Firewall e rate limiting. Muita coisa da Cloudflare **duplica** isso.

**Se, mesmo assim, o proxy for ligado depois** (ex.: para WAF/Turnstile/Access da Cloudflare), exigir estas configurações (KB Vercel):
- **Cache Level = Bypass** para o hostname da Vercel (nunca cachear a app — ver §5);
- **True-Client-IP / restaurar IP de origem** para a Vercel receber o IP real do visitante;
- Desligar **"Orange-to-Orange (O2O) redirects"**;
- **SSL/TLS mode = Full (strict)** (nunca "Flexible" — cria loop/downgrade inseguro);
- Validar emissão de certificado na Vercel **antes** de ligar o proxy, e reconfirmar renovação depois.

> **Fluxo seguro:** (1) Cloudflare só como DNS (cinza) → (2) domínio validado e SSL emitido na
> Vercel → (3) app 100% funcional em produção → (4) SÓ ENTÃO avaliar ligar o proxy laranja
> registro a registro, com Cache Bypass, medindo latência antes/depois e documentando.

---

## 2. Matriz de recursos Cloudflare

Legenda: **MVP** = obrigatório/recomendado para o lançamento · **Pós** = recomendado depois do
lançamento · **Conflita** = pode duplicar/atrapalhar a Vercel — cautela.

| Recurso | Classificação | Precisa do proxy laranja? | Observação |
|---|---|---|---|
| **DNS autoritativo** | **MVP** | Não (DNS-only) | Base de tudo. Gestão de registros, propagação rápida, edição fácil. Ver `DOMAIN_AND_DNS.md`. |
| **DNSSEC** | **MVP** | Não | Ativar na Cloudflare **e** publicar o DS record no Registro.br. Protege contra spoofing de DNS. |
| **SSL/TLS Full (strict)** | **MVP (se proxy)** | Sim | Só relevante quando o proxy está ligado. DNS-only: o TLS é 100% da Vercel. |
| **Proteção DDoS** | Conflita | Sim | A Vercel já protege L3/L7. Só agrega se o proxy estiver ligado; senão redundante. |
| **WAF (regras gerenciadas/OWASP)** | **Pós** | Sim | Útil, mas exige proxy ligado. Avaliar Vercel WAF primeiro (sem proxy). |
| **Rate limiting de borda** | **Pós** | Sim | Complementa o rate-limit de login da app (L1/L2 do `SECURITY_CHECKLIST`). Exige proxy. |
| **Proteção de login / anti-bot / Bot Fight Mode** | **Pós** | Sim | Proteger `/login` e reset de senha. Exige proxy. |
| **Turnstile (CAPTCHA)** | **MVP-opcional** | **Não** | Widget client-side + verificação server-side na action de login/registro. **Funciona sem o proxy** (é JS + API), então dá para adotar cedo sem os riscos do proxy. Recomendado no login/registro/reset. |
| **Cloudflare Access (Zero Trust)** para **staging** | **MVP** | Recomendado (proxy no subdomínio staging) | Protege `staging.` contra acesso anônimo (exigência do `ENVIRONMENTS.md` §1.3). Alternativa sem proxy: Basic Auth na Vercel + `X-Robots-Tag: noindex`. |
| **Cache / CDN** | Conflita | Sim | **NÃO cachear a app** (ver §5). A Vercel já é CDN. Só faz sentido para assets estáticos externos, se houver. |
| **Redirects (Bulk/Redirect Rules)** | **MVP** | Não (funciona em DNS-only via Page Rules limitadas) / melhor com proxy | Redirecionar domínio secundário → principal e `www` ↔ raiz. Pode ser feito na Vercel também. |
| **Headers/Transform Rules** | Conflita | Sim | Headers de segurança já vêm do `next.config.ts`. Não duplicar CSP/HSTS na Cloudflare (risco de headers conflitantes). |
| **HSTS** | Conflita | Sim | Já enviado pelo `next.config.ts`. Não configurar em dois lugares. |
| **Logs (Logpush)** | **Pós** | Sim | Só com proxy. Para MVP, usar logs da Vercel (ver `MONITORING_PLAN.md`). |

---

## 3. O que é MVP (fazer agora)

1. **Cloudflare como DNS autoritativo, todos os registros em DNS-only (cinza)** — ver `DOMAIN_AND_DNS.md`.
2. **DNSSEC** ativado na Cloudflare + DS record publicado no Registro.br.
3. **Proteção do staging** — Cloudflare Access no `staging.` (proxy ligado **apenas nesse subdomínio**) **ou** Basic Auth + `noindex` na Vercel. Escolher uma; Access é mais robusto.
4. **Turnstile** no login/registro/reset (funciona sem proxy) — barra bots cedo sem risco de proxy na app principal.
5. **Redirects** de domínio secundário e `www` — na Cloudflare ou na Vercel (escolher um lugar só).

## 4. O que é Pós-lançamento (avaliar depois, exige ligar o proxy)

- WAF gerenciado (OWASP) na frente da app principal.
- Rate limiting de borda em `/login`, `/api/*`, reset de senha.
- Bot Fight Mode / anti-bot avançado.
- Logpush para o agregador de logs.
- DDoS gerenciado da Cloudflare (só se a proteção da Vercel se mostrar insuficiente).

Cada um destes **exige ligar o proxy laranja na app principal** — portanto seguir o fluxo do §1
(validar SSL/latência, Cache Bypass, True-Client-IP, O2O off) e documentar antes de manter ligado.

## 5. REGRA DURA — nunca cachear (lista de bypass / no-cache)

Se o proxy for ligado, **Cache Level = Bypass** para TODAS estas superfícies (conteúdo autenticado
e personalizado nunca pode ser servido de cache compartilhado — risco de vazar sessão/dados de
outro usuário):

| Superfície | Motivo |
|---|---|
| `/api/*` (todas as rotas de API, incluindo `/api/auth`, `/api/cron`, `/api/progress`, `/api/focus`) | Respostas dinâmicas/autenticadas; cron protegido por segredo. |
| Páginas autenticadas — `(student)/*` (dashboard, trilha, aulas, simulados, flashcards, brainstorm, plano, acompanhamento, modo-foco, conquistas, perfil) | Conteúdo por usuário; Server Components com sessão. |
| **Ranking personalizado** e qualquer projeção com dados do usuário | Personalizado + sujeito a flags de privacidade. |
| **Progresso** e **tempo de estudo** | Estado por usuário, atualizado em tempo real via heartbeat. |
| **Simulados** (tentativas, respostas, correção) | Gabarito não pode vazar; estado por tentativa. |
| **Autenticação** (`/login`, callbacks Auth.js, cookies de sessão) | Nunca cachear resposta com `Set-Cookie`. |
| **Rotas admin** (`/admin/*`) | Conteúdo sensível + auditoria. |

Cacheável (se desejado): apenas assets **imutáveis versionados** do Next (`/_next/static/*`,
favicon) — mas a Vercel já os serve com cache ótimo; o ganho da Cloudflare aqui é marginal e não
justifica o proxy sozinho.

## 6. Riscos e conflitos com a Vercel (resumo)

- **Certificado:** proxy laranja pode quebrar a validação/renovação automática do domínio na Vercel → começar DNS-only.
- **Cache duplo:** Cloudflare + Vercel decidindo TTL → conteúdo autenticado servido errado se não houver Bypass.
- **Headers duplicados:** CSP/HSTS na Cloudflare **e** no `next.config.ts` → conflito. Manter só no `next.config.ts`.
- **IP de origem:** sem True-Client-IP, o rate-limit da app e a auditoria (`ipAddress` do `AuditLog`) registram o IP da Cloudflare, não do usuário.
- **Latência:** dupla borda pode piorar TTFB — medir antes/depois.
- **Troubleshooting:** proxy adiciona uma camada opaca; dificulta diagnosticar 5xx (é Vercel ou Cloudflare?).

**Conclusão:** usar Cloudflare pelo que ela faz melhor **sem** proxy na app principal (DNS, DNSSEC,
Turnstile, Access no staging) e tratar o proxy laranja como decisão pós-lançamento, deliberada e
documentada.
