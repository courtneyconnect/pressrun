import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BookingCelebration } from "@/components/BookingCelebration";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  BadgeCheck,
  MessageSquare,
  Calendar,
  X,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import * as Haptics from "expo-haptics";
import type { User, Booking, BookingType } from "@/types";

const BOOKING_TYPES: { value: BookingType; label: string }[] = [
  { value: "INTERVIEW", label: "Interview" },
  { value: "APPEARANCE", label: "Appearance" },
  { value: "CONTENT_CREATION", label: "Content" },
  { value: "COLLAB", label: "Collab" },
  { value: "EVENT", label: "Event" },
  { value: "OTHER", label: "Other" },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PressStopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCelebration, setShowCelebration] = useState(false);
  const [newBookingId, setNewBookingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>("INTERVIEW");
  const [proposedDate, setProposedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: user,
    isLoading,
  } = useQuery({
    queryKey: ["press-stop", id],
    queryFn: () => api.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });

  const profile = user?.pressStopProfile;

  // Pre-fill fee when user data loads
  React.useEffect(() => {
    if (profile?.baseFee != null) {
      setFee(String(profile.baseFee));
    }
  }, [profile?.baseFee]);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createBookingMutation = useMutation({
    mutationFn: () =>
      api.post<Booking>("/api/bookings", {
        pressStopId: id,
        type: bookingType,
        title,
        description: description || undefined,
        proposedDate: proposedDate.toISOString(),
        agreedFee: Number(fee),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowModal(false);
      setNewBookingId(data.id);
      setShowCelebration(true);
    },
    onError: (err: Error) => {
      setSubmitError(err?.message ?? "Something went wrong. Please try again.");
    },
  });

  function handleOpenModal() {
    setTitle("");
    setBookingType("INTERVIEW");
    setProposedDate(new Date());
    setShowDatePicker(false);
    setDescription("");
    setFee(profile?.baseFee != null ? String(profile.baseFee) : "");
    setSubmitError(null);
    setShowModal(true);
  }

  function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitError(null);
    if (!title.trim()) {
      setSubmitError("Title is required.");
      return;
    }
    createBookingMutation.mutate();
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable testID="back-button" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg ml-3 flex-1" numberOfLines={1}>
            {user?.name ?? "Press Stop"}
          </Text>
        </View>

        {isLoading ? (
          <View testID="press-stop-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView testID="press-stop-detail" className="flex-1">
            {/* Profile Header */}
            <View className="items-center px-4 pt-4 pb-6">
              <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3">
                <Text className="text-white text-3xl font-bold">{initials}</Text>
              </View>

              <View className="flex-row items-center mb-1">
                <Text className="text-white text-xl font-bold mr-1.5">
                  {user?.name}
                </Text>
                {user?.verified ? (
                  <BadgeCheck size={20} color="#4FC3F7" />
                ) : null}
              </View>

              {profile?.category ? (
                <View className="bg-[#E53935]/20 rounded-full px-3 py-1 mt-1">
                  <Text className="text-[#E53935] text-sm font-medium">
                    {profile.category.replace(/_/g, " ")}
                  </Text>
                </View>
              ) : null}

              {user?.city ? (
                <View className="flex-row items-center mt-2">
                  <MapPin size={14} color="#8E8E93" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {user.city}{user.state ? `, ${user.state}` : null}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Stats */}
            <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text className="text-white font-bold text-lg ml-1">
                    {user?.avgRating?.toFixed(1) ?? "0.0"}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">Rating</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <MessageSquare size={14} color="#8E8E93" />
                  <Text className="text-white font-bold text-lg ml-1">
                    {user?.totalReviews ?? 0}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">Reviews</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Clock size={14} color="#8E8E93" />
                  <Text className="text-white font-bold text-lg ml-1">
                    {user?.responseRate ?? 0}%
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">Response</Text>
              </View>
            </View>

            {/* Bio */}
            {user?.bio ? (
              <View className="bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-2 uppercase">
                  About
                </Text>
                <Text className="text-gray-200 text-sm leading-5">
                  {user.bio}
                </Text>
              </View>
            ) : null}

            {/* Details */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mx-4 mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-3 uppercase">
                Details
              </Text>
              {profile?.baseFee != null ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Base Fee</Text>
                  <Text className="text-white font-semibold text-sm">
                    ${profile.baseFee}/session
                  </Text>
                </View>
              ) : null}
              {profile?.capacity != null ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Capacity</Text>
                  <Text className="text-white text-sm">{profile.capacity}</Text>
                </View>
              ) : null}
              {profile?.physicalAddress ? (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-400 text-sm">Location</Text>
                  <Text className="text-white text-sm flex-1 text-right ml-4" numberOfLines={2}>
                    {profile.physicalAddress}
                  </Text>
                </View>
              ) : null}
              {profile?.operatingHours ? (
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-sm">Hours</Text>
                  <Text className="text-white text-sm">{profile.operatingHours}</Text>
                </View>
              ) : null}
            </View>

            <View className="h-28" />
          </ScrollView>
        )}

        {/* Bottom CTA */}
        {!isLoading && user ? (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(0,0,0,0.9)",
              borderTopWidth: 1,
              borderTopColor: "#2C2C2E",
              paddingHorizontal: 16,
              paddingBottom: 32,
              paddingTop: 16,
            }}
          >
            <Pressable
              testID="request-booking-button"
              style={{
                backgroundColor: "#E53935",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
              onPress={handleOpenModal}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Calendar size={18} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
                  Request Booking
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Booking Request Modal */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "flex-end",
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 0 }}
            >
              <View
                style={{
                  backgroundColor: "#1C1C1E",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  maxHeight: "90%",
                }}
              >
                {/* Drag Handle */}
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      backgroundColor: "#3C3C3E",
                      borderRadius: 2,
                    }}
                  />
                </View>

                {/* Modal Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
                    Request Booking
                  </Text>
                  <Pressable
                    testID="close-modal-button"
                    onPress={() => setShowModal(false)}
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
                  style={{ paddingHorizontal: 20 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Title */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500", textTransform: "uppercase", marginBottom: 8 }}>
                      Title *
                    </Text>
                    <TextInput
                      testID="booking-title-input"
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Podcast Interview"
                      placeholderTextColor="#48484A"
                      style={{
                        backgroundColor: "#2C2C2E",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        color: "#FFFFFF",
                        fontSize: 16,
                      }}
                    />
                  </View>

                  {/* Type */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500", textTransform: "uppercase", marginBottom: 8 }}>
                      Type
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {BOOKING_TYPES.map((t) => (
                        <Pressable
                          testID={`booking-type-${t.value}`}
                          key={t.value}
                          onPress={() => setBookingType(t.value)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: bookingType === t.value ? "#E53935" : "#2C2C2E",
                          }}
                        >
                          <Text
                            style={{
                              color: bookingType === t.value ? "#FFFFFF" : "#8E8E93",
                              fontSize: 14,
                              fontWeight: bookingType === t.value ? "600" : "400",
                            }}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Proposed Date */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500", textTransform: "uppercase", marginBottom: 8 }}>
                      Proposed Date
                    </Text>
                    <Pressable
                      testID="date-picker-button"
                      onPress={() => setShowDatePicker(true)}
                      style={{
                        backgroundColor: "#2C2C2E",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Calendar size={16} color="#8E8E93" />
                      <Text style={{ color: "#FFFFFF", fontSize: 16, marginLeft: 10 }}>
                        {formatDate(proposedDate)}
                      </Text>
                    </Pressable>
                    {showDatePicker && Platform.OS !== "web" ? (
                      <DateTimePicker
                        value={proposedDate}
                        mode="date"
                        display="spinner"
                        minimumDate={new Date()}
                        onChange={(_event, selectedDate) => {
                          if (Platform.OS !== "ios") {
                            setShowDatePicker(false);
                          }
                          if (selectedDate) {
                            setProposedDate(selectedDate);
                          }
                        }}
                      />
                    ) : null}
                    {showDatePicker && Platform.OS === "ios" ? (
                      <Pressable
                        testID="date-picker-done-button"
                        onPress={() => setShowDatePicker(false)}
                        style={{
                          marginTop: 8,
                          alignItems: "center",
                          paddingVertical: 8,
                          backgroundColor: "#2C2C2E",
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ color: "#E53935", fontWeight: "600" }}>Done</Text>
                      </Pressable>
                    ) : null}
                    {showDatePicker && Platform.OS === "web" ? (
                      <View style={{ marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#2C2C2E", borderRadius: 10 }}>
                        <Text style={{ color: "#8E8E93", fontSize: 13 }}>
                          Date selection is not available in web preview.
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Description */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500", textTransform: "uppercase", marginBottom: 8 }}>
                      Description
                    </Text>
                    <TextInput
                      testID="booking-description-input"
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Describe what you're looking for..."
                      placeholderTextColor="#48484A"
                      multiline
                      numberOfLines={4}
                      style={{
                        backgroundColor: "#2C2C2E",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        color: "#FFFFFF",
                        fontSize: 16,
                        minHeight: 96,
                        textAlignVertical: "top",
                      }}
                    />
                  </View>

                  {/* Fee Offer */}
                  <View style={{ marginBottom: 28 }}>
                    <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500", textTransform: "uppercase", marginBottom: 8 }}>
                      Fee Offer
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#2C2C2E",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ color: "#8E8E93", fontSize: 16, marginRight: 4 }}>$</Text>
                      <TextInput
                        testID="booking-fee-input"
                        value={fee}
                        onChangeText={setFee}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#48484A"
                        style={{
                          flex: 1,
                          color: "#FFFFFF",
                          fontSize: 16,
                        }}
                      />
                    </View>
                  </View>

                  {/* Error */}
                  {submitError ? (
                    <Text
                      style={{
                        color: "#E53935",
                        fontSize: 14,
                        textAlign: "center",
                        marginBottom: 12,
                      }}
                    >
                      {submitError}
                    </Text>
                  ) : null}

                  {/* Submit Button */}
                  <Pressable
                    testID="send-request-button"
                    onPress={handleSubmit}
                    disabled={createBookingMutation.isPending}
                    style={{
                      backgroundColor: "#E53935",
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                      marginBottom: 32,
                      opacity: createBookingMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {createBookingMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                        Send Request
                      </Text>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <BookingCelebration
          visible={showCelebration}
          onDismiss={() => {
            setShowCelebration(false);
            if (newBookingId) {
              router.push(`/booking/${newBookingId}` as any);
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
