"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { LessonNoteDTO } from "@/contracts/lesson-notes";
import { getLessonNoteAction, saveLessonNoteAction } from "@/server/actions/lesson-notes";

export function LessonNotes({ lessonId }: { lessonId: string }) {
  return <NotesEditor key={lessonId} lessonId={lessonId} />;
}
function NotesEditor({ lessonId }: { lessonId: string }) {
  const textareaId = useId();
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<LessonNoteDTO | null>(null);
  const [conflict, setConflict] = useState<LessonNoteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const notesRef = useRef("");
  const savedRef = useRef<LessonNoteDTO | null>(null);
  const alive = useRef(true);
  const dirty = saved !== null && notes !== saved.content;
  const load = useCallback(async () => {
    try {
      const result = await getLessonNoteAction({ lessonId });
      if (!alive.current) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      savedRef.current = result.data;
      notesRef.current = result.data.content;
      setSaved(result.data);
      setNotes(result.data.content);
      setError(null);
    } catch {
      if (alive.current) setError("Não foi possível carregar as anotações.");
    }
  }, [lessonId]);
  useEffect(() => {
    alive.current = true;
    getLessonNoteAction({ lessonId })
      .then((result) => {
        if (!alive.current) return;
        if (result.ok) {
          savedRef.current = result.data;
          notesRef.current = result.data.content;
          setSaved(result.data);
          setNotes(result.data.content);
          setError(null);
        } else setError(result.error.message);
      })
      .catch(() => {
        if (alive.current) setError("Não foi possível carregar as anotações.");
      });
    return () => {
      alive.current = false;
    };
  }, [lessonId]);

  const save = useCallback(
    async (expectedVersion?: number): Promise<boolean> => {
      while (inFlight.current) {
        if (!(await inFlight.current)) return false;
      }
      const snapshot = savedRef.current;
      if (!snapshot) return false;
      const content = notesRef.current;
      if (content === snapshot.content && expectedVersion === undefined) return true;
      setSaving(true);
      setError(null);
      const operation = (async () => {
        try {
          const result = await saveLessonNoteAction({
            lessonId,
            content,
            expectedVersion: expectedVersion ?? snapshot.version,
          });
          if (result.ok) {
            savedRef.current = result.data;
            if (alive.current) {
              setSaved(result.data);
              setConflict(null);
            }
            return true;
          }
          if (alive.current) {
            if (result.error.code === "CONFLICT") {
              setError("Outra janela alterou estas anotações. Seu texto foi preservado.");
              const latest = await getLessonNoteAction({ lessonId });
              if (alive.current && latest.ok) setConflict(latest.data);
            } else setError(result.error.message);
          }
          return false;
        } catch {
          if (alive.current)
            setError("Não foi possível salvar. Seu texto continua aqui; tente novamente.");
          return false;
        } finally {
          if (alive.current) setSaving(false);
        }
      })();
      inFlight.current = operation;
      try {
        return await operation;
      } finally {
        if (inFlight.current === operation) inFlight.current = null;
      }
    },
    [lessonId],
  );

  useEffect(() => {
    if (!dirty) return;
    let navigating = false;
    const currentUrl = window.location.href;
    const currentState = window.history.state;
    const flush = async () => {
      while (notesRef.current !== savedRef.current?.content) {
        if (!(await save())) return false;
      }
      return true;
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.download ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const target = new URL(anchor.href, currentUrl);
      if (
        target.origin !== window.location.origin ||
        target.pathname + target.search === window.location.pathname + window.location.search
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (navigating) return;
      navigating = true;
      void flush().then((success) => {
        if (success) router.push(target.pathname + target.search + target.hash);
        else navigating = false;
      });
    };
    const back = (event: PopStateEvent) => {
      const target = window.location.href;
      if (target === currentUrl) return;
      event.stopImmediatePropagation();
      // The browser already changed the URL; keep the editor mounted until its save succeeds.
      window.history.replaceState(currentState, "", currentUrl);
      if (navigating) return;
      navigating = true;
      void flush().then((success) => {
        if (success) router.replace(target);
        else navigating = false;
      });
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", back, true);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", back, true);
    };
  }, [dirty, router, save]);

  useEffect(() => {
    if (!dirty || saving || error || conflict) return;
    const timer = setTimeout(() => {
      void save();
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, saving, error, conflict, save]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <NotebookPen className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        <CardTitle className="text-sm font-medium">Minhas anotações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor={textareaId} className="sr-only">
          Anotações desta aula
        </Label>
        <textarea
          id={textareaId}
          value={notes}
          disabled={!saved}
          maxLength={50000}
          onChange={(event) => {
            notesRef.current = event.target.value;
            setNotes(event.target.value);
          }}
          placeholder="Escreva aqui suas anotações sobre esta aula..."
          rows={5}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
        />
        <p role="status" className="text-muted-foreground text-xs">
          {saving
            ? "Salvando…"
            : !saved
              ? "Carregando anotações…"
              : dirty
                ? "Alterações ainda não salvas."
                : "Anotações salvas."}
        </p>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {conflict ? (
          <div className="space-y-2 rounded border p-3">
            <p className="text-sm font-medium">Versão salva em outra janela</p>
            <pre className="max-h-40 overflow-auto text-xs whitespace-pre-wrap">
              {conflict.content || "Sem anotações."}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void save(conflict.version)}
              >
                Salvar minha versão
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  notesRef.current = conflict.content;
                  savedRef.current = conflict;
                  setNotes(conflict.content);
                  setSaved(conflict);
                  setConflict(null);
                  setError(null);
                }}
              >
                Usar versão salva
              </Button>
            </div>
          </div>
        ) : saved ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            Salvar anotações
          </Button>
        ) : error ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Tentar novamente
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
