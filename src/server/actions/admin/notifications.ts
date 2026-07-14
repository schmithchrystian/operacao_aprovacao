"use server";

import { broadcastNotificationInputSchema, type BroadcastResultDTO } from "@/contracts/admin-notifications";
import { ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { broadcastNotificationForAdmin } from "@/server/services/admin/notification-service";
import { toActionError } from "./shared";

/** Server Action fina — publicar aviso (broadcast). */
export async function broadcastNotificationAction(rawInput: unknown): Promise<ActionResult<BroadcastResultDTO>> {
  try {
    const input = parseInput(broadcastNotificationInputSchema, rawInput);
    const result = await broadcastNotificationForAdmin(input, new Date());
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
