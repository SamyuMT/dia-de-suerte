"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  FriendError,
  NICKNAME_PATTERN,
  findByNickname,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/profiles";
import type { DirectoryEntry } from "@/types/memory";

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

/** Busca un apodo exacto. */
export async function findNicknameAction(
  nickname: string,
): Promise<{ found: DirectoryEntry | null; error?: string }> {
  await requireUser();
  const clean = nickname.trim();
  if (!NICKNAME_PATTERN.test(clean)) {
    return { found: null, error: "Escribe el apodo completo, tal como lo tiene esa persona (sin espacios)." };
  }
  return { found: await findByNickname(clean) };
}

export async function sendRequestAction(userId: string) {
  return run(async () =>
    (await sendFriendRequest(userId)) === "accepted"
      ? "Ya te había enviado una solicitud, así que ahora son amigos."
      : "Cuando la acepte, podrán compartirse recuerdos.",
  );
}

export async function acceptRequestAction(requestId: string) {
  return run(async () => {
    await respondFriendRequest(requestId, true);
    return "Ahora son amigos y pueden compartirse recuerdos.";
  });
}

export async function declineRequestAction(requestId: string) {
  return run(async () => {
    await respondFriendRequest(requestId, false);
    return "La solicitud se rechazó.";
  });
}

export async function removeFriendshipAction(userId: string) {
  return run(async () => {
    await removeFriendship(userId);
    return "Listo.";
  });
}
