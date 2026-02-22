import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { MapPin, Bell, Star, BadgeCheck, Clock, Video } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { DiscoverResult, PressStopCategory, SeriesDiscoverResult } from "@/types";

const PRESS_STOP_CATEGORIES: { label: string; value: PressStopCategory | "ALL" }[] = [
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
        <View className="w-14 h-14 rounded-full bg-[#2C2C2E] items-center justify-center mr-3 overflow-hidden">
          {user.image ? (
            <Image source={{ uri: user.image }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <Text className="text-white text-lg font-bold">{initials}</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white font-semibold text-base mr-1" numberOfLines={1}>{user.name}</Text>
            {user.verified ? <BadgeCheck size={16} color="#4FC3F7" /> : null}
          </View>
          <View className="self-start bg-[#E53935]/20 rounded-full px-2 py-0.5 mb-1.5">
            <Text className="text-[#E53935] text-xs font-medium">
              {profile.category?.replace(/_/g, " ") ?? "OTHER"}
            </Text>
          </View>
          {user.city ? (
            <View className="flex-row items-center mb-1">
              <MapPin size={12} color="#8E8E93" />
              <Text className="text-gray-400 text-xs ml-1">
                {user.city}{user.state ? `, ${user.state}` : null}
              </Text>
            </View>
          ) : null}
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

function SeriesDiscoverCard({
  item,
  onPress,
}: {
  item: SeriesDiscoverResult;
  onPress: () => void;
}) {
  const { series, creator } = item;
  const initials = (creator.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const durationLabel =
    series.durationMinutes < 60
      ? `${series.durationMinutes}m`
      : `${series.durationMinutes / 60}h`;

  const priceLabel =
    series.price === 0 ? "Free" : `$${(series.price / 100).toLocaleString()}`;

  return (
    <Pressable
      testID={`series-card-${series.id}`}
      className="bg-[#1C1C1E] rounded-2xl mb-3 mx-4 overflow-hidden"
      onPress={onPress}
    >
      {/* Cover image */}
      {series.coverImage ? (
        <Image
          source={{ uri: series.coverImage }}
          style={{ width: "100%", height: 160 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: "100%", height: 100, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" }}>
          <Video size={32} color="#444" />
        </View>
      )}
      <View className="p-4">
        {/* Creator row */}
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 rounded-full bg-[#2C2C2E] items-center justify-center mr-2 overflow-hidden">
            {creator.image ? (
              <Image source={{ uri: creator.image }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-semibold mr-1" numberOfLines={1}>{creator.name}</Text>
              {creator.verified ? <BadgeCheck size={13} color="#4FC3F7" /> : null}
            </View>
            {creator.city ? (
              <View className="flex-row items-center">
                <MapPin size={10} color="#8E8E93" />
                <Text className="text-gray-500 text-xs ml-0.5">
                  {creator.city}{creator.state ? `, ${creator.state}` : null}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center">
            <Star size={11} color="#FFD700" fill="#FFD700" />
            <Text className="text-gray-400 text-xs ml-0.5">{creator.avgRating?.toFixed(1) ?? "0.0"}</Text>
          </View>
        </View>

        {/* Series info */}
        <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>{series.title}</Text>
        {series.description ? (
          <Text className="text-gray-400 text-sm mb-2 leading-5" numberOfLines={2}>{series.description}</Text>
        ) : null}

        {/* Category + duration + price row */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-2">
            {series.category && series.category !== "OTHER" ? (
              <View className="bg-[#E53935]/15 rounded-full px-2 py-0.5">
                <Text className="text-[#E53935] text-xs font-medium">{series.category}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center">
              <Clock size={11} color="#8E8E93" />
              <Text className="text-gray-500 text-xs ml-1">{durationLabel}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-bold text-sm">{priceLabel}</Text>
            <Pressable
              className="bg-[#E53935] rounded-lg px-3 py-1.5"
              onPress={onPress}
            >
              <Text className="text-white text-xs font-semibold">View</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"stops" | "series">("stops");
  const [selectedCategory, setSelectedCategory] = useState<PressStopCategory | "ALL">("ALL");
  const [citySearch, setCitySearch] = useState<string>("");

  const {
    data: pressStopResults,
    isLoading: stopsLoading,
    refetch: refetchStops,
    isRefetching: stopsRefetching,
  } = useQuery({
    queryKey: ["discover", selectedCategory, citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (citySearch.trim()) params.set("city", citySearch.trim());
      const query = params.toString();
      return api.get<DiscoverResult[]>(`/api/discover${query ? `?${query}` : ""}`);
    },
    enabled: activeTab === "stops",
  });

  const {
    data: seriesResults,
    isLoading: seriesLoading,
    refetch: refetchSeries,
    isRefetching: seriesRefetching,
  } = useQuery({
    queryKey: ["series-discover", citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (citySearch.trim()) params.set("city", citySearch.trim());
      const query = params.toString();
      return api.get<SeriesDiscoverResult[]>(`/api/series-discover${query ? `?${query}` : ""}`);
    },
    enabled: activeTab === "series",
  });

  const handlePressStopPress = useCallback(
    (id: string) => { router.push(`/press-stop/${id}` as any); },
    [router]
  );

  const handleSeriesPress = useCallback(
    (id: string) => { router.push(`/series/${id}` as any); },
    [router]
  );

  const isLoading = activeTab === "stops" ? stopsLoading : seriesLoading;
  const isRefetching = activeTab === "stops" ? stopsRefetching : seriesRefetching;
  const refetch = activeTab === "stops" ? refetchStops : refetchSeries;

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

        {/* View Mode Tabs */}
        <View className="flex-row px-4 mb-3 gap-2">
          <Pressable
            testID="tab-press-stops"
            className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === "stops" ? "bg-[#E53935]" : "bg-[#1C1C1E]"}`}
            onPress={() => setActiveTab("stops")}
          >
            <Text className={`font-semibold text-sm ${activeTab === "stops" ? "text-white" : "text-gray-400"}`}>
              Press Stops
            </Text>
          </Pressable>
          <Pressable
            testID="tab-series"
            className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === "series" ? "bg-[#E53935]" : "bg-[#1C1C1E]"}`}
            onPress={() => setActiveTab("series")}
          >
            <Text className={`font-semibold text-sm ${activeTab === "series" ? "text-white" : "text-gray-400"}`}>
              Series
            </Text>
          </Pressable>
        </View>

        {/* Category Chips (Press Stops only) */}
        {activeTab === "stops" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            style={{ flexGrow: 0 }}
            className="mb-3"
          >
            {PRESS_STOP_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                testID={`category-chip-${cat.value.toLowerCase()}`}
                className={`rounded-full px-4 py-2 ${selectedCategory === cat.value ? "bg-[#E53935]" : "bg-[#1C1C1E]"}`}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text className={`text-sm font-medium ${selectedCategory === cat.value ? "text-white" : "text-gray-400"}`}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Results */}
        {isLoading ? (
          <View testID="discover-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : activeTab === "stops" ? (
          <FlashList
            testID="discover-list"
            data={pressStopResults ?? []}
            estimatedItemSize={120}
            renderItem={({ item }) => (
              <PressStopCard item={item} onPress={() => handlePressStopPress(item.user.id)} />
            )}
            keyExtractor={(item) => item.user.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-500 text-base">No press stops found</Text>
                <Text className="text-gray-600 text-sm mt-1">Try a different search or category</Text>
              </View>
            }
          />
        ) : (
          <FlashList
            testID="series-list"
            data={seriesResults ?? []}
            estimatedItemSize={280}
            renderItem={({ item }) => (
              <SeriesDiscoverCard item={item} onPress={() => handleSeriesPress(item.series.id)} />
            )}
            keyExtractor={(item) => item.series.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-500 text-base">No series found</Text>
                <Text className="text-gray-600 text-sm mt-1">Try a different city</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
