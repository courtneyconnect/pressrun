import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Edit3,
  Star,
  MessageSquare,
  Clock,
  BadgeCheck,
  LogOut,
  Globe,
  Play,
  Video,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { authClient } from "@/lib/auth/auth-client";
import { useSession, useInvalidateSession } from "@/lib/auth/use-session";
import type { User, ContentSeries } from "@/types";

// SVG-free platform icons using styled Text labels
function PlatformButton({
  label,
  color,
  url,
  testID,
}: {
  label: string;
  color: string;
  url: string;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => Linking.openURL(url)}
      className="flex-row items-center bg-[#2C2C2E] rounded-xl px-3 py-2 mr-2 mb-2"
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }}
      />
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function SeriesCard({ series }: { series: ContentSeries }) {
  const durationLabel =
    series.durationMinutes < 60
      ? `${series.durationMinutes}m`
      : `${series.durationMinutes / 60}h`;

  const priceLabel =
    series.price === 0 ? "Free" : `$${(series.price / 100).toLocaleString()}`;

  return (
    <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-white font-semibold text-base flex-1 mr-3" numberOfLines={2}>
          {series.title}
        </Text>
        <View className="bg-[#E53935]/15 rounded-lg px-2.5 py-1">
          <Text className="text-[#E53935] text-xs font-bold">{priceLabel}</Text>
        </View>
      </View>
      {series.description ? (
        <Text className="text-gray-400 text-sm leading-5 mb-2" numberOfLines={2}>
          {series.description}
        </Text>
      ) : null}
      <View className="flex-row items-center">
        <Video size={13} color="#8E8E93" />
        <Text className="text-gray-500 text-xs ml-1.5">{durationLabel} per shoot</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();

  const { data: user, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
  });

  const signOut = useMutation({
    mutationFn: async () => { await authClient.signOut(); },
    onSuccess: () => { invalidateSession(); },
  });

  const initials = (user?.name ?? session?.user?.name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Build social link buttons from stored URLs
  const socialLinks: { label: string; color: string; url: string; testID: string }[] = [];
  if (user?.instagramHandle) {
    socialLinks.push({ label: "Instagram", color: "#E1306C", url: user.instagramHandle, testID: "social-instagram" });
  }
  if (user?.tiktokHandle) {
    socialLinks.push({ label: "TikTok", color: "#010101", url: user.tiktokHandle, testID: "social-tiktok" });
  }
  if (user?.youtubeHandle) {
    socialLinks.push({ label: "YouTube", color: "#FF0000", url: user.youtubeHandle, testID: "social-youtube" });
  }
  if (user?.twitterHandle) {
    socialLinks.push({ label: "X / Twitter", color: "#1DA1F2", url: user.twitterHandle, testID: "social-twitter" });
  }
  if (user?.twitchUrl) {
    socialLinks.push({ label: "Twitch", color: "#9146FF", url: user.twitchUrl, testID: "social-twitch" });
  }
  if (user?.kickUrl) {
    socialLinks.push({ label: "Kick", color: "#53FC18", url: user.kickUrl, testID: "social-kick" });
  }
  if (user?.whatnotUrl) {
    socialLinks.push({ label: "Whatnot", color: "#FF6B35", url: user.whatnotUrl, testID: "social-whatnot" });
  }
  if (user?.linkedinUrl) {
    socialLinks.push({ label: "LinkedIn", color: "#0A66C2", url: user.linkedinUrl, testID: "social-linkedin" });
  }
  if (user?.websiteUrl) {
    socialLinks.push({ label: "Website", color: "#8E8E93", url: user.websiteUrl, testID: "social-website" });
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          testID="profile-screen"
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />
          }
        >
          {isLoading ? (
            <View testID="profile-loading" className="items-center py-20">
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : (
            <View className="px-4 pt-4">
              {/* Avatar + Name */}
              <View className="items-center mb-6">
                <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3 overflow-hidden">
                  {user?.image ? (
                    <Image source={{ uri: user.image }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                  ) : (
                    <Text className="text-white text-3xl font-bold">{initials}</Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white text-xl font-bold mr-1.5">
                    {user?.name ?? "Set up your profile"}
                  </Text>
                  {user?.verified ? <BadgeCheck size={20} color="#4FC3F7" /> : null}
                </View>
                {user?.headline ? (
                  <Text className="text-gray-400 text-sm mt-1 text-center">{user.headline}</Text>
                ) : null}
                {user?.city ? (
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {user.city}{user.state ? `, ${user.state}` : null}
                  </Text>
                ) : null}
              </View>

              {/* Stats Row */}
              <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                <View className="flex-1 items-center">
                  <View className="flex-row items-center mb-1">
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text className="text-white font-bold text-lg ml-1">
                      {user?.avgRating?.toFixed(1) ?? "0.0"}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Rating</Text>
                </View>
                <View className="w-px bg-[#2C2C2E]" />
                <View className="flex-1 items-center">
                  <View className="flex-row items-center mb-1">
                    <MessageSquare size={14} color="#8E8E93" />
                    <Text className="text-white font-bold text-lg ml-1">{user?.totalReviews ?? 0}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Reviews</Text>
                </View>
                <View className="w-px bg-[#2C2C2E]" />
                <View className="flex-1 items-center">
                  <View className="flex-row items-center mb-1">
                    <Clock size={14} color="#8E8E93" />
                    <Text className="text-white font-bold text-lg ml-1">{user?.responseRate ?? 0}%</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Response</Text>
                </View>
              </View>

              {/* Bio */}
              {user?.bio ? (
                <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                  <Text className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">About</Text>
                  <Text className="text-gray-200 text-sm leading-5">{user.bio}</Text>
                </View>
              ) : null}

              {/* Social Links */}
              {socialLinks.length > 0 ? (
                <View className="mb-4">
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                    Follow
                  </Text>
                  <View className="flex-row flex-wrap">
                    {socialLinks.map((link) => (
                      <PlatformButton key={link.testID} {...link} />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Content Series */}
              {(user?.contentSeries?.length ?? 0) > 0 ? (
                <View className="mb-4">
                  <View className="flex-row items-center mb-3">
                    <Play size={14} color="#E53935" />
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider ml-1.5">
                      Content Series
                    </Text>
                  </View>
                  {user!.contentSeries!.map((s) => (
                    <SeriesCard key={s.id} series={s} />
                  ))}
                </View>
              ) : null}

              {/* Actions */}
              <Pressable
                testID="edit-profile-button"
                className="border border-[#E53935] rounded-xl py-3.5 items-center mb-3"
                onPress={() => router.push("/edit-profile" as any)}
              >
                <View className="flex-row items-center">
                  <Edit3 size={16} color="#E53935" />
                  <Text className="text-[#E53935] font-semibold text-sm ml-2">Edit Profile</Text>
                </View>
              </Pressable>

              <Pressable
                testID="sign-out-button"
                className="bg-[#1C1C1E] rounded-xl py-3.5 items-center mb-8"
                onPress={() => signOut.mutate()}
                disabled={signOut.isPending}
              >
                <View className="flex-row items-center">
                  <LogOut size={16} color="#8E8E93" />
                  <Text className="text-gray-400 font-medium text-sm ml-2">
                    {signOut.isPending ? "Signing out..." : "Sign Out"}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
