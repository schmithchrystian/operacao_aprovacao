import type { NextConfig } from "next";

/**
 * Content-Security-Policy (revisão de segurança — hardening barato, docs/SECURITY.md).
 *
 * Diretiva por diretiva:
 * - `default-src 'self'` — fallback restritivo: qualquer tipo de recurso não listado abaixo
 *   só carrega da própria origem.
 * - `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` só em `development`) — o App
 *   Router injeta o payload do RSC/hidratação via `<script>` inline
 *   (`self.__next_f.push(...)`) sem nonce nesta fase (não há middleware de nonce
 *   configurado); `'unsafe-inline'` é necessário para o app hidratar. Em `next dev`, o
 *   Fast Refresh/Turbopack usa `eval()` para reconstruir stack traces de debug — SEM
 *   `'unsafe-eval'` o console loga (mas não quebra a página) "eval() is not supported...";
 *   por isso `'unsafe-eval'` é adicionado condicionalmente só em dev (`NODE_ENV`), nunca em
 *   produção — React confirma que "React will never use eval() in production mode".
 *   TODO(security): migrar para CSP com nonce por requisição (Next suporta via
 *   `middleware.ts` gerando um nonce e propagando em `headers()`) para remover
 *   `'unsafe-inline'` de `script-src` — ver pendência em docs/SECURITY.md.
 * - `style-src 'self' 'unsafe-inline'` — Tailwind v4 + componentes Radix/Base UI aplicam
 *   estilos inline (CSS-in-JS de posicionamento de popovers/tooltips); sem nonce de estilo
 *   configurado, `'unsafe-inline'` evita quebrar esses componentes.
 * - `img-src 'self' data: https:` — avatares/ícones podem vir de URLs remotas (ex.: upload
 *   de terceiros) além de assets locais e `data:` URIs (ex.: placeholders/base64).
 * - `font-src 'self'` — fontes via `next/font/google` (Geist) são baixadas em build e
 *   self-hosted pelo Next; nenhuma fonte é servida de CDN externo em runtime.
 * - `connect-src 'self'` — chamadas `fetch`/Server Actions ficam na própria origem (sem
 *   API de terceiros no MVP).
 * - `frame-ancestors 'none'` — reforça o `X-Frame-Options: DENY` abaixo (cobre navegadores
 *   que só respeitam CSP) — o app nunca deve ser embutido em `<iframe>` de terceiros.
 * - `base-uri 'self'` e `form-action 'self'` — bloqueia injeção de `<base>`/redirecionamento
 *   de formulário para origem externa (defesa em profundidade contra XSS).
 * - `object-src 'none'` — desativa plugins legados (`<object>`/`<embed>`), sem uso no app.
 */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    // Defesa contra MIME-sniffing (o navegador nunca reinterpreta o `Content-Type` declarado).
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Redundante com `frame-ancestors` da CSP, mas mantido para navegadores/proxies legados
    // que não avaliam CSP — bloqueia qualquer embed em `<iframe>`.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Nunca envia a URL completa (com query/path) como referrer para origem cruzada;
    // envia origem completa apenas em navegação same-origin e sobre HTTPS→HTTPS.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Desativa APIs sensíveis do navegador não usadas pelo app — reduz superfície mesmo se
    // um script de terceiro for injetado (ex.: dependência comprometida).
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    // Força HTTPS por 2 anos (incluindo subdomínios) e habilita pré-carregamento na lista
    // HSTS dos navegadores. Inofensivo em HTTP puro (dev local) — o navegador só aplica a
    // política quando a resposta chega por HTTPS.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplica a TODAS as rotas (páginas, Route Handlers, assets) — sem exceção por
        // domínio (CLAUDE.md §9/§24: hardening de borda, não seletivo por rota sensível).
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
