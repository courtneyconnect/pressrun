import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Image,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Edit3,
  Star,
  MessageSquare,
  Clock,
  BadgeCheck,
  LogOut,
  Play,
  ExternalLink,
  Plus,
  Shield,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { authClient } from "@/lib/auth/auth-client";
import { useSession, useInvalidateSession } from "@/lib/auth/use-session";
import type { User, ContentSeries, SeriesExample } from "@/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 2) / 3); // 2px total gap between 3 columns

// ─── Platform info helper ─────────────────────────────────────────────────────
function getPlatformInfo(url: string): { name: string; color: string } {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return { name: "Instagram", color: "#E1306C" };
  if (u.includes("tiktok.com")) return { name: "TikTok", color: "#69C9D0" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { name: "YouTube", color: "#FF0000" };
  if (u.includes("twitter.com") || u.includes("x.com")) return { name: "X", color: "#1DA1F2" };
  if (u.includes("twitch.tv")) return { name: "Twitch", color: "#9146FF" };
  if (u.includes("kick.com")) return { name: "Kick", color: "#53FC18" };
  if (u.includes("whatnot.com")) return { name: "Whatnot", color: "#FF6726" };
  if (u.includes("linkedin.com")) return { name: "LinkedIn", color: "#0A66C2" };
  if (u.includes("drive.google.com")) return { name: "Drive", color: "#4285F4" };
  if (u.includes("vimeo.com")) return { name: "Vimeo", color: "#1AB7EA" };
  return { name: "Link", color: "#8E8E93" };
}

// ─── SVG-free platform icons using styled Text labels ─────────────────────────
function PlatformButton({
  label,
  color,
  url,
  testID,
}: {
  label: string;
  color: string;
  url: string;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => Linking.openURL(url)}
      className="flex-row items-center bg-[#2C2C2E] rounded-xl px-3 py-2 mr-2 mb-2"
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }}
      />
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

