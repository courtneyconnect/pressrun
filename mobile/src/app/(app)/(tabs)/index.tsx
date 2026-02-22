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
  Linking,
  Dimensions,
  Modal,
  Alert,
  type ImageStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { MapPin, Bell, Star, BadgeCheck, Clock, Video, ExternalLink, Calendar, Plus } from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api/api";
import { uploadFile } from "@/lib/upload";
import type { SeriesDiscoverResult, SeriesExample, User } from "@/types";

const SCREEN_WIDTH = Dimensions.get("window").width - 32; // mx-4 on each side
const CARD_WIDTH = SCREEN_WIDTH;
// 9:16 aspect ratio height for the card width
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * (16 / 9));
// Cap at a reasonable max so very tall phones don't get huge cards
const CAPPED_VIDEO_HEIGHT = Math.min(VIDEO_HEIGHT, 480);

const SERIES_CATEGORIES: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Interview", value: "Interview" },
  { label: "Vlog", value: "Vlog" },
  { label: "Review", value: "Review" },
  { label: "Tutorial", value: "Tutorial" },
  { label: "Podcast", value: "Podcast" },
  { label: "Livestream", value: "Livestream" },
  { label: "Short Form", value: "Short Form" },
  { label: "Long Form", value: "Long Form" },
];

