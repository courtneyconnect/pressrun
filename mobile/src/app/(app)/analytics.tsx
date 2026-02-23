import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  BarChart2,
  Lock,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { PressRunLoader } from "@/components/PressRunLoader";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RecentBooking {
  id: string;
  status: string;
  agreedFee: number;
  platformFee: number;
  type: string;
  date: string;
  pressStop: {
    id: string;
    name: string;
    image: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

interface AnalyticsData {
  totalRevenueCents: number;
  pendingRevenueCents: number;
  totalPressStopsBooked: number;
  totalBookings: number;
  completedBookings: number;
  totalContentMinutes: number;
  statusCounts: Record<string, number>;
  recentBookings: RecentBooking[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED": return "#22c55e";
    case "ACCEPTED": return "#3b82f6";
    case "PENDING": return "#f59e0b";
    case "CANCELLED": return "#E53935";
    case "REJECTED": return "#E53935";
    default: return "#8E8E93";
  }
}

function getStatusBg(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED": return "#22c55e18";
    case "ACCEPTED": return "#3b82f618";
    case "PENDING": return "#f59e0b18";
    case "CANCELLED": return "#E5393518";
    case "REJECTED": return "#E5393518";
    default: return "#8E8E9318";
  }
}

function getStatusLabel(status: string): string {
  const s = status.toUpperCase();
  switch (s) {
    case "COMPLETED": return "Completed";
    case "ACCEPTED": return "Accepted";
    case "PENDING": return "Pending";
    case "CANCELLED": return "Cancelled";
    case "REJECTED": return "Rejected";
    default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: "#555558",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function RevenueCard({
  label,
  value,
  labelColor,
  icon,
  testID,
}: {
  label: string;
  value: string;
  labelColor: string;
  icon: React.ReactNode;
  testID: string;
}) {
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: "#1C1C1E",
        borderRadius: 18,
        padding: 18,
        marginHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: "#2C2C2E",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "800",
          letterSpacing: -0.5,
          marginBottom: 4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={{ color: labelColor, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function StatTile({
  label,
  value,
  icon,
  testID,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  testID: string;
}) {
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: "#1C1C1E",
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        marginHorizontal: 3,
      }}
    >
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text
        style={{
          color: "#fff",
          fontSize: 20,
          fontWeight: "800",
          letterSpacing: -0.3,
          marginBottom: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          color: "#555558",
          fontSize: 10,
          fontWeight: "600",
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<AnalyticsData>("/api/analytics/me"),
  });

  const hasBookings = (data?.totalBookings ?? 0) > 0;

  // Compute status counts for display (only non-zero)
  const statusEntries: [string, number][] = data
    ? Object.entries(data.statusCounts).filter(([, count]) => count > 0)
    : [];

  // Compute max count for bar width scaling
  const maxStatusCount =
    statusEntries.length > 0
      ? Math.max(...statusEntries.map(([, c]) => c))
      : 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <Pressable
            testID="analytics-back-button"
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#1C1C1E",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.4,
              }}
            >
              My Analytics
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Lock size={10} color="#555558" />
              <Text style={{ color: "#555558", fontSize: 12, marginLeft: 4 }}>
                Private · Only visible to you
              </Text>
            </View>
          </View>

          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "#E5393518",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart2 size={20} color="#E53935" />
          </View>
        </View>

        {/* ── Content ── */}
        {isLoading ? (
          <View
            testID="analytics-loading"
            style={{ flex: 1, backgroundColor: '#000', alignItems: "center", justifyContent: "center" }}
          >
            <PressRunLoader size={80} />
          </View>
        ) : isError ? (
          <View
            testID="analytics-error"
            style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#E5393518",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <BarChart2 size={28} color="#E53935" />
            </View>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 8 }}>
              Could not load analytics
            </Text>
            <Text
              style={{
                color: "#555558",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Please try again later.
            </Text>
          </View>
        ) : (
          <ScrollView
            testID="analytics-screen"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
          >
            {/* ── Revenue Section ── */}
            <View style={{ marginBottom: 24 }}>
              <SectionLabel>Revenue</SectionLabel>
              <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
                <RevenueCard
                  testID="analytics-total-earned"
                  label="Total Earned"
                  value={formatCurrency(data?.totalRevenueCents ?? 0)}
                  labelColor="#22c55e"
                  icon={<DollarSign size={18} color="#22c55e" />}
                />
                <RevenueCard
                  testID="analytics-pending"
                  label="Pending"
                  value={formatCurrency(data?.pendingRevenueCents ?? 0)}
                  labelColor="#f59e0b"
                  icon={<TrendingUp size={18} color="#f59e0b" />}
                />
              </View>
            </View>

            {/* ── Stats Row ── */}
            <View style={{ marginBottom: 24 }}>
              <SectionLabel>Overview</SectionLabel>
              <View style={{ flexDirection: "row", marginHorizontal: -3 }}>
                <StatTile
                  testID="analytics-press-stops"
                  label="Press Stops Booked"
                  value={String(data?.totalPressStopsBooked ?? 0)}
                  icon={<MapPin size={18} color="#E53935" />}
                />
                <StatTile
                  testID="analytics-total-bookings"
                  label="Total Bookings"
                  value={String(data?.totalBookings ?? 0)}
                  icon={<BarChart2 size={18} color="#3b82f6" />}
                />
                <StatTile
                  testID="analytics-content-hours"
                  label="Content Hours"
                  value={`${((data?.totalContentMinutes ?? 0) / 60).toFixed(1)}h`}
                  icon={<Clock size={18} color="#a855f7" />}
                />
              </View>
            </View>

            {/* ── Booking Status Breakdown ── */}
            {statusEntries.length > 0 ? (
              <View style={{ marginBottom: 24 }}>
                <SectionLabel>Booking Breakdown</SectionLabel>
                <View
                  style={{
                    backgroundColor: "#1C1C1E",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  {statusEntries.map(([status, count], index) => {
                    const color = getStatusColor(status);
                    const barWidth = (count / maxStatusCount) * 100;
                    return (
                      <View
                        key={status}
                        testID={`analytics-status-${status.toLowerCase()}`}
                        style={{
                          marginBottom: index < statusEntries.length - 1 ? 14 : 0,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: getStatusBg(status),
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              marginRight: "auto",
                            }}
                          >
                            <Text
                              style={{
                                color,
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              {getStatusLabel(status)}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 14,
                              fontWeight: "700",
                            }}
                          >
                            {count}
                          </Text>
                        </View>
                        {/* Bar */}
                        <View
                          style={{
                            height: 6,
                            backgroundColor: "#2C2C2E",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              height: "100%",
                              width: `${barWidth}%`,
                              backgroundColor: color,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* ── Recent Bookings ── */}
            <View style={{ marginBottom: 16 }}>
              <SectionLabel>Recent Bookings</SectionLabel>

              {!hasBookings || (data?.recentBookings ?? []).length === 0 ? (
                <View
                  testID="analytics-empty-state"
                  style={{
                    backgroundColor: "#1C1C1E",
                    borderRadius: 18,
                    padding: 32,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "#2C2C2E",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <BarChart2 size={26} color="#3C3C3E" />
                  </View>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "700",
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    No bookings yet
                  </Text>
                  <Text
                    style={{
                      color: "#555558",
                      fontSize: 13,
                      textAlign: "center",
                      lineHeight: 19,
                    }}
                  >
                    Start booking press stops to see your analytics here.
                  </Text>
                </View>
              ) : (
                <View
                  testID="analytics-recent-bookings"
                  style={{
                    backgroundColor: "#1C1C1E",
                    borderRadius: 18,
                    overflow: "hidden",
                  }}
                >
                  {(data?.recentBookings ?? []).slice(0, 5).map((booking, index) => {
                    const statusColor = getStatusColor(booking.status);
                    const statusBg = getStatusBg(booking.status);
                    const isLast = index === Math.min((data?.recentBookings ?? []).length, 5) - 1;
                    const initials = (booking.pressStop?.name ?? "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <View
                        key={booking.id}
                        testID={`analytics-booking-${booking.id}`}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 14,
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: "#2C2C2E",
                        }}
                      >
                        {/* Avatar */}
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            backgroundColor: "#2C2C2E",
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          {booking.pressStop?.image ? (
                            <Image
                              source={{ uri: booking.pressStop.image }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text
                              style={{
                                color: "#8E8E93",
                                fontSize: 14,
                                fontWeight: "700",
                              }}
                            >
                              {initials}
                            </Text>
                          )}
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 14,
                              fontWeight: "700",
                              marginBottom: 2,
                            }}
                            numberOfLines={1}
                          >
                            {booking.pressStop?.name ?? "Press Stop"}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            {booking.pressStop?.city ? (
                              <Text
                                style={{
                                  color: "#555558",
                                  fontSize: 12,
                                  marginRight: 6,
                                }}
                                numberOfLines={1}
                              >
                                {booking.pressStop.city}
                                {booking.pressStop.state ? `, ${booking.pressStop.state}` : null}
                              </Text>
                            ) : null}
                            <Text style={{ color: "#3C3C3E", fontSize: 12 }}>
                              {formatDate(booking.date)}
                            </Text>
                          </View>
                        </View>

                        {/* Right: fee + status */}
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 14,
                              fontWeight: "800",
                              marginBottom: 4,
                            }}
                          >
                            {formatCurrency(booking.agreedFee)}
                          </Text>
                          <View
                            style={{
                              backgroundColor: statusBg,
                              borderRadius: 6,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                            }}
                          >
                            <Text
                              style={{
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: "700",
                              }}
                            >
                              {getStatusLabel(booking.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