// ─── Grid cell component ──────────────────────────────────────────────────────
function GridCell({
  example,
  onPress,
  index,
}: {
  example: SeriesExample;
  onPress: () => void;
  index: number;
}) {
  const isVideo = example.type === "video";
  const platform = !isVideo ? getPlatformInfo(example.url) : null;
  const colIndex = index % 3;
  // 1px gap between cells: left cells get marginRight, right edge gets nothing
  const marginLeft = colIndex === 0 ? 0 : 1;

  if (isVideo) {
    return (
      <Pressable
        testID={`grid-cell-video-${index}`}
        onPress={onPress}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: "#1A1A1A",
          marginLeft,
          marginBottom: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        {example.label ? (
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 4, paddingHorizontal: 4, textAlign: "center" }} numberOfLines={1}>
            {example.label}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={`grid-cell-link-${index}`}
      onPress={onPress}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: platform?.color ? `${platform.color}22` : "#1A1A1A",
        marginLeft,
        marginBottom: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: platform?.color ?? "#8E8E93",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
      }}>
        <ExternalLink size={16} color="#FFFFFF" />
      </View>
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
        {platform?.name ?? "Link"}
      </Text>
      {example.label ? (
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 2, paddingHorizontal: 4, textAlign: "center" }} numberOfLines={1}>
          {example.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ─── Full-screen preview modal ────────────────────────────────────────────────
function PreviewModal({
  visible,
  example,
  onClose,
}: {
  visible: boolean;
  example: SeriesExample | null;
  onClose: () => void;
}) {
  if (!example) return null;
  const platform = example.type === "link" ? getPlatformInfo(example.url) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" }}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={{ backgroundColor: "#1C1C1E", borderRadius: 20, padding: 24, marginHorizontal: 32, alignItems: "center", width: SCREEN_WIDTH - 64 }}>
          {example.type === "video" ? (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Play size={28} color="#E53935" fill="#E53935" />
              </View>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
                {example.label || "Video Example"}
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 13, marginBottom: 20, textAlign: "center" }} numberOfLines={2}>
                {example.url}
              </Text>
              <Pressable
                onPress={() => { Linking.openURL(example.url); onClose(); }}
                style={{ backgroundColor: "#E53935", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Open Video</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: platform?.color ?? "#8E8E93", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <ExternalLink size={28} color="#fff" />
              </View>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
                {example.label || platform?.name || "Link"}
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 13, marginBottom: 20, textAlign: "center" }} numberOfLines={2}>
                {example.url}
              </Text>
              <Pressable
                onPress={() => { Linking.openURL(example.url); onClose(); }}
                style={{ backgroundColor: platform?.color ?? "#E53935", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Open on {platform?.name ?? "Browser"}</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: "#8E8E93", fontSize: 14 }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main profile screen ──────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();

  const { data: user, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
  });

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [previewExample, setPreviewExample] = useState<SeriesExample | null>(null);

  const signOut = useMutation({
    mutationFn: async () => { await authClient.signOut(); },
    onSuccess: () => { invalidateSession(); },
  });

  const initials = (user?.name ?? session?.user?.name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Build social link buttons from stored URLs
  const socialLinks: { label: string; color: string; url: string; testID: string }[] = [];
  if (user?.instagramHandle) {
    socialLinks.push({ label: "Instagram", color: "#E1306C", url: user.instagramHandle, testID: "social-instagram" });
  }
  if (user?.tiktokHandle) {
    socialLinks.push({ label: "TikTok", color: "#010101", url: user.tiktokHandle, testID: "social-tiktok" });
  }
  if (user?.youtubeHandle) {
    socialLinks.push({ label: "YouTube", color: "#FF0000", url: user.youtubeHandle, testID: "social-youtube" });
  }
  if (user?.twitterHandle) {
    socialLinks.push({ label: "X / Twitter", color: "#1DA1F2", url: user.twitterHandle, testID: "social-twitter" });
  }
  if (user?.twitchUrl) {
    socialLinks.push({ label: "Twitch", color: "#9146FF", url: user.twitchUrl, testID: "social-twitch" });
  }
  if (user?.kickUrl) {
    socialLinks.push({ label: "Kick", color: "#53FC18", url: user.kickUrl, testID: "social-kick" });
  }
  if (user?.whatnotUrl) {
    socialLinks.push({ label: "Whatnot", color: "#FF6726", url: user.whatnotUrl, testID: "social-whatnot" });
  }
  if (user?.linkedinUrl) {
    socialLinks.push({ label: "LinkedIn", color: "#0A66C2", url: user.linkedinUrl, testID: "social-linkedin" });
  }
  if (user?.websiteUrl) {
    socialLinks.push({ label: "Website", color: "#8E8E93", url: user.websiteUrl, testID: "social-website" });
  }

  const contentSeries: ContentSeries[] = user?.contentSeries ?? [];

  // Determine active series
  const activeSeries: ContentSeries | null =
    contentSeries.find((s) => s.id === selectedSeriesId) ??
    contentSeries[0] ??
    null;

  // Parse examples for selected series
  const examples: SeriesExample[] = activeSeries?.examples
    ? (() => { try { return JSON.parse(activeSeries.examples) as SeriesExample[]; } catch { return []; } })()
    : [];

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          testID="profile-screen"
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E53935" />
          }
        >
          {isLoading ? (
            <View testID="profile-loading" className="items-center py-20">
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : (
            <View>
              {/* ── Profile header ── */}
              <View className="px-4 pt-4">
                {/* Avatar + Name */}
                <View className="items-center mb-5">
                  {/* Avatar ring */}
                  <View style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    padding: 2.5,
                    backgroundColor: "#E53935",
                    marginBottom: 12,
                  }}>
                    <View style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 44,
                      backgroundColor: "#1C1C1E",
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {user?.image ? (
                        <Image source={{ uri: user.image }} style={{ width: "100%", height: "100%", borderRadius: 44 }} />
                      ) : (
                        <Text className="text-white text-3xl font-bold">{initials}</Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5, marginRight: 6 }}>
                      {user?.name ?? "Set up your profile"}
                    </Text>
                    {user?.verified ? <BadgeCheck size={22} color="#4FC3F7" /> : null}
                  </View>

                  {user?.headline ? (
                    <Text style={{ color: "#8E8E93", fontSize: 14, marginTop: 4, textAlign: "center" }}>
                      {user.headline}
                    </Text>
                  ) : null}

                  {user?.city ? (
                    <Text style={{ color: "#555558", fontSize: 13, marginTop: 3 }}>
                      {user.city}{user.state ? `, ${user.state}` : null}
                    </Text>
                  ) : null}
                </View>

                {/* Stats Row */}
                <View style={{
                  flexDirection: "row",
                  backgroundColor: "#111111",
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "#222",
                }}>
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center mb-1">
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginLeft: 4 }}>
                        {user?.avgRating?.toFixed(1) ?? "0.0"}
                      </Text>
                    </View>
                    <Text style={{ color: "#555558", fontSize: 11, fontWeight: "500" }}>Rating</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: "#222" }} />
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center mb-1">
                      <MessageSquare size={14} color="#8E8E93" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginLeft: 4 }}>
                        {user?.totalReviews ?? 0}
                      </Text>
                    </View>
                    <Text style={{ color: "#555558", fontSize: 11, fontWeight: "500" }}>Reviews</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: "#222" }} />
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center mb-1">
                      <Clock size={14} color="#8E8E93" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginLeft: 4 }}>
                        {user?.responseRate ?? 0}%
                      </Text>
                    </View>
                    <Text style={{ color: "#555558", fontSize: 11, fontWeight: "500" }}>Response</Text>
                  </View>
                </View>

                {/* Bio */}
                {user?.bio ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: "#EBEBF5CC", fontSize: 14, lineHeight: 21 }}>{user.bio}</Text>
                  </View>
                ) : null}

                {/* Social Links */}
                {socialLinks.length > 0 ? (
                  <View className="mb-4">
                    <View className="flex-row flex-wrap">
                      {socialLinks.map((link) => (
                        <PlatformButton key={link.testID} {...link} />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>

              {/* ── Divider ── */}
              <View style={{ height: 1, backgroundColor: "#1C1C1E", marginBottom: 0 }} />

              {/* ── Content Series Tabs ── */}
              {contentSeries.length > 0 ? (
                <>
                  <ScrollView
                    testID="series-tab-bar"
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0, backgroundColor: "#000" }}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
                  >
                    {contentSeries.map((s) => {
                      const isActive = (selectedSeriesId === s.id) || (selectedSeriesId === null && contentSeries[0]?.id === s.id);
                      return (
                        <Pressable
                          key={s.id}
                          testID={`series-tab-${s.id}`}
                          onPress={() => setSelectedSeriesId(s.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 20,
                            backgroundColor: isActive ? "#E53935" : "#1C1C1E",
                          }}
                        >
                          {s.coverImage ? (
                            <Image
                              source={{ uri: s.coverImage }}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                marginRight: 7,
                                borderWidth: 1,
                                borderColor: isActive ? "rgba(255,255,255,0.4)" : "#2C2C2E",
                              }}
                            />
                          ) : null}
                          <Text style={{
                            color: isActive ? "#fff" : "#8E8E93",
                            fontSize: 13,
                            fontWeight: isActive ? "700" : "500",
                          }}>
                            {s.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {/* Add + button */}
                    <Pressable
                      testID="add-series-tab-button"
                      onPress={() => router.push("/edit-profile" as any)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#1C1C1E",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={18} color="#8E8E93" />
                    </Pressable>
                  </ScrollView>

                  {/* ── Series info row ── */}
                  {activeSeries ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, backgroundColor: "#000" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <View style={{ backgroundColor: "#E53935", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                            {activeSeries.price === 0 ? "Free" : `$${(activeSeries.price / 100).toLocaleString()}`}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Clock size={11} color="#555558" />
                          <Text style={{ color: "#555558", fontSize: 11, marginLeft: 4 }}>
                            {activeSeries.durationMinutes < 60
                              ? `${activeSeries.durationMinutes}m`
                              : `${activeSeries.durationMinutes / 60}h`}
                          </Text>
                        </View>
                        {activeSeries.category ? (
                          <Text style={{ color: "#555558", fontSize: 11 }}>{activeSeries.category}</Text>
                        ) : null}
                        {activeSeries.postingTimeline ? (
                          <Text style={{ color: "#555558", fontSize: 11 }}>Posts in {activeSeries.postingTimeline}</Text>
                        ) : null}
                      </View>
                      {activeSeries.description ? (
                        <Text style={{ color: "#6E6E73", fontSize: 12, marginTop: 4, lineHeight: 17 }} numberOfLines={2}>
                          {activeSeries.description}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* ── Divider ── */}
                  <View style={{ height: 1, backgroundColor: "#1C1C1E" }} />

                  {/* ── Video/Link Grid ── */}
                  {examples.length > 0 ? (
                    <View
                      testID="series-grid"
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        backgroundColor: "#000",
                      }}
                    >
                      {examples.map((ex, idx) => (
                        <GridCell
                          key={idx}
                          example={ex}
                          index={idx}
                          onPress={() => setPreviewExample(ex)}
                        />
                      ))}
                    </View>
                  ) : (
                    <View testID="series-grid-empty" style={{ alignItems: "center", paddingVertical: 48, backgroundColor: "#000" }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#1C1C1E", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <Play size={24} color="#3C3C3E" />
                      </View>
                      <Text style={{ color: "#3C3C3E", fontSize: 15, fontWeight: "600" }}>No examples yet</Text>
                      <Text style={{ color: "#2C2C2E", fontSize: 13, marginTop: 4 }}>Add examples in Edit Profile</Text>
                    </View>
                  )}
                </>
              ) : (
                /* No series — prompt */
                <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 32 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#1C1C1E", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Play size={28} color="#3C3C3E" />
                  </View>
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6 }}>No Content Series</Text>
                  <Text style={{ color: "#555558", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
                    Add a content series so press stops can discover and book your work.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/edit-profile" as any)}
                    style={{ backgroundColor: "#E53935", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                  >
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Add Content Series</Text>
                  </Pressable>
                </View>
              )}

              {/* ── Actions ── */}
              <View className="px-4 pt-6">
                <Pressable
                  testID="edit-profile-button"
                  className="border border-[#E53935] rounded-xl py-3.5 items-center mb-3"
                  onPress={() => router.push("/edit-profile" as any)}
                >
                  <View className="flex-row items-center">
                    <Edit3 size={16} color="#E53935" />
                    <Text className="text-[#E53935] font-semibold text-sm ml-2">Edit Profile</Text>
                  </View>
                </Pressable>

                <Pressable
                  testID="manage-admins-button"
                  className="bg-[#1C1C1E] rounded-xl py-3.5 items-center mb-3"
                  onPress={() => router.push("/admin-assignments" as any)}
                >
                  <View className="flex-row items-center">
                    <Shield size={16} color="#8E8E93" />
                    <Text className="text-gray-400 font-medium text-sm ml-2">Manage Admins</Text>
                  </View>
                </Pressable>

                <Pressable
                  testID="sign-out-button"
                  className="bg-[#1C1C1E] rounded-xl py-3.5 items-center mb-8"
                  onPress={() => signOut.mutate()}
                  disabled={signOut.isPending}
                >
                  <View className="flex-row items-center">
                    <LogOut size={16} color="#8E8E93" />
                    <Text className="text-gray-400 font-medium text-sm ml-2">
                      {signOut.isPending ? "Signing out..." : "Sign Out"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>

      {/* Full-screen preview modal */}
      <PreviewModal
        visible={previewExample !== null}
        example={previewExample}
        onClose={() => setPreviewExample(null)}
      />
    </View>
  );
}
