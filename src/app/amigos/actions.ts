"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { FriendError, removeFriendship, respondFriendRequest, sendFriendRequest } from "@/lib/profiles";

export type FriendActionResult = { error?: string; done?: string };

async function run(fn: () => Promise<string | void>): Promise<FriendActionResult> {
  await requireUser();
  try {
    const done = await fn();
    revalidatePath("/", "layout");
    return { done: done ?? undefined };
  } catch (e) {
    if (e instanceof FriendError) return { error: e.message };
    throw e;
  }
}

export async function sendRequestAction(userId: string) {
  return run(async () =>
    (await sendFriendRequest(userId)) === "accepted"
      ? "Ya te había enviado una solicitud: ahora son amigos."
      : "Solicitud enviada.",
  );
}

export async function acceptRequestAction(requestId: string) {
  return run(() => respondFriendRequest(requestId, true));
}

export async function declineRequestAction(requestId: string) {
  return run(() => respondFriendRequest(requestId, false));
}

export async function removeFriendshipAction(userId: string) {
  return run(() => removeFriendship(userId));
}
