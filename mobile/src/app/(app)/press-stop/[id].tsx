import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookingCelebration } from "@/components/BookingCelebration";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  BadgeCheck,
  MessageSquare,
  Calendar,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { User } from "@/types";

export default function PressStopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showCelebration, setShowCelebration] = useState(false);

  const {
    data: user,
    isLoading,
  } = useQuery({
    queryKey: ["press-stop", id],
    queryFn: () => api.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });

  const profile = user?.pressStopProfile;
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable testID="back-button" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg ml-3 flex-1" numberOfLines={1}>
            {user?.name ?? "Press Stop"}
          </Text>
        </View>

        {isLoading ? (
          <View testID="press-stop-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView testID="press-stop-detail" className="flex-1">
            {/* Profile Header */}
            <View className="items-center px-4 pt-4 pb-6">
              <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3">
                <Text className="text-white text-3xl font-bold">{initials}</Text>
              </View>

              <View className="flex-row items-center mb-1">
                <Text className="text-white text-xl font-bold mr-1.5">
                  {user?.name}
                </Text>
                {user?.verified ? (
                  <BadgeCheck size={20} color="#4FC3F7" />
                ) : null}
              </View>

              {profile?.category ? (
                <View className="bg-[#E53935]/20 rounded-full px-3 py-1 mt-1">
                  <Text className="text-[#E53935] text-sm font-medium">
                    {profile.category.replace(/_/g, " ")}
                  </Text>
                </View>
              ) : null}

              {user?.city ? (
                <View className="flex-row items-center mt-2">
                  <MapPin size={14} color="#8E8E93" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {user.city}{user.state ? `, ${user.state}` : null}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Stats */}
            <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
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
              <View className="bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-2 uppercase">
                  About
                </Text>
                <Text className="text-gray-200 text-sm leading-5">
                  {user.bio}
                </Text>
              </View>
            ) : null}

            {/* Details */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-3 uppercase">
                Details
              </Text>
              {profile?.baseFee != null ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Base Fee</Text>
                  <Text className="text-white font-semibold text-sm">
                    ${profile.baseFee}/session
                  </Text>
                </View>
              ) : null}
              {profile?.capacity != null ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Capacity</Text>
                  <Text className="text-white text-sm">{profile.capacity}</Text>
                </View>
              ) : null}
              {profile?.physicalAddress ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Location</Text>
                  <Text className="text-white text-sm flex-1 text-right ml-4" numberOfLines={2}>
                    {profile.physicalAddress}
                  </Text>
                </View>
              ) : null}
              {profile?.operatingHours ? (
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-sm">Hours</Text>
                  <Text className="text-white text-sm">{profile.operatingHours}</Text>
                </View>
              ) : null}
            </View>

            <View className="h-28" />
          </ScrollView>
        )}

        {/* Bottom CTA */}
        {!isLoading && user ? (
          <View className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-[#2C2C2E] px-4 pb-8 pt-4">
            <Pressable
              testID="request-booking-button"
              className="bg-[#E53935] rounded-xl py-4 items-center"
              onPress={() => {
                setShowCelebration(true);
              }}
            >
              <View className="flex-row items-center">
                <Calendar size={18} color="#FFFFFF" />
                <Text className="text-white font-semibold text-base ml-2">
                  Request Booking
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}
        <BookingCelebration
          visible={showCelebration}
          onDismiss={() => {
            setShowCelebration(false);
            if (user) {
              router.push(`/chat/${user.id}` as any);
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
