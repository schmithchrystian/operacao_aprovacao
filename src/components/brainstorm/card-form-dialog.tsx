"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
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
import { BRAINSTORM_LIMITS } from "@/config/business";
import {
  brainstormCardPrioritySchema,
  brainstormCardTypeSchema,
  type BrainstormCardDTO,
} from "@/contracts/brainstorm";
import type { SubjectOptionDTO, TopicOptionDTO } from "@/contracts/simulations";
import { createCardAction, updateCardAction } from "@/server/actions/brainstorm";
import { listTopicOptionsAction } from "@/server/actions/simulations";
import { CARD_PRIORITY_LABEL, CARD_TYPE_LABEL } from "./labels";

/** O que o dialog está criando/editando — `columnTitle`/`card` só para exibição (o backend
 *  resolve dono/coluna de novo a partir de `columnId`/`cardId`, nunca confia nestes textos). */
export type CardFormTarget =
  | { mode: "create"; columnId: string; columnTitle: string }
  | { mode: "edit"; card: BrainstormCardDTO };

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CardFormTarget | null;
  subjects: SubjectOptionDTO[];
  onCreated: (card: BrainstormCardDTO) => void;
  onUpdated: (card: BrainstormCardDTO) => void;
}

function targetKey(target: CardFormTarget): string {
  return target.mode === "edit" ? `edit:${target.card.id}` : `create:${target.columnId}`;
}

/**
 * Dialog de criar/editar cartão do Brainstorm (Fase 13 — UI do agente `frontend`). Shell fino:
 * mantém o `Dialog` sempre montado (não corta a transição de saída do Base UI) e só decide
 * QUANDO existe conteúdo para mostrar (`target` nulo antes do primeiro uso). O formulário
 * (`CardForm`) é remontado via `key={targetKey}` a cada NOVO alvo — outro cartão para editar, ou
 * outra coluna para criar — garantindo `defaultValues` sempre frescos sem precisar de um
 * `reset()` manual em efeito (e sem nenhum flash do alvo anterior).
 */
