"use client";

import { useState, useTransition } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogPageDTO } from "@/contracts/admin-audit";
import { listAuditLogAction } from "@/server/actions/admin/audit";

interface AuditLogTableProps {
  initialPage: AuditLogPageDTO;
}

interface Filters {
  operation: string;
  entity: string;
  userId: string;
  result: "" | "success" | "failure";
}

const EMPTY_FILTERS: Filters = { operation: "", entity: "", userId: "", result: "" };

/**
 * Tabela de auditoria (Fase 17 — item 6 da tarefa), paginada e filtrável. Client Component:
 * chama `listAuditLogAction` de novo a cada mudança de filtro/página (mesma Server Action usada
 * pela carga inicial no servidor) — nenhuma lógica de filtragem/paginação acontece no cliente,
 * só repassa os parâmetros e exibe o resultado.
 */
export function AuditLogTable({ initialPage }: AuditLogTableProps) {
  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchPage = (nextPage: number, nextFilters: Filters) => {
    startTransition(async () => {
      const result = await listAuditLogAction({
        page: nextPage,
        pageSize: page.pageSize,
        operation: nextFilters.operation || undefined,
        entity: nextFilters.entity || undefined,
        userId: nextFilters.userId || undefined,
        result: nextFilters.result || undefined,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setPage(result.data);
    });
  };

  const applyFilters = () => fetchPage(1, filters);
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-operation">Operação</Label>
          <Input
            id="audit-filter-operation"
            placeholder="ex.: admin.courses.archive"
            value={filters.operation}
            onChange={(e) => setFilters((prev) => ({ ...prev, operation: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-entity">Entidade</Label>
          <Input
            id="audit-filter-entity"
            placeholder="ex.: Course"
            value={filters.entity}
            onChange={(e) => setFilters((prev) => ({ ...prev, entity: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-user">ID do usuário</Label>
          <Input
            id="audit-filter-user"
            value={filters.userId}
            onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-filter-result">Resultado</Label>
          <NativeSelect
            id="audit-filter-result"
            value={filters.result}
            onChange={(e) => setFilters((prev) => ({ ...prev, result: e.target.value as Filters["result"] }))}
          >
            <option value="">Todos</option>
            <option value="success">Sucesso</option>
            <option value="failure">Falha</option>
          </NativeSelect>
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" onClick={applyFilters} disabled={isPending}>
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              fetchPage(1, EMPTY_FILTERS);
            }}
          >
            Limpar
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : page.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum registro encontrado" description="Ajuste os filtros e tente novamente." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID da entidade</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Correlação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((entry, index) => (
                <TableRow key={`${entry.correlationId}-${index}`}>
                  <TableCell className="font-mono text-xs">{entry.operation}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.entity}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{entry.entityId ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{entry.userId ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        entry.result === "success"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {entry.result === "success" ? "Sucesso" : "Falha"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{entry.correlationId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Página {page.page} de {totalPages} · {page.total} registro(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || page.page <= 1}
                onClick={() => fetchPage(page.page - 1, filters)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || page.page >= totalPages}
                onClick={() => fetchPage(page.page + 1, filters)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
