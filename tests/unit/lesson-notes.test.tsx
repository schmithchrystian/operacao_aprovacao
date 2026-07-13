import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonNotes } from "@/components/lessons/lesson-notes";

describe("LessonNotes", () => {
  it("permite digitar anotações localmente", async () => {
    const user = userEvent.setup();
    render(<LessonNotes lessonId="lesson-1" />);

    const textarea = screen.getByPlaceholderText(/escreva aqui suas anotações/i) as HTMLTextAreaElement;
    await user.type(textarea, "Rever artigo 5º da CF.");

    expect(textarea.value).toBe("Rever artigo 5º da CF.");
    expect(screen.getByText(/salvamento permanente ainda não está disponível/i)).toBeTruthy();
  });
});