export function CardFormDialog({ open, onOpenChange, target, subjects, onCreated, onUpdated }: CardFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="card-form-dialog-description"
        className="max-h-[85vh] max-w-lg overflow-y-auto"
      >
        {target ? (
          <CardForm
            key={targetKey(target)}
            target={target}
            subjects={subjects}
            onCreated={onCreated}
            onUpdated={onUpdated}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const cardFormSchema = z.object({
  type: brainstormCardTypeSchema,
  title: z
    .string()
    .trim()
    .min(1, "Informe um título.")
    .max(BRAINSTORM_LIMITS.cardTitleMaxLength, "Título muito longo."),
  content: z.string().max(BRAINSTORM_LIMITS.cardContentMaxLength, "Conteúdo muito longo."),
  tagsText: z.string(),
  subjectId: z.string(),
  topicId: z.string(),
  priority: brainstormCardPrioritySchema,
});
type CardFormValues = z.infer<typeof cardFormSchema>;

/** Mapeia o nome do campo devolvido em `fieldErrors` (server, `@/contracts/brainstorm`) para o
 *  campo do formulário — só `tags` (server) -> `tagsText` (cliente, texto bruto) diverge. */
const SERVER_TO_CLIENT_FIELD: Record<string, keyof CardFormValues> = {
  type: "type",
  title: "title",
  content: "content",
  tags: "tagsText",
  subjectId: "subjectId",
  topicId: "topicId",
  priority: "priority",
};

/** Converte o texto "a, b, b, c" em `["a", "b", "c"]` — trim + remove vazios e duplicatas.
 *  `createCardAction`/`updateCardAction` revalidam tamanho/quantidade (`BRAINSTORM_LIMITS`) no
 *  servidor de qualquer forma (CLAUDE.md §9 — nunca confiar só na validação do cliente). */
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

function buildDefaultValues(target: CardFormTarget): CardFormValues {
  if (target.mode === "create") {
    return { type: "IDEIA", title: "", content: "", tagsText: "", subjectId: "", topicId: "", priority: "MEDIUM" };
  }
  const { card } = target;
  return {
    type: card.type,
    title: card.title,
    content: card.content ?? "",
    tagsText: card.tags.join(", "),
    subjectId: card.subjectId ?? "",
    topicId: card.topicId ?? "",
    priority: card.priority,
  };
}

/** Semeia a lista de assuntos com o assunto ATUAL do cartão (já denormalizado em
 *  `BrainstormCardDTO.topicName`) — evita a corrida "select mostra em branco" entre o primeiro
 *  render (antes de `listTopicOptionsAction` responder) e a lista real chegar: como o valor
 *  inicial do `<select>` só "gruda" se a opção já existir no DOM na hora em que o React Hook Form
 *  aplica o `defaultValue`, precisamos de UMA opção válida já na primeira renderização. */
function seedTopicsResult(target: CardFormTarget): { subjectId: string; items: TopicOptionDTO[] } | null {
  if (target.mode === "edit" && target.card.subjectId && target.card.topicId && target.card.topicName) {
    return {
      subjectId: target.card.subjectId,
      items: [{ id: target.card.topicId, subjectId: target.card.subjectId, name: target.card.topicName }],
    };
  }
  return null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

interface CardFormProps {
  target: CardFormTarget;
  subjects: SubjectOptionDTO[];
  onCreated: (card: BrainstormCardDTO) => void;
  onUpdated: (card: BrainstormCardDTO) => void;
  onOpenChange: (open: boolean) => void;
}

function CardForm({ target, subjects, onCreated, onUpdated, onOpenChange }: CardFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [topicsResult, setTopicsResult] = useState<{ subjectId: string; items: TopicOptionDTO[] } | null>(() =>
    seedTopicsResult(target),
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: buildDefaultValues(target),
  });

  const subjectId = useWatch({ control, name: "subjectId" });

  // Busca os assuntos da matéria selecionada (dependente, mesmo padrão de
  // `MockExamBuilderForm`/`listTopicOptionsAction`). Guard de cancelamento evita "race" ao trocar
  // a matéria rapidamente.
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

    function applyFieldErrors(fieldErrors?: Record<string, string[]>) {
      if (!fieldErrors) return;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const firstMessage = messages[0];
        const clientField = SERVER_TO_CLIENT_FIELD[field];
        if (firstMessage && clientField) {
          setError(clientField, { message: firstMessage });
        }
      }
    }

    startTransition(async () => {
      if (target.mode === "create") {
        const result = await createCardAction({
          columnId: target.columnId,
          type: values.type,
          title: values.title,
          content: values.content.trim() ? values.content : undefined,
          tags,
          subjectId: values.subjectId || undefined,
          topicId: values.topicId || undefined,
          priority: values.priority,
        });

        if (!result.ok) {
          applyFieldErrors(result.error.fieldErrors);
          setFormError(result.error.message);
          return;
        }

        toast.success("Cartão criado.");
        onCreated(result.data);
        onOpenChange(false);
        return;
      }

      const result = await updateCardAction({
        cardId: target.card.id,
        type: values.type,
        title: values.title,
        content: values.content.trim() ? values.content : null,
        tags,
        subjectId: values.subjectId || null,
        topicId: values.topicId || null,
        priority: values.priority,
      });

      if (!result.ok) {
        applyFieldErrors(result.error.fieldErrors);
        setFormError(result.error.message);
        return;
      }

      toast.success("Cartão atualizado.");
      onUpdated(result.data);
      onOpenChange(false);
    });
  });

  const dialogTitle = target.mode === "create" ? `Novo cartão em "${target.columnTitle}"` : "Editar cartão";
  const dialogDescription =
    target.mode === "create"
      ? "Preencha os campos abaixo para adicionar um cartão a esta coluna."
      : "Atualize os campos do cartão e salve.";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription id="card-form-dialog-description">{dialogDescription}</DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="card-form-title">Título</Label>
          <Input id="card-form-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-form-type">Tipo</Label>
            <NativeSelect id="card-form-type" aria-invalid={Boolean(errors.type)} {...register("type")}>
              {brainstormCardTypeSchema.options.map((value) => (
                <option key={value} value={value}>
                  {CARD_TYPE_LABEL[value]}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.type?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-form-priority">Prioridade</Label>
            <NativeSelect id="card-form-priority" aria-invalid={Boolean(errors.priority)} {...register("priority")}>
              {brainstormCardPrioritySchema.options.map((value) => (
                <option key={value} value={value}>
                  {CARD_PRIORITY_LABEL[value]}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.priority?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-form-content">Conteúdo (opcional)</Label>
          <textarea
            id="card-form-content"
            rows={4}
            aria-invalid={Boolean(errors.content)}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-20 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3"
            {...register("content")}
          />
          <FieldError message={errors.content?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-form-tags">Tags (separadas por vírgula)</Label>
          <Input id="card-form-tags" placeholder="Ex.: constitucional, revisão" {...register("tagsText")} />
          <FieldError message={errors.tagsText?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-form-subject">Matéria (opcional)</Label>
            <NativeSelect
              id="card-form-subject"
              aria-invalid={Boolean(errors.subjectId)}
              {...register("subjectId", { onChange: () => setValue("topicId", "") })}
            >
              <option value="">Nenhuma</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.subjectId?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-form-topic">Assunto (opcional)</Label>
            <NativeSelect
              id="card-form-topic"
              disabled={!subjectId || topicsLoading}
              aria-invalid={Boolean(errors.topicId)}
              {...register("topicId")}
            >
              <option value="">
                {!subjectId ? "Selecione uma matéria primeiro" : topicsLoading ? "Carregando..." : "Nenhum"}
              </option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.topicId?.message} />
          </div>
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
            {target.mode === "create" ? <Plus aria-hidden="true" /> : <Save aria-hidden="true" />}
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
