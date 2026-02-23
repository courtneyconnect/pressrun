import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  BadgeCheck,
  MessageSquare,
  Video,
  Play,
  UserPlus,
  UserCheck,
  Check,
  X,
  ExternalLink,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { User, ContentSeries, Friendship, Review, SeriesExample } from "@/types";
import { useSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";
import * as VideoThumbnails from "expo-video-thumbnails";
import { PressRunLoader } from "@/components/PressRunLoader";

function PlatformButton({ label, color, url }: { label: string; color: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      className="flex-row items-center bg-[#2C2C2E] rounded-xl px-3 py-2 mr-2 mb-2"
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function FriendButton({ viewedUserId }: { viewedUserId: string }) {
  const queryClient = useQueryClient();

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<{ requested: Friendship[]; received: Friendship[] }>("/api/friends"),
  });

  const requestFriend = useMutation({
    mutationFn: () => api.post("/api/friends/request", { userId: viewedUserId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const acceptFriend = useMutation({
    mutationFn: (friendshipId: string) => api.put(`/api/friends/${friendshipId}/accept`, {}),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const requested = friendsData?.requested ?? [];
  const received = friendsData?.received ?? [];

  const pendingSent = requested.find((f) => f.addresseeId === viewedUserId);
  const receivedFromViewed = received.find((f) => f.requesterId === viewedUserId);
  const isFriends = receivedFromViewed?.status === "ACCEPTED" || requested.find((f) => f.addresseeId === viewedUserId && f.status === "ACCEPTED");

  if (isFriends) {
    return (
      <View
        testID="friends-status"
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#22c55e20", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <UserCheck size={16} color="#22c55e" />
        <Text style={{ color: "#22c55e", fontSize: 14, fontWeight: "700", marginLeft: 6 }}>Friends</Text>
        <Check size={14} color="#22c55e" style={{ marginLeft: 4 }} />
      </View>
    );
  }

  if (pendingSent) {
    return (
      <View
        testID="pending-status"
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#2C2C2E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <UserPlus size={16} color="#8E8E93" />
        <Text style={{ color: "#8E8E93", fontSize: 14, fontWeight: "600", marginLeft: 6 }}>Pending</Text>
      </View>
    );
  }

  if (receivedFromViewed && receivedFromViewed.status === "PENDING") {
    return (
      <Pressable
        testID="accept-friend-button"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); acceptFriend.mutate(receivedFromViewed.id); }}
        disabled={acceptFriend.isPending}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#22c55e", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
      >
        <Check size={16} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginLeft: 6 }}>Accept</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="add-friend-button"
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); requestFriend.mutate(); }}
      disabled={requestFriend.isPending}
      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1C1C1E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: "center" }}
    >
      {requestFriend.isPending ? (
        <ActivityIndicator size="small" color="#8E8E93" />
      ) : (
        <>
          <UserPlus size={16} color="#8E8E93" />
          <Text style={{ color: "#8E8E93", fontSize: 14, fontWeight: "600", marginLeft: 6 }}>Add Friend</Text>
        </>
      )}
    </Pressable>
  );
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color="#FFD700"
          fill={i <= rating ? "#FFD700" : "transparent"}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewer = review.reviewer;
  const initials = (reviewer?.name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const date = new Date(review.createdAt);
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <View
      testID={`review-card-${review.id}`}
      style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 16, marginBottom: 12 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#2C2C2E",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginRight: 10,
          }}
        >
          {reviewer?.image ? (
            <Image source={{ uri: reviewer.image }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginBottom: 3 }}>{reviewer?.name ?? "Anonymous"}</Text>
          <StarRow rating={review.rating} size={13} />
        </View>
        <Text style={{ color: "#636366", fontSize: 12 }}>{formatted}</Text>
      </View>
      {review.content ? (
        <Text style={{ color: "#ADADAD", fontSize: 14, lineHeight: 20 }}>{review.content}</Text>
      ) : null}
    </View>
  );
}

