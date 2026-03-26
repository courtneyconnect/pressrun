import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
} from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import type { Booking, Offer } from "@/types";
import * as Haptics from "expo-haptics";

export default function NegotiateScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [offerAmount, setOfferAmount] = useState<string>("");
  const [offerMessage, setOfferMessage] = useState<string>("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.get<Booking>(`/api/bookings/${bookingId}`),
    enabled: !!bookingId,
  });

  const isTalent = booking?.talentId === currentUserId;

  // The latest PENDING offer from the other party (which the current user can accept/reject)
  const latestOtherOffer = (booking?.offers ?? []).find(
    (o) => o.senderId !== currentUserId && o.status === "PENDING"
  );

  const submitOffer = useMutation({
    mutationFn: () =>
      api.post<Offer>(`/api/bookings/${bookingId}/offers`, {
        amount: Math.round(parseFloat(offerAmount || "0") * 100),
        message: offerMessage.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setOfferAmount("");
      setOfferMessage("");
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const acceptOffer = useMutation({
    mutationFn: () =>
      api.put<Offer>(`/api/bookings/${bookingId}/offers/${latestOtherOffer!.id}`, {
        status: "ACCEPTED",
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.back();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const declineBooking = useMutation({
    mutationFn: () =>
      api.put<Booking>(`/api/bookings/${bookingId}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.back();
    },
  });

  const isPending =
    submitOffer.isPending || acceptOffer.isPending || declineBooking.isPending;

  if (isLoading || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  const offers = booking.offers ?? [];
  const currentFeeDisplay = `$${(booking.agreedFee / 100).toFixed(2)}`;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2C2C2E" }}>
          <Pressable testID="back-button" onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>Negotiate</Text>
            <Text style={{ color: "#8E8E93", fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {booking.title}
            </Text>
          </View>
          <View style={{ backgroundColor: "#E53935" + "20", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: "#E53935", fontSize: 12, fontWeight: "700" }}>{booking.status}</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Current Terms */}
            <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, margin: 16, padding: 16 }}>
              <Text style={{ color: "#8E8E93", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Current Terms</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <DollarSign size={16} color="#22c55e" />
                <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginLeft: 8 }}>
                  {currentFeeDisplay}
                </Text>
                <Text style={{ color: "#8E8E93", fontSize: 13, marginLeft: 6 }}>agreed fee</Text>
              </View>
              {booking.proposedDate ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock size={14} color="#8E8E93" />
                  <Text style={{ color: "#8E8E93", fontSize: 13, marginLeft: 8 }}>
                    {format(new Date(booking.proposedDate), "EEE, MMM d, yyyy")}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Accept latest offer (if one exists from other party) */}
            {latestOtherOffer ? (
              <View style={{ backgroundColor: "#052e16", borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: "#22c55e40" }}>
                <Text style={{ color: "#22c55e", fontSize: 13, fontWeight: "700", marginBottom: 4 }}>
                  Open Offer from {isTalent ? "Press Stop" : "Talent"}
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 4 }}>
                  ${(latestOtherOffer.amount / 100).toFixed(2)}
                </Text>
                {latestOtherOffer.message ? (
                  <Text style={{ color: "#8E8E93", fontSize: 13, marginBottom: 12 }}>{latestOtherOffer.message}</Text>
                ) : <View style={{ marginBottom: 12 }} />}
                <Pressable
                  testID="accept-offer-button"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    acceptOffer.mutate();
                  }}
                  disabled={isPending}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#15803d" : "#16a34a",
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    opacity: isPending ? 0.6 : 1,
                  })}
                >
                  {acceptOffer.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
                        Accept This Offer
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* Counter Offer Form */}
            <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                <TrendingUp size={16} color="#E53935" />
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>Counter Offer</Text>
              </View>

              <Text style={{ color: "#8E8E93", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                Your Offer (USD)
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#2C2C2E", borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 }}>
                <Text style={{ color: "#8E8E93", fontSize: 17, marginRight: 4 }}>$</Text>
                <TextInput
                  testID="counter-offer-amount-input"
                  style={{ flex: 1, color: "#FFFFFF", fontSize: 17, paddingVertical: 12 }}
                  placeholder="0.00"
                  placeholderTextColor="#555558"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={{ color: "#8E8E93", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                Message (optional)
              </Text>
              <TextInput
                testID="counter-offer-message-input"
                style={{ backgroundColor: "#2C2C2E", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#FFFFFF", fontSize: 14, minHeight: 80, textAlignVertical: "top", marginBottom: 14 }}
                placeholder="Explain your counter offer..."
                placeholderTextColor="#555558"
                value={offerMessage}
                onChangeText={setOfferMessage}
                multiline
                numberOfLines={3}
              />

              {submitOffer.isError ? (
                <Text style={{ color: "#E53935", fontSize: 13, marginBottom: 10, textAlign: "center" }}>
                  {(submitOffer.error as Error)?.message ?? "Failed to submit offer"}
                </Text>
              ) : null}

              <Pressable
                testID="send-counter-offer-button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  submitOffer.mutate();
                }}
                disabled={isPending || !offerAmount.trim() || parseFloat(offerAmount) <= 0}
                style={({ pressed }) => ({
                  backgroundColor:
                    isPending || !offerAmount.trim() || parseFloat(offerAmount) <= 0
                      ? "#4C4C4E"
                      : pressed
                      ? "#c62828"
                      : "#E53935",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                })}
              >
                {submitOffer.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                    Send Counter Offer
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Offer History */}
            {offers.length > 0 ? (
              <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                <Text style={{ color: "#8E8E93", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                  Offer History
                </Text>
                {offers.map((offer) => {
                  const isOwn = offer.senderId === currentUserId;
                  const statusColor =
                    offer.status === "ACCEPTED"
                      ? "#22c55e"
                      : offer.status === "REJECTED"
                      ? "#E53935"
                      : "#8E8E93";
                  return (
                    <View
                      key={offer.id}
                      style={{
                        backgroundColor: "#1C1C1E",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: isOwn ? "#E53935" : "#4FC3F7",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                          ${(offer.amount / 100).toFixed(2)}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: statusColor, fontSize: 11, fontWeight: "600" }}>
                            {offer.status}
                          </Text>
                          <Text style={{ color: "#555558", fontSize: 11 }}>
                            {format(new Date(offer.createdAt), "MMM d, h:mm a")}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#8E8E93", fontSize: 12 }}>
                        {isOwn ? "You" : offer.sender?.name ?? "Other party"}
                      </Text>
                      {offer.message ? (
                        <Text style={{ color: "#8E8E93", fontSize: 13, marginTop: 6 }}>{offer.message}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Decline button */}
            <View style={{ marginHorizontal: 16, marginBottom: 40 }}>
              <Pressable
                testID="decline-booking-button"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  declineBooking.mutate();
                }}
                disabled={isPending}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#3a3a3c" : "#2C2C2E",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  opacity: isPending ? 0.6 : 1,
                })}
              >
                {declineBooking.isPending ? (
                  <ActivityIndicator size="small" color="#8E8E93" />
                ) : (
                  <>
                    <XCircle size={18} color="#8E8E93" />
                    <Text style={{ color: "#8E8E93", fontWeight: "600", fontSize: 15, marginLeft: 8 }}>
                      Decline Booking
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
