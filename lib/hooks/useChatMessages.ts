"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  player_id: string;
  team_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  players: {
    id: string;
    nickname: string;
  } | null;
  teams: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface ChatMessagesPage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

export function useChatMessages() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Track messages we've received via realtime to avoid duplicates
  const realtimeMessageIds = useRef<Set<string>>(new Set());

  // Infinite query for paginated history
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["chat-messages"],
    queryFn: async ({ pageParam }): Promise<ChatMessagesPage> => {
      let query = supabase
        .from("chat_messages")
        .select("*, players(id, nickname), teams(id, name, color)")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      // Cursor-based pagination: fetch messages older than cursor
      if (pageParam) {
        query = query.lt("created_at", pageParam);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // Determine next cursor (created_at of last message)
      const nextCursor =
        messages && messages.length === PAGE_SIZE
          ? messages[messages.length - 1].created_at
          : null;

      return {
        messages: (messages as ChatMessage[]) || [],
        nextCursor,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    staleTime: 60000, // 1 minute
  });

  // Flatten pages into single array, reversing to show oldest first
  const messages = useMemo(() => {
    if (!data?.pages) return [];

    // Collect all messages from all pages
    const allMessages = data.pages.flatMap((page) => page.messages);

    // Reverse to show oldest at top, newest at bottom (chat order)
    return allMessages.reverse();
  }, [data]);

  // Subscribe to new messages via realtime
  useEffect(() => {
    const channel = supabase
      .channel("chat-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Skip if we've already seen this message (e.g., from our own send)
          if (realtimeMessageIds.current.has(newMessage.id)) {
            return;
          }
          realtimeMessageIds.current.add(newMessage.id);

          // Fetch full message with relations
          const { data: fullMessage } = await supabase
            .from("chat_messages")
            .select("*, players(id, nickname), teams(id, name, color)")
            .eq("id", newMessage.id)
            .single();

          if (fullMessage) {
            // Prepend to first page (most recent messages)
            queryClient.setQueryData(
              ["chat-messages"],
              (
                old:
                  | { pages: ChatMessagesPage[]; pageParams: (string | null)[] }
                  | undefined
              ) => {
                if (!old?.pages?.length) return old;

                const newPages = [...old.pages];
                newPages[0] = {
                  ...newPages[0],
                  messages: [fullMessage as ChatMessage, ...newPages[0].messages],
                };

                return { ...old, pages: newPages };
              }
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to chat messages");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Add message optimistically (called after successful API response)
  const addOptimisticMessage = useCallback(
    (message: ChatMessage) => {
      // Mark as seen to prevent duplicate from realtime
      realtimeMessageIds.current.add(message.id);

      queryClient.setQueryData(
        ["chat-messages"],
        (
          old:
            | { pages: ChatMessagesPage[]; pageParams: (string | null)[] }
            | undefined
        ) => {
          if (!old?.pages?.length) {
            return {
              pages: [{ messages: [message], nextCursor: null }],
              pageParams: [null],
            };
          }

          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [message, ...newPages[0].messages],
          };

          return { ...old, pages: newPages };
        }
      );
    },
    [queryClient]
  );

  return {
    messages,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
    error,
    addOptimisticMessage,
  };
}
