import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, DollarSign } from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import type { Booking, BookingStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-600",
  ACCEPTED: "bg-blue-600",
  NEGOTIATING: "bg-orange-600",
  CONFIRMED: "bg-green-600",
  IN_PROGRESS: "bg-purple-600",
  COMPLETED: "bg-blue-500",
  CANCELLED: "bg-red-800",
  DISPUTED: "bg-red-600",
};

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const otherParty = booking.talent ?? booking.pressStop;
  const statusColor = STATUS_COLORS[booking.status] ?? "bg-gray-600";
  const initials = (otherParty?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      testID={`booking-card-${booking.id}`}
      className="bg-[#1C1C1E] rounded-2xl p-4 mb-3"
      onPress={onPress}
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-full bg-[#2C2C2E] items-center justify-center mr-3">
          <Text className="text-white font-bold">{initials}</Text>
        </View>

        <View className="flex-1">
          {/* Name + Status */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white font-semibold text-base flex-1 mr-2" numberOfLines={1}>
              {otherParty?.name ?? "Unknown"}
            </Text>
            <View className={`${statusColor} rounded-full px-2 py-0.5`}>
              <Text className="text-white text-[10px] font-medium">
                {booking.status}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-gray-400 text-sm mb-1.5" numberOfLines={1}>
            {booking.title}
          </Text>

          {/* Type pill */}
          <View className="self-start bg-[#2C2C2E] rounded-full px-2 py-0.5 mb-2">
            <Text className="text-gray-300 text-xs">
              {booking.type?.replace(/_/g, " ") ?? "OTHER"}
            </Text>
          </View>

          {/* Date + Fee */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <CalendarIcon size={12} color="#8E8E93" />
              <Text className="text-gray-400 text-xs ml-1">
                {booking.proposedDate
                  ? format(new Date(booking.proposedDate), "MMM d, yyyy")
                  : "TBD"}
              </Text>
            </View>
            <View className="flex-row items-center">
              <DollarSign size={12} color="#8E8E93" />
              <Text className="text-gray-300 text-xs font-medium">
                ${booking.agreedFee ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  const {
    data: bookings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/bookings"),
  });

  const filteredBookings = (bookings ?? []).filter((b) =>
    filter === "ALL" ? true : b.status === filter
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4 pt-2 pb-3">
          <Text className="text-2xl font-bold text-white">Bookings</Text>
        </View>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          style={{ flexGrow: 0 }}
          className="mb-3"
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.value}
              testID={`filter-${f.value.toLowerCase()}`}
              className={`rounded-full px-4 py-2 ${
                filter === f.value ? "bg-[#E53935]" : "bg-[#1C1C1E]"
              }`}
              onPress={() => setFilter(f.value)}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === f.value ? "text-white" : "text-gray-400"
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Bookings List */}
        {isLoading ? (
          <View testID="bookings-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView
            testID="bookings-list"
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#E53935"
              />
            }
          >
            {filteredBookings.length === 0 ? (
              <View className="items-center py-20">
                <CalendarIcon size={48} color="#2C2C2E" />
                <Text className="text-gray-500 text-base mt-4">
                  No bookings yet
                </Text>
              </View>
            ) : (
              filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPress={() => router.push(`/booking/${booking.id}` as any)}
                />
              ))
            )}
            <View className="h-24" />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
