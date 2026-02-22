import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { ArrowLeft, MapPin, Star, BadgeCheck, Calendar, MessageSquare } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { PublicTour } from "@/types";
import { useSession } from "@/lib/auth/use-session";

function TourCard({
  tour,
  onMessage,
  onViewCreator,
}: {
  tour: PublicTour;
  onMessage: () => void;
  onViewCreator: () => void;
}) {
  const talent = tour.talent;
  const initials = (talent.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-3 mx-4">
      {/* Creator info */}
      <Pressable className="flex-row items-center mb-3" onPress={onViewCreator}>
        <View className="w-12 h-12 rounded-full bg-[#2C2C2E] items-center justify-center mr-3 overflow-hidden">
          {talent.image ? (
            <Image source={{ uri: talent.image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>{initials}</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-0.5">
            <Text className="text-white font-semibold text-base mr-1" numberOfLines={1}>{talent.name}</Text>
            {talent.verified ? <BadgeCheck size={14} color="#4FC3F7" /> : null}
          </View>
          {talent.headline ? (
            <Text className="text-gray-400 text-sm" numberOfLines={1}>{talent.headline}</Text>
          ) : null}
          <View className="flex-row items-center mt-0.5">
            <Star size={11} color="#FFD700" fill="#FFD700" />
            <Text className="text-gray-400 text-xs ml-1">{talent.avgRating?.toFixed(1) ?? "0.0"} · {talent.totalReviews} reviews</Text>
          </View>
        </View>
      </Pressable>

      {/* Tour name */}
      <View className="bg-[#E53935]/10 rounded-xl px-3 py-2 mb-3">
        <Text className="text-[#E53935] font-bold text-sm" numberOfLines={1}>{tour.name}</Text>
      </View>

      {/* Tour stops */}
      {tour.stops.length > 0 ? (
        <View className="mb-3">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Cities on Tour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {tour.stops.map((stop) => (
              <View key={stop.id} className="bg-[#2C2C2E] rounded-xl px-3 py-2">
                <View className="flex-row items-center mb-0.5">
                  <MapPin size={11} color="#E53935" />
                  <Text className="text-white text-sm font-semibold ml-1">
                    {stop.city}{stop.state ? `, ${stop.state}` : null}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Calendar size={10} color="#8E8E93" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {new Date(stop.arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" \u2013 "}
                    {new Date(stop.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Message button */}
      <Pressable
        className="bg-[#E53935] rounded-xl py-3 items-center flex-row justify-center"
        onPress={onMessage}
      >
        <MessageSquare size={15} color="#fff" />
        <Text className="text-white font-semibold text-sm ml-1.5">Reach Out to {talent.name?.split(" ")[0]}</Text>
      </Pressable>
    </View>
  );
}

export default function TourDiscoveryScreen() {
  const router = useRouter();
  const [citySearch, setCitySearch] = useState<string>("");
  const { data: session } = useSession();

  const { data: tours, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["public-tours", citySearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (citySearch.trim()) params.set("city", citySearch.trim());
      const query = params.toString();
      return api.get<PublicTour[]>(`/api/public-tours${query ? `?${query}` : ""}`);
    },
  });

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Active Tours</Text>
            <Text className="text-gray-500 text-xs">Talent looking for press stops</Text>
          </View>
        </View>

        {/* City search */}
        <View className="px-4 mb-3">
          <View className="flex-row items-center bg-[#1C1C1E] rounded-xl px-3 py-2.5">
            <MapPin size={16} color="#8E8E93" />
            <TextInput
              testID="tour-city-search-input"
              className="flex-1 text-white text-sm ml-2"
              placeholder="Filter by city..."
              placeholderTextColor="#8E8E93"
              value={citySearch}
              onChangeText={setCitySearch}
            />
          </View>
        </View>

        {isLoading ? (
          <View testID="tours-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <FlashList
            testID="public-tours-list"
            data={tours ?? []}
            estimatedItemSize={220}
            renderItem={({ item }) => (
              <TourCard
                tour={item}
                onMessage={() => {
                  if (session?.user?.id !== item.talentId) {
                    router.push(`/chat/${item.talentId}` as any);
                  }
                }}
                onViewCreator={() => router.push(`/user/${item.talentId}` as any)}
              />
            )}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-500 text-base">No active tours</Text>
                <Text className="text-gray-600 text-sm mt-1">Check back soon for talent in your area</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
