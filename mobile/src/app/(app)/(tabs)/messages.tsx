import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api/api";
import type { Conversation } from "@/types";

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const user = conversation.otherUser;
  const lastMsg = conversation.lastMessage;
  const initials = (user.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      testID={`conversation-row-${user.id}`}
      className="flex-row items-center bg-[#1C1C1E] rounded-2xl p-4 mb-2"
      onPress={onPress}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-[#2C2C2E] items-center justify-center mr-3">
        <Text className="text-white font-bold">{initials}</Text>
      </View>

      {/* Content */}
      <View className="flex-1 mr-2">
        <Text className="text-white font-semibold text-base" numberOfLines={1}>
          {user.name}
        </Text>
        <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
          {lastMsg?.content ?? "No messages yet"}
        </Text>
      </View>

      {/* Time + Unread */}
      <View className="items-end">
        {lastMsg?.createdAt ? (
          <Text className="text-gray-500 text-xs">
            {formatDistanceToNow(new Date(lastMsg.createdAt), {
              addSuffix: false,
            })}
          </Text>
        ) : null}
        {conversation.unreadCount > 0 ? (
          <View className="bg-[#E53935] rounded-full w-5 h-5 items-center justify-center mt-1">
            <Text className="text-white text-[10px] font-bold">
              {conversation.unreadCount > 9
                ? "9+"
                : conversation.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/messages/conversations"),
    refetchInterval: 10000,
  });

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4 pt-2 pb-3">
          <Text className="text-2xl font-bold text-white">Messages</Text>
        </View>

        {isLoading ? (
          <View testID="messages-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView
            testID="messages-list"
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#E53935"
              />
            }
          >
            {(conversations ?? []).length === 0 ? (
              <View className="items-center py-20">
                <MessageSquare size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">
                  No conversations yet
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Start by booking a press stop
                </Text>
              </View>
            ) : (
              (conversations ?? []).map((conv) => (
                <ConversationRow
                  key={conv.otherUser.id}
                  conversation={conv}
                  onPress={() =>
                    router.push(`/chat/${conv.otherUser.id}` as any)
                  }
                />
              ))
            )}
            <View className="h-24" />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
