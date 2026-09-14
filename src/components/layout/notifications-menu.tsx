"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listMyNotificationsAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";
import type { NotificationPageDTO } from "@/server/services/navigation/notifications";
export function NotificationsMenu() {
  const [data, setData] = useState<NotificationPageDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async (page = 1) => {
    const request = ++requestId.current;
    setBusy(true);
    try {
      const result = await listMyNotificationsAction({ page });
      if (request !== requestId.current) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else setError(result.error.message);
    } catch {
      setError("Não foi possível carregar as notificações.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    const request = ++requestId.current;
    listMyNotificationsAction({ page: 1 })
      .then((result) => {
        if (request !== requestId.current) return;
        if (result.ok) {
          setData(result.data);
          setError(null);
        } else setError(result.error.message);
      })
      .catch(() => {
        if (request === requestId.current) setError("Não foi possível carregar as notificações.");
      });
    return () => {
      requestId.current += 1;
    };
  }, []);
  async function markRead(id: string) {
    setBusy(true);
    try {
      const result = await markNotificationReadAction({ id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      await load(data?.page ?? 1);
    } catch {
      setError("Não foi possível atualizar a notificação.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notificações${data?.unreadCount ? `: ${data.unreadCount} não lidas` : ""}`}
            className="relative"
          />
        }
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {data && data.unreadCount > 0 ? (
          <span
            className="bg-primary absolute top-1 right-1 h-2 w-2 rounded-full"
            aria-hidden="true"
          />
        ) : null}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>Seus avisos e atualizações.</DialogDescription>
        </DialogHeader>
        {error ? (
          <div role="alert" className="space-y-2">
            <p>{error}</p>
            <Button disabled={busy} onClick={() => void load(data?.page ?? 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {!data && busy ? <p role="status">Carregando…</p> : null}
        {data?.items.length === 0 ? <p>Nenhuma notificação por enquanto.</p> : null}
        <ul className="max-h-96 space-y-3 overflow-auto">
          {data?.items.map((item) => (
            <li key={item.id} className="space-y-1 rounded border p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm whitespace-pre-wrap">{item.message}</p>
              <time className="text-muted-foreground text-xs" dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString("pt-BR")}
              </time>
              {item.isRead ? (
                <p className="text-muted-foreground text-xs">Lida</p>
              ) : (
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void markRead(item.id)}
                  >
                    Marcar como lida
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {data && data.total > 20 ? (
          <nav aria-label="Páginas de notificações" className="flex justify-between">
            <Button disabled={busy || data.page === 1} onClick={() => void load(data.page - 1)}>
              Anterior
            </Button>
            <span>Página {data.page}</span>
            <Button
              disabled={busy || data.page * 20 >= data.total}
              onClick={() => void load(data.page + 1)}
            >
              Próxima
            </Button>
          </nav>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
