import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  BadgeCheck,
  MessageSquare,
  Video,
  Play,
  UserPlus,
  UserCheck,
  Check,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { User, ContentSeries, Friendship } from "@/types";
import { useSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";

function PlatformButton({ label, color, url }: { label: string; color: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      className="flex-row items-center bg-[#2C2C2E] rounded-xl px-3 py-2 mr-2 mb-2"
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function FriendButton({ viewedUserId }: { viewedUserId: string }) {
  const queryClient = useQueryClient();

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<{ requested: Friendship[]; received: Friendship[] }>("/api/friends"),
  });

  const requestFriend = useMutation({
    mutationFn: () => api.post("/api/friends/request", { userId: viewedUserId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const acceptFriend = useMutation({
    mutationFn: (friendshipId: string) => api.put(`/api/friends/${friendshipId}/accept`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const requested = friendsData?.requested ?? [];
  const received = friendsData?.received ?? [];

  const pendingSent = requested.find((f) => f.addresseeId === viewedUserId);
  const receivedFromViewed = received.find((f) => f.requesterId === viewedUserId);
  const isFriends = receivedFromViewed?.status === "ACCEPTED" || requested.find((f) => f.addresseeId === viewedUserId && f.status === "ACCEPTED");

  if (isFriends) {
    return (
      <View
        testID="friends-status"
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#22c55e20", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <UserCheck size={16} color="#22c55e" />
        <Text style={{ color: "#22c55e", fontSize: 14, fontWeight: "700", marginLeft: 6 }}>Friends</Text>
        <Check size={14} color="#22c55e" style={{ marginLeft: 4 }} />
      </View>
    );
  }

  if (pendingSent) {
    return (
      <View
        testID="pending-status"
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#2C2C2E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <UserPlus size={16} color="#8E8E93" />
        <Text style={{ color: "#8E8E93", fontSize: 14, fontWeight: "600", marginLeft: 6 }}>Pending</Text>
      </View>
    );
  }

  if (receivedFromViewed && receivedFromViewed.status === "PENDING") {
    return (
      <Pressable
        testID="accept-friend-button"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); acceptFriend.mutate(receivedFromViewed.id); }}
        disabled={acceptFriend.isPending}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#22c55e", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <Check size={16} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginLeft: 6 }}>Accept</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="add-friend-button"
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); requestFriend.mutate(); }}
      disabled={requestFriend.isPending}
      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1C1C1E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
    >
      {requestFriend.isPending ? (
        <ActivityIndicator size="small" color="#8E8E93" />
      ) : (
        <>
          <UserPlus size={16} color="#8E8E93" />
          <Text style={{ color: "#8E8E93", fontSize: 14, fontWeight: "600", marginLeft: 6 }}>Add Friend</Text>
        </>
      )}
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-profile", id],
    queryFn: () => api.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });

  const handleMessage = () => {
    router.push(`/chat/${id}` as any);
  };

  const isOwnProfile = session?.user?.id === id;

  if (isLoading || !user) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  const initials = (user.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const durationLabel = (mins: number) =>
    mins < 60 ? `${mins}m` : `${mins / 60}h`;

  const socialLinks: { label: string; color: string; url: string }[] = [];
  if (user.instagramHandle) socialLinks.push({ label: "Instagram", color: "#E1306C", url: user.instagramHandle });
  if (user.tiktokHandle) socialLinks.push({ label: "TikTok", color: "#010101", url: user.tiktokHandle });
  if (user.youtubeHandle) socialLinks.push({ label: "YouTube", color: "#FF0000", url: user.youtubeHandle });
  if (user.twitterHandle) socialLinks.push({ label: "X / Twitter", color: "#1DA1F2", url: user.twitterHandle });
  if (user.twitchUrl) socialLinks.push({ label: "Twitch", color: "#9146FF", url: user.twitchUrl });
  if (user.kickUrl) socialLinks.push({ label: "Kick", color: "#53FC18", url: user.kickUrl });
  if (user.whatnotUrl) socialLinks.push({ label: "Whatnot", color: "#FF6726", url: user.whatnotUrl });
  if (user.linkedinUrl) socialLinks.push({ label: "LinkedIn", color: "#0A66C2", url: user.linkedinUrl });
  if (user.websiteUrl) socialLinks.push({ label: "Website", color: "#8E8E93", url: user.websiteUrl });

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-lg font-bold flex-1" numberOfLines={1}>{user.name}</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="px-4 pt-2">
            {/* Avatar + Name */}
            <View className="items-center mb-6">
              <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3 overflow-hidden">
                {user.image ? (
                  <Image source={{ uri: user.image }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                ) : (
                  <Text className="text-white text-3xl font-bold">{initials}</Text>
                )}
              </View>
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-bold mr-1.5">{user.name}</Text>
                {user.verified ? <BadgeCheck size={20} color="#4FC3F7" /> : null}
              </View>
              {user.headline ? (
                <Text className="text-gray-400 text-sm mt-1 text-center">{user.headline}</Text>
              ) : null}
              {user.city ? (
                <View className="flex-row items-center mt-1">
                  <MapPin size={13} color="#8E8E93" />
                  <Text className="text-gray-500 text-sm ml-1">
                    {user.city}{user.state ? `, ${user.state}` : null}
                  </Text>
                </View>
              ) : null}

              {/* Friend button — only for other users */}
              {!isOwnProfile ? (
                <FriendButton viewedUserId={id!} />
              ) : null}
            </View>

            {/* Stats */}
            <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mb-4">
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text className="text-white font-bold text-lg ml-1">{user.avgRating?.toFixed(1) ?? "0.0"}</Text>
                </View>
                <Text className="text-gray-400 text-xs">Rating</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <Text className="text-white font-bold text-lg mb-1">{user.totalReviews ?? 0}</Text>
                <Text className="text-gray-400 text-xs">Reviews</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Clock size={14} color="#8E8E93" />
                  <Text className="text-white font-bold text-lg ml-1">{user.responseRate ?? 0}%</Text>
                </View>
                <Text className="text-gray-400 text-xs">Response</Text>
              </View>
            </View>

            {/* Bio */}
            {user.bio ? (
              <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">About</Text>
                <Text className="text-gray-200 text-sm leading-5">{user.bio}</Text>
              </View>
            ) : null}

            {/* Social Links */}
            {socialLinks.length > 0 ? (
              <View className="mb-4">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Follow</Text>
                <View className="flex-row flex-wrap">
                  {socialLinks.map((link) => (
                    <PlatformButton key={link.label} {...link} />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Content Series */}
            {(user.contentSeries?.length ?? 0) > 0 ? (
              <View className="mb-4">
                <View className="flex-row items-center mb-3">
                  <Play size={14} color="#E53935" />
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider ml-1.5">Content Series</Text>
                </View>
                {user.contentSeries!.map((s: ContentSeries) => (
                  <Pressable
                    key={s.id}
                    testID={`series-card-${s.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/series/${s.id}` as any);
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    className="bg-[#1C1C1E] rounded-2xl p-4 mb-3"
                  >
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className="text-white font-semibold text-base flex-1 mr-3" numberOfLines={2}>{s.title}</Text>
                      <View className="bg-[#E53935]/15 rounded-lg px-2.5 py-1">
                        <Text className="text-[#E53935] text-xs font-bold">
                          {s.price === 0 ? "Free" : `$${(s.price / 100).toLocaleString()}`}
                        </Text>
                      </View>
                    </View>
                    {s.description ? (
                      <Text className="text-gray-400 text-sm leading-5 mb-2" numberOfLines={2}>{s.description}</Text>
                    ) : null}
                    <View className="flex-row items-center">
                      <Video size={13} color="#8E8E93" />
                      <Text className="text-gray-500 text-xs ml-1.5">{durationLabel(s.durationMinutes)} per shoot</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Message Button */}
            {!isOwnProfile ? (
              <Pressable
                testID="message-user-button"
                className="bg-[#E53935] rounded-2xl py-4 items-center mb-3 flex-row justify-center"
                onPress={handleMessage}
              >
                <MessageSquare size={18} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">Message {user.name?.split(" ")[0]}</Text>
              </Pressable>
            ) : null}

            <View className="h-24" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
