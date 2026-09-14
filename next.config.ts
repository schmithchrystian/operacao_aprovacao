import type { NextConfig } from "next";

const securityHeaders = [
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
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
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
