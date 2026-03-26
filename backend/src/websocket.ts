import type { ServerWebSocket } from "bun";

export interface WSData {
  userId: string;
}

// userId → active connection
const connections = new Map<string, ServerWebSocket<WSData>>();

export function registerConnection(userId: string, ws: ServerWebSocket<WSData>) {
  const existing = connections.get(userId);
  if (existing) {
    try { existing.close(); } catch { /* ignore */ }
  }
  connections.set(userId, ws);
}

export function removeConnection(userId: string) {
  connections.delete(userId);
}

export function sendToUser(userId: string, payload: unknown): boolean {
  const ws = connections.get(userId);
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify(payload)); return true; } catch { /* ignore */ }
  }
  return false;
}

export function broadcastNewMessage(message: unknown, senderId: string, receiverId: string) {
  const payload = { type: "new_message", message };
  sendToUser(receiverId, payload);
  sendToUser(senderId, payload); // echo for multi-device
}

export function broadcastTyping(senderId: string, receiverId: string) {
  sendToUser(receiverId, { type: "typing", senderId });
}
