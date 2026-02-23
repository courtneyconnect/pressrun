import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  BadgeCheck,
  MessageSquare,
  Video,
  Link,
  CalendarDays,
  X,
  CheckCircle2,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { SeriesDiscoverResult, SeriesExample, Booking } from "@/types";
import { useSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";

type BookingFormState = {
  title: string;
  type: string;
  proposedDate: string;
  feeAmount: string;
  description: string;
};

function BookNowModal({
  visible,
  onClose,
  seriesTitle,
  seriesPrice,
  pressStopId,
}: {
  visible: boolean;
  onClose: () => void;
  seriesTitle: string;
  seriesPrice: number;
  pressStopId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BookingFormState>({
    title: seriesTitle,
    type: "CONTENT_CREATION",
    proposedDate: "",
    feeAmount: seriesPrice > 0 ? String((seriesPrice / 100).toFixed(2)) : "0",
    description: "",
  });
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const createBooking = useMutation({
    mutationFn: () =>
      api.post<Booking>("/api/bookings", {
        pressStopId,
        title: form.title,
        type: form.type,
        description: form.description || undefined,
        proposedDate: form.proposedDate || undefined,
        agreedFee: Math.round(parseFloat(form.feeAmount || "0") * 100),
      }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBookingSuccess(data.id);
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleClose = () => {
    if (bookingSuccess) {
      onClose();
      router.push(`/booking/${bookingSuccess}` as any);
    } else {
      onClose();
    }
    setBookingSuccess(null);
    setForm({
      title: seriesTitle,
      type: "CONTENT_CREATION",
      proposedDate: "",
      feeAmount: seriesPrice > 0 ? String((seriesPrice / 100).toFixed(2)) : "0",
      description: "",
    });
  };

  const inputStyle = {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    marginBottom: 12,
  };

  const labelStyle = {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    marginBottom: 6,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#1C1C1E",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 40,
              maxHeight: "90%",
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#3C3C3E",
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#2C2C2E",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                  Book Now
                </Text>
                <Text style={{ color: "#8E8E93", fontSize: 13, marginTop: 2 }}>
                  Send a booking request to this creator
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                testID="close-booking-modal"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#2C2C2E",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color="#8E8E93" />
              </Pressable>
            </View>

            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {bookingSuccess ? (
                /* Success state */
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 40,
                    paddingHorizontal: 20,
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: "#22c55e20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <CheckCircle2 size={36} color="#22c55e" />
                  </View>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 20,
                      fontWeight: "700",
                      marginBottom: 8,
                    }}
                  >
                    Booking Sent!
                  </Text>
                  <Text
                    style={{
                      color: "#8E8E93",
                      fontSize: 14,
                      textAlign: "center",
                      lineHeight: 20,
                    }}
                  >
                    Your booking request has been sent. The creator will review and respond
                    shortly.
                  </Text>
                  <Pressable
                    testID="view-booking-button"
                    onPress={handleClose}
                    style={{
                      marginTop: 28,
                      backgroundColor: "#22c55e",
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 32,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                      View Booking
                    </Text>
                  </Pressable>
                </View>
              ) : (
                /* Form */
                <>
                  <Text style={labelStyle}>Booking Title</Text>
                  <TextInput
                    testID="booking-title-input"
                    style={inputStyle}
                    value={form.title}
                    onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                    placeholder="Title"
                    placeholderTextColor="#555558"
                    returnKeyType="next"
                  />

                  <Text style={labelStyle}>Proposed Date</Text>
                  <TextInput
                    testID="booking-date-input"
                    style={inputStyle}
                    value={form.proposedDate}
                    onChangeText={(v) => setForm((f) => ({ ...f, proposedDate: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#555558"
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="next"
                  />

                  <Text style={labelStyle}>Fee (USD)</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#2C2C2E",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: "#8E8E93", fontSize: 16, marginRight: 4 }}>$</Text>
                    <TextInput
                      testID="booking-fee-input"
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        color: "#fff",
                        fontSize: 15,
                      }}
                      value={form.feeAmount}
                      onChangeText={(v) => setForm((f) => ({ ...f, feeAmount: v }))}
                      placeholder="0.00"
                      placeholderTextColor="#555558"
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={labelStyle}>Note to Creator (optional)</Text>
                  <TextInput
                    testID="booking-description-input"
                    style={[inputStyle, { minHeight: 88, textAlignVertical: "top" }]}
                    value={form.description}
                    onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="Tell the creator what you have in mind..."
                    placeholderTextColor="#555558"
                    multiline
                    numberOfLines={3}
                  />

                  {createBooking.isError ? (
                    <Text
                      style={{
                        color: "#E53935",
                        fontSize: 13,
                        marginBottom: 12,
                        textAlign: "center",
                      }}
                    >
                      {(createBooking.error as Error)?.message ?? "Failed to send booking. Please try again."}
                    </Text>
                  ) : null}

                  <Pressable
                    testID="submit-booking-button"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      createBooking.mutate();
                    }}
                    disabled={createBooking.isPending || !form.title.trim()}
                    style={{
                      backgroundColor: "#E53935",
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                      opacity: createBooking.isPending || !form.title.trim() ? 0.6 : 1,
                    }}
                  >
                    {createBooking.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                        Send Booking Request
                      </Text>
                    )}
                  </Pressable>

                  <View style={{ height: 8 }} />
                </>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default function SeriesDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();
  const [bookingModalVisible, setBookingModalVisible] = useState<boolean>(false);

  const { data, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => api.get<SeriesDiscoverResult>(`/api/series-discover/${id}`),
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

  const isOwnSeries = session?.user?.id === creator.id;

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

            {/* Action buttons — only if not own series */}
            {!isOwnSeries ? (
              <>
                {/* Book Now button */}
                <Pressable
                  testID="book-now-button"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setBookingModalVisible(true);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#1a9e50" : "#22c55e",
                    borderRadius: 16,
                    paddingVertical: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    marginBottom: 10,
                  })}
                >
                  <CalendarDays size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    Book Now
                  </Text>
                </Pressable>

                {/* Message button */}
                <Pressable
                  testID="message-creator-button"
                  className="bg-[#E53935] rounded-2xl py-4 items-center mb-3 flex-row justify-center"
                  onPress={handleMessage}
                >
                  <MessageSquare size={18} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Message {creator.name?.split(" ")[0]}</Text>
                </Pressable>
              </>
            ) : null}

            <View className="h-8" />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Book Now Modal */}
      <BookNowModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        seriesTitle={series.title}
        seriesPrice={series.price}
        pressStopId={creator.id}
      />
    </View>
  );
}
