"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { flashcardDifficultySchema, type DeckDTO, type FlashcardDTO } from "@/contracts/flashcards";
import type { SubjectOptionDTO, TopicOptionDTO } from "@/contracts/simulations";
import { createCardAction } from "@/server/actions/flashcards";
import { listTopicOptionsAction } from "@/server/actions/simulations";

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Baralhos elegíveis para receber o novo cartão — só baralhos PRÓPRIOS do aluno (nunca um
   *  baralho de matéria/sistema nem o "Favoritos" sintetizado). O filtro aqui é só conveniência
   *  de UI: `createCardAction`/`loadOwnedDeck` sempre revalidam a posse no servidor (404
   *  anti-IDOR caso contrário) — ver `@/components/flashcards/flashcards-workspace.tsx`. */
  decks: DeckDTO[];
  subjects: SubjectOptionDTO[];
  onCreated: (card: FlashcardDTO) => void;
}

/** Schema client-side cobre só a validação "imediata" (pergunta/resposta/baralho obrigatórios) —
 *  os limites de tamanho reais (`createFlashcardInputSchema`, `@/contracts/flashcards`) não são
 *  duplicados aqui; o servidor sempre revalida e devolve `fieldErrors` (CLAUDE.md §9). */
const formSchema = z.object({
  deckId: z.string().min(1, "Selecione um baralho."),
  question: z.string().trim().min(1, "Informe a pergunta."),
  answer: z.string().trim().min(1, "Informe a resposta."),
  subjectId: z.string(),
  topicId: z.string(),
  difficulty: flashcardDifficultySchema,
  tagsText: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormValues = {
  deckId: "",
  question: "",
  answer: "",
  subjectId: "",
  topicId: "",
  difficulty: "MEDIUM",
  tagsText: "",
};

/** Mapeia o nome do campo devolvido em `fieldErrors` (servidor) para o campo do formulário — só
 *  `tags` (servidor) -> `tagsText` (cliente, texto bruto) diverge. Mesmo padrão de
 *  `@/components/brainstorm/card-form-dialog.tsx`. */
const SERVER_TO_CLIENT_FIELD: Record<string, keyof FormValues> = {
  deckId: "deckId",
  question: "question",
  answer: "answer",
  subjectId: "subjectId",
  topicId: "topicId",
  difficulty: "difficulty",
  tags: "tagsText",
};

/** Converte "a, b, b, c" em `["a", "b", "c"]` — trim + remove vazios e duplicatas. O servidor
 *  revalida tamanho/quantidade de tags de qualquer forma. */
function parseTagsText(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/**
 * Dialog "Criar cartão" (Fase 14 — UI, item 3 da tarefa). Mesmo padrão de
 * `@/components/brainstorm/card-form-dialog.tsx` (matéria -> assunto dependente, via
 * `listTopicOptionsAction`).
 *
 * SÓ CRIAÇÃO: o backend desta fase não expõe uma action de EDIÇÃO de cartão
 * (`src/server/actions/flashcards.ts` só tem `createCardAction` — sem `updateCardAction`).
 * Editar um cartão existente fica como pendência para uma fase futura do backend; este dialog
 * não fabrica um endpoint que não existe (CLAUDE.md — "reutilizar contratos existentes").
 *
 * `deckId` sempre começa vazio (nenhum baralho pré-selecionado) — obriga uma escolha deliberada
 * em vez de assumir silenciosamente "o primeiro baralho da lista" (que poderia ser, por exemplo,
 * o baralho "Criados do caderno de erros" em vez do baralho que o aluno realmente pretende usar).
 */
export function CardFormDialog({ open, onOpenChange, decks, subjects, onCreated }: CardFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [topicsResult, setTopicsResult] = useState<{ subjectId: string; items: TopicOptionDTO[] } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  const subjectId = useWatch({ control, name: "subjectId" });

  // Busca os assuntos da matéria selecionada (dependente, mesmo padrão de
  // `@/components/brainstorm/card-form-dialog.tsx`/`MockExamBuilderForm`). Guard de cancelamento
  // evita "race" ao trocar a matéria rapidamente.
  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;

    listTopicOptionsAction({ subjectId }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTopicsResult({ subjectId, items: result.data });
      } else {
        setTopicsResult({ subjectId, items: [] });
        toast.error(result.error.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const topics = topicsResult?.subjectId === subjectId ? topicsResult.items : [];
  const topicsLoading = subjectId !== "" && topicsResult?.subjectId !== subjectId;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const tags = parseTagsText(values.tagsText);

    startTransition(async () => {
      const result = await createCardAction({
        deckId: values.deckId,
        question: values.question,
        answer: values.answer,
        subjectId: values.subjectId || undefined,
        topicId: values.topicId || undefined,
        difficulty: values.difficulty,
        tags,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            const clientField = SERVER_TO_CLIENT_FIELD[field];
            if (message && clientField) {
              setError(clientField, { message });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Cartão criado.");
      reset({ ...EMPTY_VALUES, deckId: values.deckId });
      setTopicsResult(null);
      onOpenChange(false);
      onCreated(result.data);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="flashcard-form-dialog-description"
        className="max-h-[85vh] max-w-lg overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Novo cartão</DialogTitle>
          <DialogDescription id="flashcard-form-dialog-description">
            Preencha a pergunta e a resposta — matéria, assunto, dificuldade e tags ajudam a organizar a
            revisão depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flashcard-form-deck">Baralho</Label>
            <NativeSelect id="flashcard-form-deck" aria-invalid={Boolean(errors.deckId)} {...register("deckId")}>
              <option value="" disabled>
                Selecione um baralho
              </option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.title}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.deckId?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flashcard-form-question">Pergunta</Label>
            <textarea
              id="flashcard-form-question"
              rows={2}
              aria-invalid={Boolean(errors.question)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-16 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3"
              {...register("question")}
            />
            <FieldError message={errors.question?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flashcard-form-answer">Resposta</Label>
            <textarea
              id="flashcard-form-answer"
              rows={3}
              aria-invalid={Boolean(errors.answer)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-20 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3"
              {...register("answer")}
            />
            <FieldError message={errors.answer?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-form-subject">Matéria (opcional)</Label>
              <NativeSelect
                id="flashcard-form-subject"
                {...register("subjectId", { onChange: () => setValue("topicId", "") })}
              >
                <option value="">Nenhuma</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="flashcard-form-topic">Assunto (opcional)</Label>
              <NativeSelect id="flashcard-form-topic" disabled={!subjectId || topicsLoading} {...register("topicId")}>
                <option value="">
                  {!subjectId ? "Selecione uma matéria primeiro" : topicsLoading ? "Carregando..." : "Nenhum"}
                </option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flashcard-form-difficulty">Dificuldade</Label>
            <NativeSelect id="flashcard-form-difficulty" {...register("difficulty")}>
              {flashcardDifficultySchema.options.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTY_LABEL[value]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flashcard-form-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="flashcard-form-tags"
              placeholder="Ex.: constitucional, revisão"
              aria-invalid={Boolean(errors.tagsText)}
              {...register("tagsText")}
            />
            <FieldError message={errors.tagsText?.message} />
          </div>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              <Plus aria-hidden="true" />
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
