import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { MapPin, Bell, Star, BadgeCheck } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { DiscoverResult, PressStopCategory } from "@/types";

const CATEGORIES: { label: string; value: PressStopCategory | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Podcasts", value: "PODCAST" },
  { label: "Brands", value: "BRAND" },
  { label: "Media", value: "MEDIA_OUTLET" },
  { label: "Retail", value: "RETAIL_STORE" },
  { label: "Events", value: "EVENT_SPACE" },
  { label: "Studios", value: "LIVESTREAM_STUDIO" },
  { label: "Creators", value: "CREATOR" },
];

function PressStopCard({
  item,
  onPress,
}: {
  item: DiscoverResult;
  onPress: () => void;
}) {
  const user = item.user;
  const profile = item.pressStopProfile;
  const initials = (user.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      testID={`press-stop-card-${user.id}`}
      className="bg-[#1C1C1E] rounded-2xl p-4 mb-3 mx-4"
      onPress={onPress}
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="w-14 h-14 rounded-full bg-[#2C2C2E] items-center justify-center mr-3">
          <Text className="text-white text-lg font-bold">{initials}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white font-semibold text-base mr-1" numberOfLines={1}>
              {user.name}
            </Text>
            {user.verified ? (
              <BadgeCheck size={16} color="#4FC3F7" />
            ) : null}
          </View>

          {/* Category pill */}
          <View className="self-start bg-[#E53935]/20 rounded-full px-2 py-0.5 mb-1.5">
            <Text className="text-[#E53935] text-xs font-medium">
              {profile.category?.replace(/_/g, " ") ?? "OTHER"}
            </Text>
          </View>

          {/* Location */}
          {user.city ? (
            <View className="flex-row items-center mb-1">
              <MapPin size={12} color="#8E8E93" />
              <Text className="text-gray-400 text-xs ml-1">
                {user.city}{user.state ? `, ${user.state}` : null}
              </Text>
            </View>
          ) : null}

          {/* Rating + Fee */}
          <View className="flex-row items-center justify-between mt-1">
            <View className="flex-row items-center">
              <Star size={12} color="#FFD700" fill="#FFD700" />
              <Text className="text-gray-300 text-xs ml-1">
                {user.avgRating?.toFixed(1) ?? "0.0"} ({user.totalReviews ?? 0})
              </Text>
            </View>
            <Text className="text-white font-semibold text-sm">
              ${profile.baseFee ?? 0}/session
            </Text>
          </View>
        </View>

        {/* Book button */}
        <Pressable
          testID={`book-button-${user.id}`}
          className="bg-[#E53935] rounded-lg px-3 py-1.5 ml-2 self-center"
          onPress={onPress}
        >
          <Text className="text-white text-xs font-semibold">Book</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<PressStopCategory | "ALL">("ALL");
  const [citySearch, setCitySearch] = useState<string>("");

  const {
    data: results,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["discover", selectedCategory, citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") {
        params.set("category", selectedCategory);
      }
      if (citySearch.trim()) {
        params.set("city", citySearch.trim());
      }
      const query = params.toString();
      return api.get<DiscoverResult[]>(`/api/discover${query ? `?${query}` : ""}`);
    },
  });

  const handlePressStopPress = useCallback(
    (id: string) => {
      router.push(`/press-stop/${id}` as any);
    },
    [router]
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <Text className="text-2xl font-bold">
            <Text className="text-white">Press</Text>
            <Text className="text-[#E53935]">Run</Text>
          </Text>
          <Pressable testID="notifications-button" className="p-2">
            <Bell size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* City Search */}
        <View className="px-4 mb-3">
          <View className="flex-row items-center bg-[#1C1C1E] rounded-xl px-3 py-2.5">
            <MapPin size={16} color="#8E8E93" />
            <TextInput
              testID="city-search-input"
              className="flex-1 text-white text-sm ml-2"
              placeholder="Search by city..."
              placeholderTextColor="#8E8E93"
              value={citySearch}
              onChangeText={setCitySearch}
            />
          </View>
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          style={{ flexGrow: 0 }}
          className="mb-3"
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              testID={`category-chip-${cat.value.toLowerCase()}`}
              className={`rounded-full px-4 py-2 ${
                selectedCategory === cat.value
                  ? "bg-[#E53935]"
                  : "bg-[#1C1C1E]"
              }`}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === cat.value
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results */}
        {isLoading ? (
          <View testID="discover-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <FlashList
            testID="discover-list"
            data={results ?? []}
            estimatedItemSize={120}
            renderItem={({ item }) => (
              <PressStopCard
                item={item}
                onPress={() => handlePressStopPress(item.user.id)}
              />
            )}
            keyExtractor={(item) => item.user.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#E53935"
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-500 text-base">
                  No press stops found
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Try a different search or category
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
