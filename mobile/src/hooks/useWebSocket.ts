import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/use-session";
import type { Message } from "@/types";

export function useWebSocket(chatUserId: string, onTypingReceived?: () => void) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const token = (session as { session?: { token?: string } } | null)?.session?.token;
    if (!token) return;

    const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL ?? "").replace(
      /^(https?)/,
      (p) => (p === "https" ? "wss" : "ws")
    );
    if (!backendUrl) return;

    try {
      const ws = new WebSocket(`${backendUrl}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            message?: Message;
            senderId?: string;
          };
          if (data.type === "new_message" && data.message) {
            const msg = data.message;
            const partnerId =
              msg.senderId === session?.user?.id ? msg.receiverId : msg.senderId;
            queryClient.setQueryData<Message[]>(["messages", partnerId], (old) => {
              if (!old) return [msg];
              if (old.some((m) => m.id === msg.id)) return old;
              return [msg, ...old];
            });
            void queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
          if (data.type === "typing") {
            onTypingReceived?.();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 4000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (e.g. web proxy restriction); silently ignore
    }
  }, [session, chatUserId, queryClient, onTypingReceived]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", receiverId: chatUserId })
      );
    }
  }, [chatUserId]);

  return { sendTyping };
}
