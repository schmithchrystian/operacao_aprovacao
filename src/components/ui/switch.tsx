"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/**
 * Wrapper fino sobre `@base-ui/react/switch` (mesmo padrão de `progress.tsx`/`tooltip.tsx`:
 * `data-slot` + `cn` por cima do primitivo, sem lógica própria). Não existia um componente de
 * switch em `ui/` até a Fase 16 (perfil/privacidade) — `@base-ui/react` já é dependência do
 * projeto e expõe `switch`, então esta é a mesma família de primitivos usada pelo resto de
 * `components/ui/*` (evita puxar um pacote novo só para isto, e mantém o estilo "base-nova"
 * consistente com Avatar/Dialog/Progress/Tooltip).
 *
 * Estado (marcado/desmarcado) é exposto pelo Base UI via atributo de presença `data-checked`
 * (ver `node_modules/@base-ui/react/switch/root/SwitchRootDataAttributes.d.ts`) — o mesmo
 * mecanismo de variantes Tailwind já usado em `data-open`/`data-closed` de `tooltip.tsx`.
 *
 * Renderiza um `<span role="switch">` + um `<input>` oculto associado (documentação do Base UI)
 * — a label externa (`<Label htmlFor>`) e o `aria-checked` ficam a cargo do primitivo, nenhum
 * cuidado extra necessário aqui além de repassar `id`/`aria-*` recebidos via props.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-checked:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/60",
        className,
      )}
      {...props}
    >
      <SwitchThumb />
    </SwitchPrimitive.Root>
  )
}

function SwitchThumb({ className, ...props }: SwitchPrimitive.Thumb.Props) {
  return (
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className={cn(
        "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-xs transition-transform",
        "data-checked:translate-x-[18px]",
        className,
      )}
      {...props}
    />
  )
}

export { Switch, SwitchThumb }