function getPlatformInfo(url: string): { name: string; color: string } {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return { name: "Instagram", color: "#E1306C" };
  if (u.includes("tiktok.com")) return { name: "TikTok", color: "#010101" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { name: "YouTube", color: "#FF0000" };
  if (u.includes("twitter.com") || u.includes("x.com")) return { name: "X / Twitter", color: "#1DA1F2" };
  if (u.includes("twitch.tv")) return { name: "Twitch", color: "#9146FF" };
  if (u.includes("kick.com")) return { name: "Kick", color: "#53FC18" };
  if (u.includes("whatnot.com")) return { name: "Whatnot", color: "#FF6726" };
  if (u.includes("linkedin.com")) return { name: "LinkedIn", color: "#0A66C2" };
  if (u.includes("drive.google.com")) return { name: "Google Drive", color: "#4285F4" };
  if (u.includes("vimeo.com")) return { name: "Vimeo", color: "#1AB7EA" };
  return { name: "Link", color: "#8E8E93" };
}

type ExampleCard = {
  example: SeriesExample;
  seriesId: string;
  seriesTitle: string;
  seriesDurationMinutes: number;
  seriesPrice: number;
  seriesPostingTimeline: string | null;
  creator: SeriesDiscoverResult["creator"];
};

// Inline video player for uploaded video files
function UploadedVideoCard({ item, onViewSeries }: { item: ExampleCard; onViewSeries: () => void }) {
  const player = useVideoPlayer(item.example.url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const initials = (item.creator.name ?? "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const durationLabel = item.seriesDurationMinutes < 60
    ? `${item.seriesDurationMinutes}m`
    : `${item.seriesDurationMinutes / 60}h`;
  const priceLabel = item.seriesPrice === 0 ? "Free" : `$${(item.seriesPrice / 100).toLocaleString()}`;

  return (
    <View
      testID={`video-card-${item.seriesId}`}
      className="bg-[#1C1C1E] rounded-2xl mb-3 mx-4 overflow-hidden"
    >
      {/* 9:16 video area */}
      <View style={{ width: "100%", height: CAPPED_VIDEO_HEIGHT, backgroundColor: "#000", position: "relative" }}>
        <VideoView
          player={player}
          style={{ width: "100%", height: CAPPED_VIDEO_HEIGHT }}
          contentFit="contain"
          nativeControls
        />

        {/* Creator avatar + name — top left */}
        <View style={{ position: "absolute", top: 10, left: 12, flexDirection: "row", alignItems: "center", pointerEvents: "none" }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: "#E53935" }}>
            {item.creator.image ? (
              <Image source={{ uri: item.creator.image }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 6, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            {item.creator.name}
          </Text>
        </View>
      </View>

      {/* Info row */}
      <View className="px-4 py-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {item.example.label?.trim() || item.seriesTitle}
            </Text>
            <View className="flex-row items-center mt-1 gap-3">
              <View className="flex-row items-center">
                <Clock size={11} color="#8E8E93" />
                <Text className="text-gray-500 text-xs ml-1">{durationLabel}</Text>
              </View>
              {item.creator.city ? (
                <View className="flex-row items-center">
                  <MapPin size={11} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-0.5">{item.creator.city}</Text>
                </View>
              ) : null}
              {item.seriesPostingTimeline ? (
                <View className="flex-row items-center">
                  <Calendar size={11} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-1">Posts in {item.seriesPostingTimeline}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-white font-bold text-sm">{priceLabel}</Text>
            <Pressable
              className="bg-[#E53935] rounded-lg px-3 py-1 mt-1"
              onPress={onViewSeries}
            >
              <Text className="text-white text-xs font-semibold">Book Series</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// Social link card — can't play inline, opens external app/browser
function LinkExampleCard({ item, onViewSeries }: { item: ExampleCard; onViewSeries: () => void }) {
  const platform = getPlatformInfo(item.example.url);
  const initials = (item.creator.name ?? "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const durationLabel = item.seriesDurationMinutes < 60
    ? `${item.seriesDurationMinutes}m`
    : `${item.seriesDurationMinutes / 60}h`;
  const priceLabel = item.seriesPrice === 0 ? "Free" : `$${(item.seriesPrice / 100).toLocaleString()}`;

  return (
    <View
      testID={`link-card-${item.seriesId}`}
      className="bg-[#1C1C1E] rounded-2xl mb-3 mx-4 overflow-hidden"
    >
      {/* Platform preview area — 16:9 tap-through */}
      <Pressable
        style={{ width: "100%", height: 200, backgroundColor: "#111", alignItems: "center", justifyContent: "center", position: "relative" }}
        onPress={() => Linking.openURL(item.example.url)}
      >
        {/* Gradient-style platform background */}
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: platform.color, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <ExternalLink size={30} color="#fff" />
          </View>
          <View style={{ backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Watch on {platform.name}</Text>
          </View>
          <Text style={{ color: "#666", fontSize: 11, marginTop: 6 }}>Opens in {platform.name}</Text>
        </View>

        {/* Creator avatar + name — top left */}
        <View style={{ position: "absolute", top: 10, left: 12, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: platform.color }}>
            {item.creator.image ? (
              <Image source={{ uri: item.creator.image }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 6, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            {item.creator.name}
          </Text>
        </View>

        {/* Platform badge — top right */}
        <View style={{ position: "absolute", top: 10, right: 12, backgroundColor: platform.color, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{platform.name}</Text>
        </View>
      </Pressable>

      {/* Info row */}
      <View className="px-4 py-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {item.example.label?.trim() || item.seriesTitle}
            </Text>
            <View className="flex-row items-center mt-1 gap-3">
              <View className="flex-row items-center">
                <Clock size={11} color="#8E8E93" />
                <Text className="text-gray-500 text-xs ml-1">{durationLabel}</Text>
              </View>
              {item.creator.city ? (
                <View className="flex-row items-center">
                  <MapPin size={11} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-0.5">{item.creator.city}</Text>
                </View>
              ) : null}
              {item.seriesPostingTimeline ? (
                <View className="flex-row items-center">
                  <Calendar size={11} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-1">Posts in {item.seriesPostingTimeline}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-white font-bold text-sm">{priceLabel}</Text>
            <Pressable
              className="bg-[#E53935] rounded-lg px-3 py-1 mt-1"
              onPress={onViewSeries}
            >
              <Text className="text-white text-xs font-semibold">Book Series</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function ExampleDiscoverCard({ item, onPress }: { item: ExampleCard; onPress: () => void }) {
  if (item.example.type === "video") {
    return <UploadedVideoCard item={item} onViewSeries={onPress} />;
  }
  return <LinkExampleCard item={item} onViewSeries={onPress} />;
}

function SeriesDiscoverCard({
  item,
  onPress,
}: {
  item: SeriesDiscoverResult;
  onPress: () => void;
}) {
  const { series, creator } = item;
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const initials = (creator.name ?? "?")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const durationLabel = series.durationMinutes < 60
    ? `${series.durationMinutes}m`
    : `${series.durationMinutes / 60}h`;
  const priceLabel = series.price === 0 ? "Free" : `$${(series.price / 100).toLocaleString()}`;

  const imgHeight = imgSize
    ? Math.round(CARD_WIDTH * (imgSize.height / imgSize.width))
    : 180;

  return (
    <Pressable
      testID={`series-card-${series.id}`}
      className="bg-[#1C1C1E] rounded-2xl mb-3 mx-4 overflow-hidden"
      onPress={onPress}
    >
      {series.coverImage ? (
        <Image
          source={{ uri: series.coverImage }}
          style={{ width: "100%", height: imgHeight } as ImageStyle}
          resizeMode="cover"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            setImgSize({ width, height });
          }}
        />
      ) : (
        <View style={{ width: "100%", height: 120, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" }}>
          <Video size={36} color="#444" />
        </View>
      )}
      <View className="p-4">
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
            {series.category && series.category !== "OTHER" && series.category !== "Other" ? (
              <View className="bg-[#E53935]/15 rounded-full px-2 py-0.5">
                <Text className="text-[#E53935] text-xs font-medium">{series.category}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center">
              <Clock size={11} color="#8E8E93" />
              <Text className="text-gray-500 text-xs ml-1">{durationLabel}</Text>
            </View>
            {series.postingTimeline ? (
              <View className="flex-row items-center">
                <Calendar size={11} color="#8E8E93" />
                <Text className="text-gray-500 text-xs ml-1">Posts in {series.postingTimeline}</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-bold text-sm">{priceLabel}</Text>
            <Pressable className="bg-[#E53935] rounded-lg px-3 py-1.5" onPress={onPress}>
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"videos" | "series">("videos");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [citySearch, setCitySearch] = useState<string>("");

  // Upload sheet state
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [selectedUploadSeriesId, setSelectedUploadSeriesId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: seriesResults, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["series-discover", citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (citySearch.trim()) params.set("city", citySearch.trim());
      const query = params.toString();
      return api.get<SeriesDiscoverResult[]>(`/api/series-discover${query ? `?${query}` : ""}`);
    },
  });

  // Fetch current user for upload sheet series selector
  const { data: myUser } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
  });

  const mySeries = myUser?.contentSeries ?? [];

  const updateSeriesMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/users/me/series/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series-discover"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleUploadExample = async () => {
    if (!selectedUploadSeriesId) {
      Alert.alert("Select a series", "Please select a series to assign this example to.");
      return;
    }
    const selectedSeries = mySeries.find((s) => s.id === selectedUploadSeriesId);
    if (!selectedSeries) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setIsUploading(true);

      const uploadResult = await uploadFile(asset.uri, "video.mp4", "video/mp4");
      const uploadedUrl = uploadResult.url;

      const currentExamples: SeriesExample[] = selectedSeries.examples
        ? (() => { try { return JSON.parse(selectedSeries.examples) as SeriesExample[]; } catch { return []; } })()
        : [];
      const newExamples = [...currentExamples, { type: "video" as const, url: uploadedUrl, label: "" }];

      await updateSeriesMutation.mutateAsync({
        id: selectedUploadSeriesId,
        data: {
          title: selectedSeries.title,
          description: selectedSeries.description,
          coverImage: selectedSeries.coverImage,
          durationMinutes: selectedSeries.durationMinutes,
          price: selectedSeries.price,
          category: selectedSeries.category,
          postingTimeline: selectedSeries.postingTimeline,
          examples: JSON.stringify(newExamples),
        },
      });

      setIsUploading(false);
      setShowUploadSheet(false);
      Alert.alert("Uploaded!", "Your video example has been added to the series.");
    } catch (err) {
      setIsUploading(false);
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Upload Failed", msg);
    }
  };

  const exampleCards = useMemo((): ExampleCard[] => {
    if (!seriesResults) return [];
    const cards: ExampleCard[] = [];
    for (const item of seriesResults) {
      let examples: SeriesExample[] = [];
      if (item.series.examples) {
        try { examples = JSON.parse(item.series.examples) as SeriesExample[]; } catch { /* ignore */ }
      }
      const validExamples = examples.filter((e) => e.url && e.url.trim().length > 0);
      for (const ex of validExamples) {
        cards.push({
          example: ex,
          seriesId: item.series.id,
          seriesTitle: item.series.title,
          seriesDurationMinutes: item.series.durationMinutes,
          seriesPrice: item.series.price,
          seriesPostingTimeline: item.series.postingTimeline ?? null,
          creator: item.creator,
        });
      }
    }
    return cards;
  }, [seriesResults]);

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
        <View className="flex-row items-center px-4 pb-3 pt-2" style={{ gap: 8 }}>
          <Text className="text-2xl font-bold flex-1">
            <Text className="text-white">Press</Text>
            <Text className="text-[#E53935]">Run</Text>
          </Text>
          <Pressable
            testID="notifications-button"
            className="p-2"
            onPress={() => { /* bell tap */ }}
          >
            <Bell size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            testID="upload-example-button"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E53935", alignItems: "center", justifyContent: "center" }}
            onPress={() => setShowUploadSheet(true)}
          >
            <Plus size={20} color="#fff" />
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

        {/* Tabs */}
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

        {/* Category Chips — Series tab only */}
        {activeTab === "series" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            style={{ flexGrow: 0 }}
            className="mb-3"
          >
            {SERIES_CATEGORIES.map((cat) => (
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
            data={exampleCards}
            estimatedItemSize={380}
            renderItem={({ item }) => (
              <ExampleDiscoverCard item={item} onPress={() => handleSeriesPress(item.seriesId)} />
            )}
            keyExtractor={(item, idx) => `${item.seriesId}-${idx}`}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Video size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">No examples posted yet</Text>
                <Text className="text-gray-600 text-sm mt-1">Creators haven't added examples yet</Text>
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

      {/* Upload Example Bottom Sheet */}
      <Modal
        visible={showUploadSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={() => setShowUploadSheet(false)}
        />
        <View style={{ backgroundColor: "#1C1C1E", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>Upload Example</Text>

          {/* Series selector */}
          <Text style={{ color: "#8E8E93", fontSize: 12, marginBottom: 8 }}>Assign to Series</Text>
          {mySeries.length === 0 ? (
            <Text style={{ color: "#555558", fontSize: 13, marginBottom: 16 }}>
              You don't have any series yet. Create one in your profile first.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 16 }}
            >
              {mySeries.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedUploadSeriesId(s.id)}
                  style={{
                    backgroundColor: selectedUploadSeriesId === s.id ? "#E53935" : "#2C2C2E",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{s.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Upload button */}
          <Pressable
            testID="choose-video-button"
            onPress={handleUploadExample}
            disabled={isUploading || mySeries.length === 0}
            style={{
              backgroundColor: isUploading || mySeries.length === 0 ? "#4C4C4E" : "#E53935",
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
            }}
          >
            {isUploading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>Uploading...</Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Choose Video</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
