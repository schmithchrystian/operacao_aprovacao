import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const { list, mark } = vi.hoisted(() => ({ list: vi.fn(), mark: vi.fn() }));
vi.mock("@/server/actions/notifications", () => ({
  listMyNotificationsAction: list,
  markNotificationReadAction: mark,
}));
import { NotificationsMenu } from "@/components/layout/notifications-menu";
const notification = {
  id: "n1",
  title: "Nova aula",
  message: "Uma aula foi publicada",
  isRead: false,
  createdAt: "2026-09-13T12:00:00Z",
};
beforeEach(() => {
  cleanup();
  list.mockReset();
  mark.mockReset();
  list.mockResolvedValue({
    ok: true,
    data: { items: [notification], unreadCount: 1, total: 1, page: 1 },
  });
});
it("opens via keyboard, displays actual notifications and persists read state", async () => {
  const user = userEvent.setup();
  render(<NotificationsMenu />);
  const trigger = await screen.findByRole("button", { name: "Notificações: 1 não lidas" });
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog");
  await screen.findByText("Nova aula");
  mark.mockResolvedValue({ ok: true, data: null });
  list.mockResolvedValue({
    ok: true,
    data: { items: [{ ...notification, isRead: true }], unreadCount: 0, total: 1, page: 1 },
  });
  await user.click(screen.getByRole("button", { name: "Marcar como lida" }));
  await waitFor(() => expect(mark).toHaveBeenCalledWith({ id: "n1" }));
  await screen.findByText("Lida");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
