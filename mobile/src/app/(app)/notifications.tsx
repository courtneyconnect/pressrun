import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { ArrowLeft, Bell } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { Notification } from "@/types";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

function NotificationItem({ item }: { item: Notification }) {
  return (
    <View
      testID={`notification-${item.id}`}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: item.read ? "#111" : "#1C1C1E",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#1C1C1E",
      }}
    >
      <View style={{ marginRight: 12, marginTop: 2 }}>
        {!item.read ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E53935" }} />
        ) : (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "transparent" }} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: item.read ? "400" : "700", marginBottom: 3 }}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={{ color: "#8E8E93", fontSize: 13, lineHeight: 18, marginBottom: 4 }} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        <Text style={{ color: "#555558", fontSize: 11 }}>
          {format(new Date(item.createdAt), "MMM d, yyyy · h:mm a")}
        </Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications"),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/api/notifications/read-all", {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1C1C1E" }}>
          <Pressable testID="back-button" onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }}>Notifications</Text>
          {unreadCount > 0 ? (
            <Pressable
              testID="mark-all-read"
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{ backgroundColor: "#1C1C1E", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: "#E53935", fontSize: 12, fontWeight: "600" }}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (notifications ?? []).length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#1C1C1E", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Bell size={28} color="#3C3C3E" />
            </View>
            <Text style={{ color: "#555558", fontSize: 16, fontWeight: "600" }}>No notifications</Text>
            <Text style={{ color: "#3C3C3E", fontSize: 13, marginTop: 6, textAlign: "center" }}>
              You're all caught up. Notifications will appear here.
            </Text>
          </View>
        ) : (
          <FlashList
            testID="notifications-list"
            data={notifications ?? []}
            estimatedItemSize={80}
            renderItem={({ item }) => <NotificationItem item={item} />}
            keyExtractor={(item) => item.id}
            onRefresh={refetch}
            refreshing={isRefetching}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
