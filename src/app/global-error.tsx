"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary de nível raiz: captura erros lançados no próprio root `layout.tsx`
 * / `providers.tsx`, que o `error.tsx` de segmento não alcança. Substitui todo o
 * documento, portanto renderiza suas próprias tags <html>/<body> e não depende do
 * ThemeProvider nem de estilos de app. Não expõe stack trace ao usuário (CLAUDE.md §9/§24).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0e",
          color: "#f2f3f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Algo deu errado
          </h1>
          <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#f2b90c",
              color: "#0b0c0e",
              border: "none",
              borderRadius: 8,
              padding: "0.6rem 1.2rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
