"use server";

import { db } from "@/db/index";
import { eq } from "drizzle-orm";
import { events, chats } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { runAgentTask } from "@/src/trigger/agent";

export async function getEvents(chatId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const records = await db.query.events.findMany({
    where: eq(events.chatId, chatId),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
  });

  return records;
}


export async function sendMessage(chatId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: { module: true },
  });

  if (!chat) throw new Error("Chat not found");

  const [userEvent] = await db
    .insert(events)
    .values({
      chatId,
      eventType: "user_input",
      content: message,
      metadata: {},
    })
    .returning();

  const history = await db.query.events.findMany({
    where: eq(events.chatId, chatId),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
  });

  await runAgentTask.trigger({
    scenario: "happy_path",
    chatId,
  });

  return userEvent;
}