function ReviewModal({
  visible,
  onClose,
  revieweeId,
  revieweeName,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  revieweeId: string;
  revieweeName: string;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const slideAnim = useRef(new Animated.Value(400)).current;
  const MAX_CHARS = 180;

  useEffect(() => {
    if (visible) {
      setRating(0);
      setContent("");
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const submitReview = useMutation({
    mutationFn: () =>
      api.post("/api/reviews", {
        revieweeId,
        rating,
        content: content.trim() || null,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["user-profile", revieweeId] });
      queryClient.invalidateQueries({ queryKey: ["reviews", revieweeId] });
      onSuccess();
      onClose();
    },
  });

  const firstName = revieweeName.split(" ")[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="review-modal"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={{
                backgroundColor: "#1C1C1E",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingBottom: 36,
                paddingHorizontal: 24,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* Drag handle */}
              <View style={{ width: 36, height: 4, backgroundColor: "#3A3A3C", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

              {/* Close button */}
              <Pressable
                onPress={onClose}
                style={{ position: "absolute", top: 20, right: 20, padding: 4 }}
                testID="review-modal-close"
              >
                <X size={20} color="#8E8E93" />
              </Pressable>

              {/* Title */}
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 6 }}>
                Rate Your Experience
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 14, textAlign: "center", marginBottom: 28 }}>
                How was your shoot with {firstName}?
              </Text>

              {/* Stars */}
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRating(rating === i ? 0 : i);
                    }}
                    testID={`star-${i}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Star
                      size={36}
                      color="#FFD700"
                      fill={i <= rating ? "#FFD700" : "transparent"}
                      strokeWidth={1.5}
                    />
                  </Pressable>
                ))}
              </View>

              {/* Text input */}
              <View
                style={{
                  backgroundColor: "#2C2C2E",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                <TextInput
                  testID="review-text-input"
                  multiline
                  maxLength={MAX_CHARS}
                  placeholder="Share your experience... (optional)"
                  placeholderTextColor="#636366"
                  value={content}
                  onChangeText={setContent}
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    lineHeight: 22,
                    minHeight: 90,
                    textAlignVertical: "top",
                  }}
                />
              </View>
              <Text style={{ color: "#636366", fontSize: 12, textAlign: "right", marginBottom: 24 }}>
                {content.length} / {MAX_CHARS}
              </Text>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  testID="review-cancel-button"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: "#2C2C2E",
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: "#ADADAD", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="review-submit-button"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); submitReview.mutate(); }}
                  disabled={rating === 0 || submitReview.isPending}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: rating === 0 ? "#5A1414" : "#E53935",
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {submitReview.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: rating === 0 ? "#8E3333" : "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VideoExampleRow({ example, seriesTitle, onPress }: { example: SeriesExample; seriesTitle: string; onPress: () => void }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    VideoThumbnails.getThumbnailAsync(example.url, { time: 1000 })
      .then((result) => { if (!cancelled) setThumbnail(result.uri); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [example.url]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: "#1C1C1E",
        borderRadius: 14,
        marginBottom: 10,
        overflow: "hidden",
        opacity: pressed ? 0.78 : 1,
      })}
    >
      {/* Thumbnail banner */}
      <View style={{ width: "100%", height: 160, backgroundColor: "#111", position: "relative" }}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Video size={32} color="#3C3C3E" />
          </View>
        )}
        {/* Play overlay */}
        <View style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Play size={14} color="#fff" fill="#fff" />
        </View>
      </View>
      {/* Label row */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1 }} numberOfLines={1}>
          {example.label?.trim() || seriesTitle}
        </Text>
        <View style={{ backgroundColor: "#E53935", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>Play</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"about" | "reviews">("about");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-profile", id],
    queryFn: () => api.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => api.get<{ reviews: Review[]; total: number; page: number; limit: number; totalPages: number }>(`/api/reviews/user/${id}`),
    enabled: !!id && activeTab === "reviews",
  });

  const handleMessage = () => {
    router.push(`/chat/${id}` as any);
  };

  const isOwnProfile = session?.user?.id === id;

  if (isLoading || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <PressRunLoader size={80} />
      </View>
    );
  }

  const initials = (user.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const durationLabel = (mins: number) =>
    mins < 60 ? `${mins}m` : `${mins / 60}h`;

  const socialLinks: { label: string; color: string; url: string }[] = [];
  if (user.instagramHandle) socialLinks.push({ label: "Instagram", color: "#E1306C", url: user.instagramHandle });
  if (user.tiktokHandle) socialLinks.push({ label: "TikTok", color: "#010101", url: user.tiktokHandle });
  if (user.youtubeHandle) socialLinks.push({ label: "YouTube", color: "#FF0000", url: user.youtubeHandle });
  if (user.twitterHandle) socialLinks.push({ label: "X / Twitter", color: "#1DA1F2", url: user.twitterHandle });
  if (user.twitchUrl) socialLinks.push({ label: "Twitch", color: "#9146FF", url: user.twitchUrl });
  if (user.kickUrl) socialLinks.push({ label: "Kick", color: "#53FC18", url: user.kickUrl });
  if (user.whatnotUrl) socialLinks.push({ label: "Whatnot", color: "#FF6726", url: user.whatnotUrl });
  if (user.linkedinUrl) socialLinks.push({ label: "LinkedIn", color: "#0A66C2", url: user.linkedinUrl });
  if (user.websiteUrl) socialLinks.push({ label: "Website", color: "#8E8E93", url: user.websiteUrl });

  const reviewCount = reviewsData?.total ?? user.totalReviews ?? 0;

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-lg font-bold flex-1" numberOfLines={1}>{user.name}</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: isOwnProfile ? 32 : 100 }}>
          <View className="px-4 pt-2">
            {/* Avatar + Name */}
            <View className="items-center mb-5">
              <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center mb-3 overflow-hidden">
                {user.image ? (
                  <Image source={{ uri: user.image }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                ) : (
                  <Text className="text-white text-3xl font-bold">{initials}</Text>
                )}
              </View>
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-bold mr-1.5">{user.name}</Text>
                {user.verified ? <BadgeCheck size={20} color="#4FC3F7" /> : null}
              </View>
              {user.headline ? (
                <Text className="text-gray-400 text-sm mt-1 text-center">{user.headline}</Text>
              ) : null}
              {user.city ? (
                <View className="flex-row items-center mt-1">
                  <MapPin size={13} color="#8E8E93" />
                  <Text className="text-gray-500 text-sm ml-1">
                    {user.city}{user.state ? `, ${user.state}` : null}
                  </Text>
                </View>
              ) : null}

              {/* Friend button — only for other users */}
              {!isOwnProfile ? (
                <FriendButton viewedUserId={id!} />
              ) : null}
            </View>

            {/* Stats */}
            <View className="flex-row bg-[#1C1C1E] rounded-2xl p-4 mb-5">
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text className="text-white font-bold text-lg ml-1">{user.avgRating?.toFixed(1) ?? "0.0"}</Text>
                </View>
                <Text className="text-gray-400 text-xs">Rating</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <Text className="text-white font-bold text-lg mb-1">{user.totalReviews ?? 0}</Text>
                <Text className="text-gray-400 text-xs">Reviews</Text>
              </View>
              <View className="w-px bg-[#2C2C2E]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Clock size={14} color="#8E8E93" />
                  <Text className="text-white font-bold text-lg ml-1">{user.responseRate ?? 0}%</Text>
                </View>
                <Text className="text-gray-400 text-xs">Response</Text>
              </View>
            </View>

            {/* Tab Switcher */}
            <View
              style={{
                backgroundColor: "#1C1C1E",
                borderRadius: 14,
                flexDirection: "row",
                padding: 4,
                marginBottom: 20,
              }}
              testID="profile-tab-switcher"
            >
              <Pressable
                testID="tab-about"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab("about");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: "center",
                  borderRadius: 11,
                  backgroundColor: activeTab === "about" ? "#FFFFFF" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: activeTab === "about" ? "#000000" : "#8E8E93",
                  }}
                >
                  About
                </Text>
              </Pressable>
              <Pressable
                testID="tab-reviews"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab("reviews");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: "center",
                  borderRadius: 11,
                  backgroundColor: activeTab === "reviews" ? "#FFFFFF" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: activeTab === "reviews" ? "#000000" : "#8E8E93",
                  }}
                >
                  {reviewCount > 0 ? `Reviews (${reviewCount})` : "Reviews"}
                </Text>
              </Pressable>
            </View>

            {/* About Tab Content */}
            {activeTab === "about" ? (
              <View testID="about-tab-content">
                {/* Bio */}
                {user.bio ? (
                  <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
                    <Text className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">About</Text>
                    <Text className="text-gray-200 text-sm leading-5">{user.bio}</Text>
                  </View>
                ) : null}

                {/* Social Links */}
                {socialLinks.length > 0 ? (
                  <View className="mb-4">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Follow</Text>
                    <View className="flex-row flex-wrap">
                      {socialLinks.map((link) => (
                        <PlatformButton key={link.label} {...link} />
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Content Series */}
                {(user.contentSeries?.length ?? 0) > 0 ? (
                  <View className="mb-4">
                    <View className="flex-row items-center mb-3">
                      <Play size={14} color="#E53935" />
                      <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider ml-1.5">Content Series</Text>
                    </View>
                    {user.contentSeries!.map((s: ContentSeries) => (
                      <Pressable
                        key={s.id}
                        testID={`series-card-${s.id}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/series/${s.id}` as any);
                        }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                        className="bg-[#1C1C1E] rounded-2xl p-4 mb-3"
                      >
                        <View className="flex-row items-start justify-between mb-1">
                          <Text className="text-white font-semibold text-base flex-1 mr-3" numberOfLines={2}>{s.title}</Text>
                          <View className="bg-[#E53935]/15 rounded-lg px-2.5 py-1">
                            <Text className="text-[#E53935] text-xs font-bold">
                              {s.price === 0 ? "Free" : `$${(s.price / 100).toLocaleString()}`}
                            </Text>
                          </View>
                        </View>
                        {s.description ? (
                          <Text className="text-gray-400 text-sm leading-5 mb-2" numberOfLines={2}>{s.description}</Text>
                        ) : null}
                        <View className="flex-row items-center">
                          <Video size={13} color="#8E8E93" />
                          <Text className="text-gray-500 text-xs ml-1.5">{durationLabel(s.durationMinutes)} per shoot</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {/* Examples Feed */}
                {(() => {
                  const allExamples: { series: ContentSeries; example: SeriesExample }[] = [];
                  for (const s of user.contentSeries ?? []) {
                    if (!s.examples) continue;
                    let parsed: SeriesExample[] = [];
                    try { parsed = JSON.parse(s.examples) as SeriesExample[]; } catch { continue; }
                    for (const ex of parsed) {
                      if (ex.url && ex.url.trim().length > 0) {
                        allExamples.push({ series: s, example: ex });
                      }
                    }
                  }
                  if (allExamples.length === 0) return null;
                  return (
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <Play size={14} color="#E53935" />
                        <Text style={{ color: "#8E8E93", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginLeft: 6 }}>
                          Examples
                        </Text>
                      </View>
                      {allExamples.map((item, idx) => {
                        if (item.example.type === "video") {
                          return (
                            <VideoExampleRow
                              key={`example-${item.series.id}-${idx}`}
                              example={item.example}
                              seriesTitle={item.series.title}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                Linking.openURL(item.example.url);
                              }}
                            />
                          );
                        }
                        // link type
                        return (
                          <Pressable
                            key={`example-${item.series.id}-${idx}`}
                            testID={`example-link-${idx}`}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              Linking.openURL(item.example.url);
                            }}
                            style={({ pressed }) => ({
                              backgroundColor: "#1C1C1E",
                              borderRadius: 14,
                              padding: 14,
                              marginBottom: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                              <ExternalLink size={20} color="#4FC3F7" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                                {item.example.label?.trim() || item.series.title}
                              </Text>
                              <Text style={{ color: "#636366", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                                {item.example.url}
                              </Text>
                            </View>
                            <ExternalLink size={16} color="#636366" style={{ marginLeft: 8 }} />
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Message Button */}
                {!isOwnProfile ? (
                  <Pressable
                    testID="message-user-button"
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleMessage(); }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? "#3a3a3c" : "#2C2C2E",
                      borderRadius: 16,
                      paddingVertical: 14,
                      paddingHorizontal: 24,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                      height: 52,
                    })}
                  >
                    <MessageSquare size={18} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>Message {user.name?.split(" ")[0]}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Reviews Tab Content */}
            {activeTab === "reviews" ? (
              <View testID="reviews-tab-content">
                {reviewsLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <ActivityIndicator size="large" color="#E53935" />
                  </View>
                ) : (reviewsData?.reviews?.length ?? 0) === 0 ? (
                  <View
                    testID="no-reviews-empty-state"
                    style={{
                      alignItems: "center",
                      paddingVertical: 52,
                      backgroundColor: "#1C1C1E",
                      borderRadius: 20,
                    }}
                  >
                    <Star size={40} color="#3A3A3C" strokeWidth={1.5} />
                    <Text style={{ color: "#636366", fontSize: 16, fontWeight: "600", marginTop: 14, marginBottom: 6 }}>
                      No reviews yet
                    </Text>
                    <Text style={{ color: "#48484A", fontSize: 14, textAlign: "center", paddingHorizontal: 32 }}>
                      Be the first to leave a review after working together.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {reviewsData!.reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Leave a Review button — shown on both tabs, only for other profiles */}
        {!isOwnProfile ? (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 12,
              paddingTop: 12,
              backgroundColor: "rgba(0,0,0,0.85)",
            }}
          >
            {reviewSubmitted ? (
              <View
                testID="review-submitted-confirmation"
                style={{
                  backgroundColor: "#1C3B1C",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Check size={18} color="#22c55e" />
                <Text style={{ color: "#22c55e", fontSize: 15, fontWeight: "700", marginLeft: 8 }}>Review submitted!</Text>
              </View>
            ) : (
              <Pressable
                testID="leave-review-button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowReviewModal(true);
                }}
                style={({ pressed }) => ({
                  backgroundColor: "#E53935",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Star size={18} color="#fff" fill="#fff" />
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginLeft: 8 }}>Leave a Review</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </SafeAreaView>

      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        revieweeId={id!}
        revieweeName={user.name ?? "Creator"}
        onSuccess={() => {
          setReviewSubmitted(true);
          setTimeout(() => setReviewSubmitted(false), 4000);
        }}
      />
    </View>
  );
}
