import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { ArrowLeft, Bell, UserPlus, Calendar, CheckCircle } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { Notification } from "@/types";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

type FriendRequestData = {
  friendshipId: string;
  requesterId?: string;
};

type BookingData = {
  bookingId: string;
};

function parseFriendData(data: string | null): FriendRequestData | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as FriendRequestData;
  } catch {
    return null;
  }
}

function parseBookingData(data: string | null): BookingData | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as BookingData;
  } catch {
    return null;
  }
}

function FriendRequestActions({
  friendshipId,
  onActioned,
}: {
  friendshipId: string;
  onActioned: (result: "accepted" | "declined") => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const acceptMutation = useMutation({
    mutationFn: () => api.put(`/api/friends/${friendshipId}/accept`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      onActioned("accepted");
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.delete(`/api/friends/${friendshipId}`),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      onActioned("declined");
    },
  });

  const isLoading = acceptMutation.isPending || declineMutation.isPending;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        flexDirection: "row",
        marginTop: 10,
        gap: 8,
      }}
    >
      <Pressable
        testID="accept-friend-request"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          acceptMutation.mutate();
        }}
        disabled={isLoading}
        style={{
          flex: 1,
          backgroundColor: "#22c55e",
          borderRadius: 10,
          paddingVertical: 8,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {acceptMutation.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Accept</Text>
        )}
      </Pressable>

      <Pressable
        testID="decline-friend-request"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          declineMutation.mutate();
        }}
        disabled={isLoading}
        style={{
          flex: 1,
          backgroundColor: "#2C2C2E",
          borderRadius: 10,
          paddingVertical: 8,
          alignItems: "center",
          justifyContent: "center",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {declineMutation.isPending ? (
          <ActivityIndicator size="small" color="#E53935" />
        ) : (
          <Text style={{ color: "#E53935", fontSize: 13, fontWeight: "600" }}>Decline</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function NotificationItem({
  item,
  onMarkRead,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const [actionResult, setActionResult] = useState<"accepted" | "declined" | null>(null);

  const isFriendRequest = item.type === "FRIEND_REQUEST";
  const isBookingRequest = item.type === "BOOKING_REQUEST";
  const isBookingStatus = item.type === "BOOKING_STATUS_UPDATE";

  const friendData = isFriendRequest ? parseFriendData(item.data) : null;
  const bookingData = (isBookingRequest || isBookingStatus) ? parseBookingData(item.data) : null;

  const handlePress = () => {
    onMarkRead(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if ((isBookingRequest || isBookingStatus) && bookingData?.bookingId) {
      router.push(`/booking/${bookingData.bookingId}` as any);
    }
  };

  const getIcon = () => {
    if (isFriendRequest) return <UserPlus size={16} color="#22c55e" />;
    if (isBookingRequest || isBookingStatus) return <Calendar size={16} color="#4FC3F7" />;
    return <Bell size={16} color="#8E8E93" />;
  };

  const getIconBg = () => {
    if (isFriendRequest) return "#22c55e20";
    if (isBookingRequest || isBookingStatus) return "#4FC3F720";
    return "#2C2C2E";
  };

  return (
    <Pressable
      testID={`notification-${item.id}`}
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: pressed ? "#1A1A1C" : item.read ? "#111" : "#1C1C1E",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#1C1C1E",
      })}
    >
      {/* Unread dot */}
      <View style={{ marginRight: 10, marginTop: 4, width: 8, alignItems: "center" }}>
        {!item.read ? (
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#E53935" }} />
        ) : null}
      </View>

      {/* Icon */}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: getIconBg(),
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 1,
        }}
      >
        {getIcon()}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: item.read ? "400" : "700",
            marginBottom: 3,
            lineHeight: 19,
          }}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text
            style={{ color: "#8E8E93", fontSize: 13, lineHeight: 18, marginBottom: 4 }}
            numberOfLines={3}
          >
            {item.body}
          </Text>
        ) : null}
        <Text style={{ color: "#555558", fontSize: 11 }}>
          {format(new Date(item.createdAt), "MMM d, yyyy · h:mm a")}
        </Text>

        {/* Friend request actions */}
        {isFriendRequest && friendData?.friendshipId && actionResult === null ? (
          <FriendRequestActions
            friendshipId={friendData.friendshipId}
            onActioned={(result) => setActionResult(result)}
          />
        ) : null}

        {/* Post-action status */}
        {actionResult !== null ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              gap: 5,
            }}
          >
            <CheckCircle
              size={14}
              color={actionResult === "accepted" ? "#22c55e" : "#8E8E93"}
            />
            <Text
              style={{
                color: actionResult === "accepted" ? "#22c55e" : "#8E8E93",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {actionResult === "accepted" ? "Friend request accepted" : "Declined"}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<{ notifications: Notification[]; total: number; unread: number }>(
        "/api/notifications"
      ),
  });

  const notifications = notifData?.notifications ?? [];

  const markAllRead = useMutation({
    mutationFn: () => api.put("/api/notifications/read-all", {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleMarkRead = (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (notif && !notif.read) {
      markReadMutation.mutate(id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#1C1C1E",
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{ padding: 4, marginRight: 12 }}
          >
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }}>
            Notifications
          </Text>
          {unreadCount > 0 ? (
            <Pressable
              testID="mark-all-read"
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{
                backgroundColor: "#1C1C1E",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: "#E53935", fontSize: 12, fontWeight: "600" }}>
                Mark all read
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : notifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#1C1C1E",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Bell size={28} color="#3C3C3E" />
            </View>
            <Text style={{ color: "#555558", fontSize: 16, fontWeight: "600" }}>
              No notifications
            </Text>
            <Text
              style={{
                color: "#3C3C3E",
                fontSize: 13,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              You're all caught up. Notifications will appear here.
            </Text>
          </View>
        ) : (
          <FlashList
            testID="notifications-list"
            data={notifications}
            estimatedItemSize={90}
            renderItem={({ item }) => (
              <NotificationItem item={item} onMarkRead={handleMarkRead} />
            )}
            keyExtractor={(item) => item.id}
            onRefresh={refetch}
            refreshing={isRefetching}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
