import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, MapPin, Calendar as CalendarIcon } from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import type { Tour, Availability } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TourCard({ tour, onPress }: { tour: Tour; onPress: () => void }) {
  const statusColor =
    tour.status === "ACTIVE"
      ? "bg-green-600"
      : tour.status === "DRAFT"
        ? "bg-yellow-600"
        : "bg-gray-600";

  return (
    <Pressable
      testID={`tour-card-${tour.id}`}
      className="bg-[#1C1C1E] rounded-2xl p-4 mb-3"
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white font-semibold text-base flex-1 mr-2" numberOfLines={1}>
          {tour.name}
        </Text>
        <View className={`${statusColor} rounded-full px-2.5 py-0.5`}>
          <Text className="text-white text-xs font-medium">
            {tour.status}
          </Text>
        </View>
      </View>

      {tour.startDate ? (
        <View className="flex-row items-center mb-1.5">
          <CalendarIcon size={14} color="#8E8E93" />
          <Text className="text-gray-400 text-sm ml-1.5">
            {format(new Date(tour.startDate), "MMM d")}
            {tour.endDate ? ` - ${format(new Date(tour.endDate), "MMM d, yyyy")}` : null}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center">
        <MapPin size={14} color="#8E8E93" />
        <Text className="text-gray-400 text-sm ml-1.5">
          {tour.stops?.length ?? 0} stops
        </Text>
      </View>
    </Pressable>
  );
}

function AvailabilityRow({ item }: { item: Availability }) {
  return (
    <View
      testID={`availability-row-${item.dayOfWeek}`}
      className="flex-row items-center justify-between bg-[#1C1C1E] rounded-xl px-4 py-3 mb-2"
    >
      <Text className="text-white font-medium text-sm w-12">
        {DAYS[item.dayOfWeek] ?? "?"}
      </Text>
      <Text className="text-gray-400 text-sm flex-1 text-center">
        {item.isAvailable
          ? `${item.startTime} - ${item.endTime}`
          : "Unavailable"}
      </Text>
      <Switch
        value={item.isAvailable}
        trackColor={{ false: "#2C2C2E", true: "#E53935" }}
        thumbColor="#FFFFFF"
        disabled
      />
    </View>
  );
}

export default function ToursScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role as string | undefined;
  const isTalent = userRole === "TALENT";

  const {
    data: tours,
    isLoading: toursLoading,
    refetch: refetchTours,
    isRefetching: toursRefetching,
  } = useQuery({
    queryKey: ["tours"],
    queryFn: () => api.get<Tour[]>("/api/tours"),
    enabled: isTalent,
  });

  const {
    data: availability,
    isLoading: availLoading,
    refetch: refetchAvail,
    isRefetching: availRefetching,
  } = useQuery({
    queryKey: ["availability"],
    queryFn: () => api.get<{ slots: Availability[]; exceptions: unknown[] }>("/api/availability"),
    enabled: !isTalent,
  });

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4 pt-2 pb-3">
          <Text className="text-2xl font-bold text-white">
            {isTalent ? "My Tours" : "My Availability"}
          </Text>
        </View>

        {isTalent ? (
          /* Talent: Tours List */
          <ScrollView
            testID="tours-list"
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={toursRefetching}
                onRefresh={refetchTours}
                tintColor="#E53935"
              />
            }
          >
            {toursLoading ? (
              <View testID="tours-loading" className="items-center py-20">
                <ActivityIndicator size="large" color="#E53935" />
              </View>
            ) : (tours ?? []).length === 0 ? (
              <View className="items-center py-20">
                <MapPin size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">
                  No tours yet
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Create your first press tour
                </Text>
              </View>
            ) : (
              (tours ?? []).map((tour) => (
                <TourCard key={tour.id} tour={tour} onPress={() => {}} />
              ))
            )}
            <View className="h-24" />
          </ScrollView>
        ) : (
          /* PressStop: Availability */
          <ScrollView
            testID="availability-list"
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={availRefetching}
                onRefresh={refetchAvail}
                tintColor="#E53935"
              />
            }
          >
            {availLoading ? (
              <View testID="availability-loading" className="items-center py-20">
                <ActivityIndicator size="large" color="#E53935" />
              </View>
            ) : (availability?.slots ?? []).length === 0 ? (
              <View className="items-center py-20">
                <CalendarIcon size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">
                  No availability set
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Your weekly schedule will appear here
                </Text>
              </View>
            ) : (
              (availability?.slots ?? []).map((item: Availability) => (
                <AvailabilityRow key={item.id} item={item} />
              ))
            )}
            <View className="h-24" />
          </ScrollView>
        )}

        {/* FAB - Create Tour (Talent only) */}
        {isTalent ? (
          <Pressable
            testID="create-tour-fab"
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#E53935] items-center justify-center shadow-lg"
            onPress={() => router.push("/create-tour" as any)}
          >
            <Plus size={28} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
