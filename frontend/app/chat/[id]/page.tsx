"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown } from "lucide-react";
import { getChat } from "@/app/dashboard/actions";
import { getEvents, sendMessage } from "./actions";
import EventList from "@/components/chat/EventList";
import ChatInput from "@/components/chat/ChatInput";
import { InferSelectModel } from "drizzle-orm";
import { chats, modules, events } from "@/db/schema";
import { createClient } from "@/lib/supabase/client";

type ChatWithModule = InferSelectModel<typeof chats> & {
  module: InferSelectModel<typeof modules> | null;
};

type Event = InferSelectModel<typeof events>;

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  const [chat, setChat] = useState<ChatWithModule | null>(null);
  const [eventList, setEventList] = useState<Event[]>([]);
  const [sending, setSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    if (chatId) {
      getChat(chatId).then((data) => setChat(data || null));
      getEvents(chatId).then(setEventList);
    }
  }, [chatId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("events-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newEvent = {
            id: payload.new.id,
            chatId: payload.new.chat_id,
            eventType: payload.new.event_type,
            content: payload.new.content,
            metadata: payload.new.metadata,
            createdAt: new Date(payload.new.created_at),
          };
          setEventList((prev) => [...prev, newEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const handleSend = async (message: string) => {
    setSending(true);
    try {
      await sendMessage(chatId, message);
    } finally {
      setSending(false);
    }
  };

  const displayTitle = chat?.title || "Untitled chat";

  return (
    <main className="h-screen bg-morph-black flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-morph-border shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="font-display text-xl font-bold text-morph-white tracking-tighter"
          >
            PACT
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-morph-white/60 hover:text-morph-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Chat (35%) */}
        <div className="w-[35%] border-r border-morph-border flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b border-morph-border shrink-0">
            <h1 className="font-display text-lg text-morph-white">
              {displayTitle}
            </h1>
            {chat?.module && (
              <span className="text-xs font-mono text-morph-blue/60">
                {chat.module.name}
              </span>
            )}
          </div>

          {/* Event list */}
          <div className="relative flex-1">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="absolute inset-0 overflow-y-auto p-4 scrollbar-hide"
            >
              <EventList events={eventList} />
            </div>

            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 p-2 bg-morph-blue text-white rounded-full shadow-lg hover:bg-morph-blueDim transition-colors"
              >
                <ArrowDown size={18} />
              </button>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={sending} />
        </div>

        {/* Right side - Agent output panel (65%) — populated in Phase 9 */}
        <div className="w-[65%] bg-morph-dark flex items-center justify-center">
          <p className="text-morph-white/20 text-sm font-mono">agent output</p>
        </div>
      </div>
    </main>
  );
}
