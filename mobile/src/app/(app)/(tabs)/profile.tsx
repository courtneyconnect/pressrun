import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
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
  Instagram,
  Globe,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { authClient } from "@/lib/auth/auth-client";
import { useSession, useInvalidateSession } from "@/lib/auth/use-session";
import type { User } from "@/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();

  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      invalidateSession();
    },
  });

  const initials = (user?.name ?? session?.user?.name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          testID="profile-screen"
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#E53935"
            />
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
                <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3">
                  <Text className="text-white text-3xl font-bold">
                    {initials}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Text className="text-white text-xl font-bold mr-1.5">
                    {user?.name ?? "Set up your profile"}
                  </Text>
                  {user?.verified ? (
                    <BadgeCheck size={20} color="#4FC3F7" />
                  ) : null}
                </View>

                {user?.headline ? (
                  <Text className="text-gray-400 text-sm mt-1 text-center">
                    {user.headline}
                  </Text>
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
                    <Text className="text-white font-bold text-lg ml-1">
                      {user?.totalReviews ?? 0}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Reviews</Text>
                </View>
                <View className="w-px bg-[#2C2C2E]" />
                <View className="flex-1 items-center">
                  <View className="flex-row items-center mb-1">
                    <Clock size={14} color="#8E8E93" />
                    <Text className="text-white font-bold text-lg ml-1">
                      {user?.responseRate ?? 0}%
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Response</Text>
                </View>
              </View>

              {/* Bio */}
              {user?.bio ? (
                <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                  <Text className="text-gray-400 text-xs font-medium mb-2 uppercase">
                    About
                  </Text>
                  <Text className="text-gray-200 text-sm leading-5">
                    {user.bio}
                  </Text>
                </View>
              ) : null}

              {/* Social Links */}
              {(user?.instagramHandle ?? user?.tiktokHandle ?? user?.youtubeHandle ?? user?.websiteUrl) ? (
                <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mb-4 gap-4">
                  {user?.instagramHandle ? (
                    <Pressable
                      testID="social-instagram"
                      onPress={() =>
                        Linking.openURL(
                          `https://instagram.com/${user.instagramHandle}`
                        )
                      }
                    >
                      <Instagram size={22} color="#E1306C" />
                    </Pressable>
                  ) : null}
                  {user?.websiteUrl ? (
                    <Pressable
                      testID="social-website"
                      onPress={() => Linking.openURL(user.websiteUrl!)}
                    >
                      <Globe size={22} color="#8E8E93" />
                    </Pressable>
                  ) : null}
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
                  <Text className="text-[#E53935] font-semibold text-sm ml-2">
                    Edit Profile
                  </Text>
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
