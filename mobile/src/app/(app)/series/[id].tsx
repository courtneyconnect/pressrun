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
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  BadgeCheck,
  MessageSquare,
  Video,
  Link,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { SeriesDiscoverResult, SeriesExample } from "@/types";
import { useSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";

export default function SeriesDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => api.get<SeriesDiscoverResult>(`/api/series/${id}`),
    enabled: !!id,
  });

  const series = data?.series;
  const creator = data?.creator;

  const durationLabel = series
    ? series.durationMinutes < 60
      ? `${series.durationMinutes}m`
      : `${series.durationMinutes / 60}h`
    : "";

  const priceLabel = series
    ? series.price === 0
      ? "Free"
      : `$${(series.price / 100).toLocaleString()}`
    : "";

  let examples: SeriesExample[] = [];
  if (series?.examples) {
    try {
      examples = JSON.parse(series.examples) as SeriesExample[];
    } catch {
      examples = [];
    }
  }

  const handleMessage = () => {
    if (creator?.id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/chat/${creator.id}` as any);
    }
  };

  const handleViewCreator = () => {
    if (creator?.id) {
      router.push(`/user/${creator.id}` as any);
    }
  };

  if (isLoading || !series || !creator) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  const initials = (creator.name ?? "?")
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
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-lg font-bold flex-1" numberOfLines={1}>
            {series.title}
          </Text>
        </View>

        <ScrollView className="flex-1">
          {/* Cover image */}
          {series.coverImage ? (
            <Image
              source={{ uri: series.coverImage }}
              style={{ width: "100%", height: 220 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: "100%", height: 140, backgroundColor: "#1C1C1E", alignItems: "center", justifyContent: "center" }}>
              <Video size={48} color="#444" />
            </View>
          )}

          <View className="px-4 pt-4">
            {/* Title + Price */}
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-white text-2xl font-bold flex-1 mr-3">{series.title}</Text>
              <View className="bg-[#E53935]/15 rounded-xl px-3 py-1.5 mt-1">
                <Text className="text-[#E53935] font-bold text-base">{priceLabel}</Text>
              </View>
            </View>

            {/* Duration + Category */}
            <View className="flex-row items-center gap-3 mb-4">
              <View className="flex-row items-center">
                <Clock size={14} color="#8E8E93" />
                <Text className="text-gray-400 text-sm ml-1.5">{durationLabel} per shoot</Text>
              </View>
              {series.category && series.category !== "OTHER" ? (
                <View className="bg-[#E53935]/15 rounded-full px-2.5 py-0.5">
                  <Text className="text-[#E53935] text-xs font-semibold">{series.category}</Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {series.description ? (
              <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">About this series</Text>
                <Text className="text-gray-200 text-sm leading-6">{series.description}</Text>
              </View>
            ) : null}

            {/* Creator card */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Creator</Text>
              <Pressable className="flex-row items-center" onPress={handleViewCreator}>
                <View className="w-12 h-12 rounded-full bg-[#2C2C2E] items-center justify-center mr-3 overflow-hidden">
                  {creator.image ? (
                    <Image source={{ uri: creator.image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{initials}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-0.5">
                    <Text className="text-white font-semibold text-base mr-1">{creator.name}</Text>
                    {creator.verified ? <BadgeCheck size={15} color="#4FC3F7" /> : null}
                  </View>
                  {creator.headline ? (
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>{creator.headline}</Text>
                  ) : null}
                  {creator.city ? (
                    <View className="flex-row items-center mt-0.5">
                      <MapPin size={11} color="#8E8E93" />
                      <Text className="text-gray-500 text-xs ml-1">
                        {creator.city}{creator.state ? `, ${creator.state}` : null}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Star size={12} color="#FFD700" fill="#FFD700" />
                    <Text className="text-gray-300 text-sm ml-1 font-semibold">
                      {creator.avgRating?.toFixed(1) ?? "0.0"}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-0.5">{creator.totalReviews} reviews</Text>
                </View>
              </Pressable>
            </View>

            {/* Examples */}
            {examples.length > 0 ? (
              <View className="mb-4">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Examples</Text>
                {examples.map((ex, i) => (
                  <Pressable
                    key={i}
                    className="bg-[#1C1C1E] rounded-xl p-3.5 mb-2 flex-row items-center"
                    onPress={() => ex.url ? Linking.openURL(ex.url) : null}
                  >
                    <View className="w-9 h-9 rounded-lg bg-[#2C2C2E] items-center justify-center mr-3">
                      {ex.type === "video" ? (
                        <Video size={18} color="#E53935" />
                      ) : (
                        <Link size={18} color="#4FC3F7" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-medium" numberOfLines={1}>
                        {ex.label ?? (ex.type === "video" ? "Video Example" : "Link Example")}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{ex.url}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Message button - only if not own series */}
            {session?.user?.id !== creator.id ? (
              <Pressable
                testID="message-creator-button"
                className="bg-[#E53935] rounded-2xl py-4 items-center mb-3 flex-row justify-center"
                onPress={handleMessage}
              >
                <MessageSquare size={18} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">Message {creator.name?.split(" ")[0]}</Text>
              </Pressable>
            ) : null}

            <View className="h-8" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
