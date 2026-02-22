import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Bookmark,
  BadgeCheck,
  Star,
  Clock,
} from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import type { Tour, SavedTourStop, SeriesDiscoverResult } from "@/types";
import * as Haptics from "expo-haptics";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  DRAFT: "#eab308",
  COMPLETED: "#6b7280",
  CANCELLED: "#ef4444",
};

function TypeChip({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: "#E5393520", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: "#E53935", fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function SavedStopCard({ stop, onBook }: { stop: SavedTourStop; onBook: () => void }) {
  const ps = stop.pressStop;
  const initials = (ps?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 12 }}>
        {ps?.image ? (
          <Image source={{ uri: ps.image }} style={{ width: 46, height: 46, borderRadius: 23 }} />
        ) : (
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>{initials}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginRight: 4 }} numberOfLines={1}>
            {ps?.name ?? "Unknown"}
          </Text>
          {ps?.verified ? <BadgeCheck size={13} color="#4FC3F7" /> : null}
        </View>
        {ps?.headline ? (
          <Text style={{ color: "#8E8E93", fontSize: 12, marginTop: 1 }} numberOfLines={1}>{ps.headline}</Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, gap: 8 }}>
          {ps?.city ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin size={10} color="#555558" />
              <Text style={{ color: "#555558", fontSize: 11, marginLeft: 3 }}>{ps.city}</Text>
            </View>
          ) : null}
          {ps?.avgRating ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Star size={10} color="#FFD700" fill="#FFD700" />
              <Text style={{ color: "#555558", fontSize: 11, marginLeft: 3 }}>{ps.avgRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Pressable
        testID={`book-now-${stop.id}`}
        onPress={onBook}
        style={{ backgroundColor: "#E53935", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Book Now</Text>
      </Pressable>
    </View>
  );
}

function FeedCard({
  item,
  tourId,
  onSaved,
}: {
  item: SeriesDiscoverResult;
  tourId: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { series, creator } = item;
  const initials = (creator.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const priceLabel = series.price === 0 ? "Free" : `$${(series.price / 100).toLocaleString()}`;
  const durationLabel = series.durationMinutes < 60 ? `${series.durationMinutes}m` : `${series.durationMinutes / 60}h`;

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/api/tours/${tourId}/save`, { pressStopUserId: creator.id }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["saved-stops", tourId] });
      onSaved();
    },
  });

  return (
    <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
      {series.coverImage ? (
        <Image source={{ uri: series.coverImage }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
      ) : (
        <View style={{ width: "100%", height: 100, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" }}>
          <Clock size={32} color="#3C3C3E" />
        </View>
      )}
      {/* Save bookmark */}
      <Pressable
        testID={`save-to-tour-${series.id}`}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveMutation.mutate(); }}
        disabled={saveMutation.isPending}
        style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 8 }}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color="#E53935" />
        ) : (
          <Bookmark size={18} color={saveMutation.isSuccess ? "#E53935" : "#fff"} fill={saveMutation.isSuccess ? "#E53935" : "transparent"} />
        )}
      </Pressable>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 8 }}>
            {creator.image ? (
              <Image source={{ uri: creator.image }} style={{ width: 26, height: 26, borderRadius: 13 }} />
            ) : (
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{initials}</Text>
            )}
          </View>
          <Text style={{ color: "#8E8E93", fontSize: 12, flex: 1 }} numberOfLines={1}>{creator.name}</Text>
          {creator.verified ? <BadgeCheck size={12} color="#4FC3F7" /> : null}
        </View>
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 4 }} numberOfLines={2}>{series.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#8E8E93", fontSize: 12 }}>{durationLabel}</Text>
            {series.category ? (
              <View style={{ backgroundColor: "#E5393520", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: "#E53935", fontSize: 11, fontWeight: "600" }}>{series.category}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{priceLabel}</Text>
            <Pressable
              onPress={() => router.push(`/series/${series.id}` as any)}
              style={{ backgroundColor: "#E53935", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>View</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TourDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"feed" | "saved">("feed");

  const { data: tour, isLoading: tourLoading } = useQuery({
    queryKey: ["tour", id],
    queryFn: () => api.get<Tour>(`/api/tours/${id}`),
    enabled: !!id,
  });

  const firstCity = tour?.stops?.[0]?.city ?? "";
  const rawTypes = tour?.pressStopTypes;
  const pressStopTypes: string[] = Array.isArray(rawTypes)
    ? rawTypes
    : rawTypes
      ? (() => { try { return JSON.parse(rawTypes) as string[]; } catch { return []; } })()
      : [];
  const firstType = pressStopTypes[0] ?? "";

  const { data: feedItems, isLoading: feedLoading } = useQuery({
    queryKey: ["tour-feed", id, firstCity, firstType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (firstCity) params.set("city", firstCity);
      if (firstType) params.set("type", firstType);
      return api.get<SeriesDiscoverResult[]>(`/api/series-discover?${params.toString()}`);
    },
    enabled: !!tour,
  });

  const { data: savedStops, isLoading: savedLoading, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-stops", id],
    queryFn: () => api.get<SavedTourStop[]>(`/api/tours/${id}/saved`),
    enabled: !!id,
  });

  if (tourLoading || !tour) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[tour.status] ?? "#6b7280";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable testID="back-button" onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }} numberOfLines={1}>
            {tour.name}
          </Text>
          <View style={{ backgroundColor: statusColor + "30", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>{tour.status}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Dates */}
          {tour.startDate ? (
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
              <Calendar size={14} color="#8E8E93" />
              <Text style={{ color: "#8E8E93", fontSize: 13, marginLeft: 6 }}>
                {format(new Date(tour.startDate), "MMM d, yyyy")}
                {tour.endDate ? ` — ${format(new Date(tour.endDate), "MMM d, yyyy")}` : null}
              </Text>
            </View>
          ) : null}

          {/* Press Stop Types */}
          {pressStopTypes.length > 0 ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: "#555558", fontSize: 11, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" }}>Looking For</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {pressStopTypes.map((type) => (
                  <TypeChip key={type} label={type} />
                ))}
              </View>
            </View>
          ) : null}

          {/* City Stops */}
          {(tour.stops?.length ?? 0) > 0 ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: "#555558", fontSize: 11, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" }}>
                Cities ({tour.stops!.length})
              </Text>
              {tour.stops!.map((stop, i) => (
                <View key={stop.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1C1C1E", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5393520", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Text style={{ color: "#E53935", fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                      {stop.city}{stop.state ? `, ${stop.state}` : null}
                    </Text>
                    <Text style={{ color: "#555558", fontSize: 12, marginTop: 2 }}>
                      {stop.arrivalDate} – {stop.departureDate}
                    </Text>
                  </View>
                  <MapPin size={14} color="#555558" />
                </View>
              ))}
            </View>
          ) : null}

          {/* Tab switcher */}
          <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 16, backgroundColor: "#1C1C1E", borderRadius: 12, padding: 3 }}>
            <Pressable
              testID="tab-feed"
              onPress={() => { Haptics.selectionAsync(); setActiveTab("feed"); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: activeTab === "feed" ? "#E53935" : "transparent" }}
            >
              <Text style={{ color: activeTab === "feed" ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: "600" }}>Curated Feed</Text>
            </Pressable>
            <Pressable
              testID="tab-saved"
              onPress={() => { Haptics.selectionAsync(); setActiveTab("saved"); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: activeTab === "saved" ? "#E53935" : "transparent" }}
            >
              <Text style={{ color: activeTab === "saved" ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: "600" }}>
                Saved {(savedStops?.length ?? 0) > 0 ? `(${savedStops!.length})` : null}
              </Text>
            </Pressable>
          </View>

          {/* Tab content */}
          <View style={{ paddingHorizontal: 16 }}>
            {activeTab === "feed" ? (
              feedLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#E53935" />
                </View>
              ) : (feedItems ?? []).length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Clock size={44} color="#2C2C2E" />
                  <Text style={{ color: "#555558", fontSize: 15, marginTop: 12 }}>No matches yet</Text>
                  <Text style={{ color: "#3C3C3E", fontSize: 13, marginTop: 4 }}>Add cities and types to see curated press stops</Text>
                </View>
              ) : (
                (feedItems ?? []).map((item) => (
                  <FeedCard
                    key={item.series.id}
                    item={item}
                    tourId={id!}
                    onSaved={() => refetchSaved()}
                  />
                ))
              )
            ) : (
              savedLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#E53935" />
                </View>
              ) : (savedStops ?? []).length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Bookmark size={44} color="#2C2C2E" />
                  <Text style={{ color: "#555558", fontSize: 15, marginTop: 12 }}>No saved stops</Text>
                  <Text style={{ color: "#3C3C3E", fontSize: 13, marginTop: 4 }}>Browse the feed and bookmark press stops</Text>
                </View>
              ) : (
                (savedStops ?? []).map((stop) => (
                  <SavedStopCard
                    key={stop.id}
                    stop={stop}
                    onBook={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/press-stop/${stop.pressStop?.id}` as any); }}
                  />
                ))
              )
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
