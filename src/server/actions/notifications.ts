"use server";
import { z } from "zod";
import { fail, ok, type ActionResult, idSchema } from "@/contracts/common";
import { isDomainError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import {
  listMyNotifications,
  markMyNotificationRead,
  type NotificationPageDTO,
} from "@/server/services/navigation/notifications";
export async function listMyNotificationsAction(
  raw: unknown = {},
): Promise<ActionResult<NotificationPageDTO>> {
  try {
    const input = parseInput(z.object({ page: z.number().int().min(1).default(1) }), raw);
    return ok(await listMyNotifications(input.page));
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível carregar as notificações.");
  }
}
export async function markNotificationReadAction(raw: unknown): Promise<ActionResult<null>> {
  try {
    const input = parseInput(z.object({ id: idSchema }), raw);
    await markMyNotificationRead(input.id);
    return ok(null);
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível atualizar a notificação.");
  }
}
