"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Providers globais da aplicação (docs/ARCHITECTURE.md ADR-0012).
 * Client Component isolado: o restante da árvore continua podendo usar Server Components.
 * Dark mode é o padrão; light mode é opcional via ThemeToggle (src/components/layout/theme-toggle.tsx).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delay={200}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
