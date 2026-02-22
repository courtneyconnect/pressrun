import React, { useState, useCallback, useMemo } from "react";
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
import { MapPin, Bell, Star, BadgeCheck, Clock, Video, Play } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { SeriesDiscoverResult, SeriesExample } from "@/types";

const PRESS_STOP_CATEGORIES: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Podcasts", value: "PODCAST" },
  { label: "Brands", value: "BRAND" },
  { label: "Media", value: "MEDIA_OUTLET" },
  { label: "Retail", value: "RETAIL_STORE" },
  { label: "Events", value: "EVENT_SPACE" },
  { label: "Studios", value: "LIVESTREAM_STUDIO" },
  { label: "Creators", value: "CREATOR" },
];

type VideoExampleCard = {
  exampleUrl: string;
  exampleLabel: string | undefined;
  seriesId: string;
  seriesTitle: string;
  seriesDurationMinutes: number;
  seriesPrice: number;
  creator: SeriesDiscoverResult["creator"];
};

function VideoExCard({ item, onPress }: { item: VideoExampleCard; onPress: () => void }) {
  const initials = (item.creator.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const durationLabel =
    item.seriesDurationMinutes < 60
      ? `${item.seriesDurationMinutes}m`
      : `${item.seriesDurationMinutes / 60}h`;

  const priceLabel =
    item.seriesPrice === 0 ? "Free" : `$${(item.seriesPrice / 100).toLocaleString()}`;

  return (
    <Pressable
      testID={`video-card-${item.seriesId}`}
      className="bg-[#1C1C1E] rounded-2xl mb-3 mx-4 overflow-hidden"
      onPress={onPress}
    >
      {/* Video placeholder with creator avatar overlay */}
      <View style={{ width: "100%", height: 180, backgroundColor: "#111", position: "relative", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#E53935", alignItems: "center", justifyContent: "center" }}>
          <Play size={22} color="#fff" fill="#fff" />
        </View>
        <Text style={{ color: "#555", fontSize: 11, marginTop: 8 }}>Video Example</Text>
        {/* Creator avatar top-left */}
        <View style={{ position: "absolute", top: 10, left: 12, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: "#E53935" }}>
            {item.creator.image ? (
              <Image source={{ uri: item.creator.image }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 6, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>{item.creator.name}</Text>
        </View>
      </View>
      <View className="px-4 py-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {item.exampleLabel ?? item.seriesTitle}
            </Text>
            <View className="flex-row items-center mt-1">
              <View className="flex-row items-center mr-3">
                <Clock size={11} color="#8E8E93" />
                <Text className="text-gray-500 text-xs ml-1">{durationLabel}</Text>
              </View>
              {item.creator.city ? (
                <View className="flex-row items-center">
                  <MapPin size={11} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-0.5">{item.creator.city}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-white font-bold text-sm">{priceLabel}</Text>
            <Pressable
              className="bg-[#E53935] rounded-lg px-3 py-1 mt-1"
              onPress={onPress}
            >
              <Text className="text-white text-xs font-semibold">View Series</Text>
            </Pressable>
          </View>
        </View>
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
          style={{ width: "100%", height: 180 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: "100%", height: 120, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" }}>
          <Video size={36} color="#444" />
        </View>
      )}
      <View className="p-4">
        {/* Creator row */}
        <View className="flex-row items-center mb-2">
          <View className="w-7 h-7 rounded-full bg-[#2C2C2E] items-center justify-center mr-2 overflow-hidden">
            {creator.image ? (
              <Image source={{ uri: creator.image }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <View className="flex-row items-center flex-1">
            <Text className="text-gray-400 text-xs font-medium mr-1" numberOfLines={1}>{creator.name}</Text>
            {creator.verified ? <BadgeCheck size={12} color="#4FC3F7" /> : null}
          </View>
          <View className="flex-row items-center">
            <Star size={11} color="#FFD700" fill="#FFD700" />
            <Text className="text-gray-400 text-xs ml-0.5">{creator.avgRating?.toFixed(1) ?? "0.0"}</Text>
          </View>
        </View>

        <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>{series.title}</Text>
        {series.description ? (
          <Text className="text-gray-400 text-sm mb-2 leading-5" numberOfLines={2}>{series.description}</Text>
        ) : null}

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
  const [activeTab, setActiveTab] = useState<"videos" | "series">("videos");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [citySearch, setCitySearch] = useState<string>("");

  const {
    data: seriesResults,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["series-discover", citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (citySearch.trim()) params.set("city", citySearch.trim());
      const query = params.toString();
      return api.get<SeriesDiscoverResult[]>(`/api/series-discover${query ? `?${query}` : ""}`);
    },
  });

  // Build video example cards from series that have video examples
  const videoCards = useMemo((): VideoExampleCard[] => {
    if (!seriesResults) return [];
    const cards: VideoExampleCard[] = [];
    for (const item of seriesResults) {
      let examples: SeriesExample[] = [];
      if (item.series.examples) {
        try { examples = JSON.parse(item.series.examples) as SeriesExample[]; } catch { /* ignore */ }
      }
      const videoExamples = examples.filter((e) => e.type === "video");
      for (const ex of videoExamples) {
        cards.push({
          exampleUrl: ex.url,
          exampleLabel: ex.label,
          seriesId: item.series.id,
          seriesTitle: item.series.title,
          seriesDurationMinutes: item.series.durationMinutes,
          seriesPrice: item.series.price,
          creator: item.creator,
        });
      }
    }
    return cards;
  }, [seriesResults]);

  // Filter series by category for series tab
  const filteredSeries = useMemo(() => {
    if (!seriesResults) return [];
    if (selectedCategory === "ALL") return seriesResults;
    return seriesResults.filter((s) =>
      s.series.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [seriesResults, selectedCategory]);

  const handleSeriesPress = useCallback(
    (id: string) => { router.push(`/series/${id}` as any); },
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

        {/* View Mode Tabs */}
        <View className="flex-row px-4 mb-3 gap-2">
          <Pressable
            testID="tab-press-stops"
            className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === "videos" ? "bg-[#E53935]" : "bg-[#1C1C1E]"}`}
            onPress={() => setActiveTab("videos")}
          >
            <Text className={`font-semibold text-sm ${activeTab === "videos" ? "text-white" : "text-gray-400"}`}>
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

        {/* Category Chips (Series tab only) */}
        {activeTab === "series" ? (
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
        ) : activeTab === "videos" ? (
          <FlashList
            testID="discover-list"
            data={videoCards}
            estimatedItemSize={240}
            renderItem={({ item }) => (
              <VideoExCard item={item} onPress={() => handleSeriesPress(item.seriesId)} />
            )}
            keyExtractor={(item, idx) => `${item.seriesId}-${idx}`}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Video size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">No video examples yet</Text>
                <Text className="text-gray-600 text-sm mt-1">Creators haven't uploaded videos yet</Text>
              </View>
            }
          />
        ) : (
          <FlashList
            testID="series-list"
            data={filteredSeries}
            estimatedItemSize={300}
            renderItem={({ item }) => (
              <SeriesDiscoverCard item={item} onPress={() => handleSeriesPress(item.series.id)} />
            )}
            keyExtractor={(item) => item.series.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-500 text-base">No series found</Text>
                <Text className="text-gray-600 text-sm mt-1">Try a different city or category</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
