"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary de segmento do App Router (captura erros das rotas, não do root
 * layout — este é coberto por `global-error.tsx`). Client Component (exigência do Next.js).
 * Não expõe stack trace ao usuário (CLAUDE.md §9/§24) — apenas registra no console
 * para diagnóstico local; logging estruturado real chega com a camada de servidor.
 */
export default function AppError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <ErrorState onRetry={reset} />
      </div>
    </div>
  );
}
