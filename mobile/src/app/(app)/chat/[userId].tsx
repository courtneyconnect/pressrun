import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import type { Message } from "@/types";
import * as Haptics from "expo-haptics";
import { useWebSocket } from "@/hooks/useWebSocket";

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <View
      testID={`message-${message.id}`}
      className={`mb-2 max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}
    >
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isOwn ? "bg-[#E53935] rounded-br-sm" : "bg-[#1C1C1E] rounded-bl-sm"
        }`}
      >
        <Text className="text-white text-sm leading-5">{message.content}</Text>
      </View>
      <Text
        className={`text-gray-500 text-[10px] mt-0.5 ${
          isOwn ? "text-right" : "text-left"
        }`}
      >
        {format(new Date(message.createdAt), "h:mm a")}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [messageText, setMessageText] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);

  const handleTypingReceived = useCallback(() => {
    setIsOtherTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
  }, []);

  const { sendTyping } = useWebSocket(userId ?? "", handleTypingReceived);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", userId],
    queryFn: () => api.get<Message[]>(`/api/messages/${userId}`),
    enabled: !!userId,
  });

  const { mutate: sendMessageMutate, isPending: isSending } = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/messages/${userId}`, {
        content,
        type: "TEXT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageText("");
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessageMutate(trimmed);
  }, [messageText, isSending, sendMessageMutate]);

  const sortedMessages = [...(messages ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#2C2C2E]">
          <Pressable testID="back-button" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg ml-3">Chat</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          {isLoading ? (
            <View testID="chat-loading" className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              testID="messages-flatlist"
              data={sortedMessages}
              inverted
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isOwn={item.senderId === currentUserId}
                />
              )}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View className="items-center py-20">
                  <Text className="text-gray-500 text-sm">
                    No messages yet. Say hello!
                  </Text>
                </View>
              }
            />
          )}

          {/* Typing indicator */}
          {isOtherTyping ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
              <Text style={{ color: "#8E8E93", fontSize: 12 }}>typing...</Text>
            </View>
          ) : null}

          {/* Input Bar */}
          <View className="flex-row items-end px-4 py-3 border-t border-[#2C2C2E] bg-black">
            <TextInput
              testID="message-input"
              className="flex-1 bg-[#1C1C1E] text-white text-sm rounded-2xl px-4 py-3 mr-2 max-h-24"
              placeholder="Type a message..."
              placeholderTextColor="#8E8E93"
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                sendTyping();
              }}
              multiline
              returnKeyType="default"
            />
            <Pressable
              testID="send-button"
              className={`w-10 h-10 rounded-full items-center justify-center ${
                messageText.trim() ? "bg-[#E53935]" : "bg-[#2C2C2E]"
              }`}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
