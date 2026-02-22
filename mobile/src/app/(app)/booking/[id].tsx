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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import type { Booking, Offer } from "@/types";
import { BookingCelebration } from "@/components/BookingCelebration";

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

function OfferCard({ offer }: { offer: Offer }) {
  const senderInitials = (offer.sender?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-row items-start bg-[#2C2C2E] rounded-xl p-3 mb-2">
      <View className="w-8 h-8 rounded-full bg-[#3C3C3E] items-center justify-center mr-2">
        <Text className="text-white text-xs font-bold">{senderInitials}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-sm font-medium">
            {offer.sender?.name ?? "Unknown"}
          </Text>
          <Text className="text-green-400 font-bold text-sm">
            ${offer.amount}
          </Text>
        </View>
        {offer.message ? (
          <Text className="text-gray-400 text-xs mt-1">{offer.message}</Text>
        ) : null}
        <Text className="text-gray-500 text-[10px] mt-1">
          {format(new Date(offer.createdAt), "MMM d, h:mm a")} - {offer.status}
        </Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch<Booking>(`/api/bookings/${id}`, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (status === "ACCEPTED") {
        setShowCelebration(true);
      }
    },
  });

  const statusColor = STATUS_COLORS[booking?.status ?? ""] ?? "bg-gray-600";
  const isTalent = booking?.talentId === currentUserId;
  const isPressStop = booking?.pressStopId === currentUserId;
  const otherParty = isTalent ? booking?.pressStop : booking?.talent;
  const otherInitials = (otherParty?.name ?? "?")
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
          <Text className="text-white font-semibold text-lg ml-3">
            Booking Details
          </Text>
        </View>

        {isLoading ? (
          <View testID="booking-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : booking ? (
          <ScrollView testID="booking-detail" className="flex-1 px-4">
            {/* Status Badge */}
            <View className="items-center mb-6">
              <View className={`${statusColor} rounded-full px-4 py-1.5`}>
                <Text className="text-white font-semibold text-sm">
                  {booking.status}
                </Text>
              </View>
            </View>

            {/* Other Party */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-[#2C2C2E] items-center justify-center mr-3">
                  <Text className="text-white font-bold">{otherInitials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">
                    {otherParty?.name ?? "Unknown"}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {isTalent ? "Press Stop" : "Talent"}
                  </Text>
                </View>
                <Pressable
                  testID="message-button"
                  className="bg-[#2C2C2E] rounded-full p-2.5"
                  onPress={() =>
                    router.push(`/chat/${otherParty?.id}` as any)
                  }
                >
                  <MessageSquare size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Booking Info */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
              <Text className="text-white font-semibold text-base mb-3">
                {booking.title}
              </Text>
              {booking.description ? (
                <Text className="text-gray-400 text-sm mb-3">
                  {booking.description}
                </Text>
              ) : null}

              <View className="bg-[#2C2C2E] rounded-full px-2.5 py-0.5 self-start mb-3">
                <Text className="text-gray-300 text-xs">
                  {booking.type?.replace(/_/g, " ") ?? "OTHER"}
                </Text>
              </View>

              <View className="gap-2">
                {booking.proposedDate ? (
                  <View className="flex-row items-center">
                    <Calendar size={14} color="#8E8E93" />
                    <Text className="text-gray-300 text-sm ml-2">
                      {format(new Date(booking.proposedDate), "EEEE, MMM d, yyyy")}
                    </Text>
                  </View>
                ) : null}
                {booking.startTime ? (
                  <View className="flex-row items-center">
                    <Clock size={14} color="#8E8E93" />
                    <Text className="text-gray-300 text-sm ml-2">
                      {booking.startTime}
                      {booking.endTime ? ` - ${booking.endTime}` : null}
                    </Text>
                  </View>
                ) : null}
                {booking.location ? (
                  <View className="flex-row items-center">
                    <MapPin size={14} color="#8E8E93" />
                    <Text className="text-gray-300 text-sm ml-2">
                      {booking.location}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center">
                  <DollarSign size={14} color="#8E8E93" />
                  <Text className="text-white font-semibold text-sm ml-2">
                    ${booking.agreedFee}
                  </Text>
                  <Text className="text-gray-500 text-xs ml-1">
                    (+ ${booking.platformFee} platform fee)
                  </Text>
                </View>
              </View>
            </View>

            {/* Offers */}
            {(booking.offers ?? []).length > 0 ? (
              <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-3 uppercase">
                  Offer History
                </Text>
                {(booking.offers ?? []).map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </View>
            ) : null}

            {/* Action Buttons */}
            <View className="gap-3 mb-8">
              {booking.status === "PENDING" && isPressStop ? (
                <>
                  <Pressable
                    testID="accept-booking-button"
                    className="bg-[#E53935] rounded-xl py-4 items-center flex-row justify-center"
                    onPress={() => updateStatus.mutate("ACCEPTED")}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text className="text-white font-semibold ml-2">
                      Accept Booking
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="reject-booking-button"
                    className="bg-[#1C1C1E] rounded-xl py-4 items-center flex-row justify-center"
                    onPress={() => updateStatus.mutate("CANCELLED")}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle size={18} color="#8E8E93" />
                    <Text className="text-gray-400 font-semibold ml-2">
                      Decline
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {booking.status === "PENDING" && isTalent ? (
                <Pressable
                  testID="cancel-booking-button"
                  className="bg-[#1C1C1E] rounded-xl py-4 items-center"
                  onPress={() => updateStatus.mutate("CANCELLED")}
                  disabled={updateStatus.isPending}
                >
                  <Text className="text-gray-400 font-semibold">
                    Cancel Booking
                  </Text>
                </Pressable>
              ) : null}

              {booking.status === "CONFIRMED" ? (
                <>
                  <Pressable
                    testID="start-session-button"
                    className="bg-[#E53935] rounded-xl py-4 items-center"
                    onPress={() => updateStatus.mutate("IN_PROGRESS")}
                    disabled={updateStatus.isPending}
                  >
                    <Text className="text-white font-semibold">
                      Start Session
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="cancel-confirmed-button"
                    className="bg-[#1C1C1E] rounded-xl py-4 items-center"
                    onPress={() => updateStatus.mutate("CANCELLED")}
                    disabled={updateStatus.isPending}
                  >
                    <Text className="text-gray-400 font-semibold">Cancel</Text>
                  </Pressable>
                </>
              ) : null}

              {booking.status === "IN_PROGRESS" ? (
                <Pressable
                  testID="complete-session-button"
                  className="bg-[#E53935] rounded-xl py-4 items-center"
                  onPress={() => updateStatus.mutate("COMPLETED")}
                  disabled={updateStatus.isPending}
                >
                  <Text className="text-white font-semibold">
                    Mark Complete
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="h-12" />
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">Booking not found</Text>
          </View>
        )}
        <BookingCelebration
          visible={showCelebration}
          onDismiss={() => setShowCelebration(false)}
        />
      </SafeAreaView>
    </View>
  );
}
