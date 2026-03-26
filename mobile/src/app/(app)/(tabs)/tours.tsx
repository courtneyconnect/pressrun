import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Switch,
  Image,
} from "react-native";
import { PressRunLoader } from "@/components/PressRunLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Bus, MapPin, Calendar as CalendarIcon, Navigation, Star, BadgeCheck } from "lucide-react-native";
import { format } from "date-fns";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import type { Tour, Availability, SavedTourStop, User } from "@/types";
import * as Haptics from "expo-haptics";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parsePressStopTypes(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function TourCard({ tour, onPress }: { tour: Tour; onPress: () => void }) {
  const pressStopTypes = parsePressStopTypes(tour.pressStopTypes);
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
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
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

      {pressStopTypes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: 8 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {pressStopTypes.slice(0, 4).map((type) => (
            <View key={type} style={{ backgroundColor: "#E5393520", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: "#E53935", fontSize: 11, fontWeight: "600" }}>{type}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </Pressable>
  );
}

function SavedStopCard({ stop }: { stop: SavedTourStop }) {
  const router = useRouter();
  const ps = stop.pressStop;
  const initials = (ps?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View
      testID={`saved-stop-card-${stop.id}`}
      style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" }}
    >
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
        testID={`book-saved-stop-${stop.id}`}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/press-stop/${ps?.id}` as any); }}
        style={{ backgroundColor: "#E53935", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Book</Text>
      </Pressable>
    </View>
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

function SavedTab({ tours }: { tours: Tour[] }) {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(tours[0]?.id ?? null);

  const activeTourId = selectedTourId ?? tours[0]?.id ?? null;

  const { data: savedStops, isLoading } = useQuery({
    queryKey: ["saved-stops", activeTourId],
    queryFn: () => activeTourId ? api.get<SavedTourStop[]>(`/api/tours/${activeTourId}/saved`) : Promise.resolve([]),
    enabled: !!activeTourId,
  });

  if (tours.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
        <MapPin size={44} color="#2C2C2E" />
        <Text style={{ color: "#555558", fontSize: 15, marginTop: 12 }}>No tours yet</Text>
        <Text style={{ color: "#3C3C3E", fontSize: 13, marginTop: 4 }}>Create a tour first to save press stops</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Tour selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {tours.map((t) => {
          const active = (selectedTourId ?? tours[0]?.id) === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`tour-pill-${t.id}`}
              onPress={() => { Haptics.selectionAsync(); setSelectedTourId(t.id); }}
              style={{
                backgroundColor: active ? "#E53935" : "#1C1C1E",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: active ? "#fff" : "#8E8E93", fontSize: 13, fontWeight: active ? "700" : "500" }}>
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Saved stops list */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {isLoading ? (
          <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <PressRunLoader size={80} />
          </View>
        ) : (savedStops ?? []).length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Star size={44} color="#2C2C2E" />
            <Text style={{ color: "#555558", fontSize: 15, marginTop: 12 }}>No saved stops yet</Text>
            <Text style={{ color: "#3C3C3E", fontSize: 13, marginTop: 4 }}>Open a tour to discover and save press stops</Text>
          </View>
        ) : (
          (savedStops ?? []).map((stop) => (
            <SavedStopCard key={stop.id} stop={stop} />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

export default function ToursScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const [talentSubTab, setTalentSubTab] = useState<"myTours" | "saved">("myTours");

  // Use profile data for role — session may not carry custom fields reliably
  const { data: me } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
    enabled: !!session,
  });

  const userRole = me?.role ?? (session?.user as any)?.role;
  const isTalent = userRole === "TALENT" || userRole === "CREATOR";

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
    <ErrorBoundary>
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4 pt-2 pb-3">
          <Text className="text-2xl font-bold text-white">
            {isTalent ? "My Tours" : "My Availability"}
          </Text>
        </View>

        {!isTalent ? (
          /* PressStop: Active Tours Discovery Banner */
          <Pressable
            testID="active-tours-banner"
            className="mx-4 mb-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-2xl px-4 py-3 flex-row items-center"
            onPress={() => router.push("/tour-discovery" as any)}
          >
            <View className="w-9 h-9 rounded-xl bg-[#E53935] items-center justify-center mr-3">
              <Navigation size={18} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">Active Tours Near You</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Browse talent looking for press stops</Text>
            </View>
            <Text className="text-[#E53935] text-sm font-bold ml-2">View</Text>
          </Pressable>
        ) : null}

        {isTalent ? (
          <View style={{ flex: 1 }}>
            {/* Sub-tabs */}
            <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: "#1C1C1E", borderRadius: 12, padding: 3 }}>
              <Pressable
                testID="subtab-my-tours"
                onPress={() => { Haptics.selectionAsync(); setTalentSubTab("myTours"); }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: talentSubTab === "myTours" ? "#E53935" : "transparent",
                }}
              >
                <Text style={{ color: talentSubTab === "myTours" ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: "600" }}>
                  My Tours
                </Text>
              </Pressable>
              <Pressable
                testID="subtab-saved"
                onPress={() => { Haptics.selectionAsync(); setTalentSubTab("saved"); }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: talentSubTab === "saved" ? "#E53935" : "transparent",
                }}
              >
                <Text style={{ color: talentSubTab === "saved" ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: "600" }}>
                  Saved
                </Text>
              </Pressable>
            </View>

            {talentSubTab === "myTours" ? (
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
                  <View testID="tours-loading" style={{ alignItems: 'center', paddingVertical: 80 }}>
                    <PressRunLoader size={80} />
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
                    <TourCard
                      key={tour.id}
                      tour={tour}
                      onPress={() => router.push(`/tour/${tour.id}` as any)}
                    />
                  ))
                )}
                <View className="h-24" />
              </ScrollView>
            ) : (
              <SavedTab tours={tours ?? []} />
            )}
          </View>
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
              <View testID="availability-loading" style={{ alignItems: 'center', paddingVertical: 80 }}>
                <PressRunLoader size={80} />
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
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/create-tour" as any); }}
          >
            <Bus size={26} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
    </ErrorBoundary>
  );
}
