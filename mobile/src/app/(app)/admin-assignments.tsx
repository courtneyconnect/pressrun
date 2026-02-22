import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, Users, Shield } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { AdminAssignment } from "@/types";
import * as Haptics from "expo-haptics";

function AdminCard({ assignment, role }: { assignment: AdminAssignment; role: "creator" | "admin" }) {
  // When role=creator, "I am the creator" so the other party is the admin (has email, no headline)
  // When role=admin, "I am the admin" so the other party is the creator (has headline, no email)
  const name = role === "creator"
    ? (assignment.admin?.name ?? "Unknown")
    : (assignment.creator?.name ?? "Unknown");
  const image = role === "creator"
    ? (assignment.admin?.image ?? null)
    : (assignment.creator?.image ?? null);
  const headline = role === "admin"
    ? (assignment.creator?.headline ?? null)
    : null;
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 12 }}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        ) : (
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{initials}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
          {name}
        </Text>
        {headline ? (
          <Text style={{ color: "#8E8E93", fontSize: 12, marginTop: 1 }} numberOfLines={1}>{headline}</Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <View style={{ backgroundColor: "#E5393520", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: "#E53935", fontSize: 11, fontWeight: "600" }}>{assignment.feePercent}% fee</Text>
          </View>
          {!assignment.active ? (
            <View style={{ backgroundColor: "#2C2C2E", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 }}>
              <Text style={{ color: "#8E8E93", fontSize: 11 }}>Inactive</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function AdminAssignmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAssignSheet, setShowAssignSheet] = useState<boolean>(false);
  const [inputUserId, setInputUserId] = useState<string>("");
  const [feePercent, setFeePercent] = useState<number>(10);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => api.get<{ asCreator: AdminAssignment[]; asAdmin: AdminAssignment[] }>("/api/admin-assignments"),
  });

  const assignAdmin = useMutation({
    mutationFn: (payload: { adminId: string; feePercent: number }) =>
      api.post("/api/admin-assignments", payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
      setShowAssignSheet(false);
      setInputUserId("");
      setFeePercent(10);
    },
  });

  const handleAssign = () => {
    if (!inputUserId.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    assignAdmin.mutate({ adminId: inputUserId.trim(), feePercent });
  };

  const asCreator = data?.asCreator ?? [];
  const asAdmin = data?.asAdmin ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1C1C1E" }}>
          <Pressable testID="back-button" onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }}>My Admins</Text>
          <Pressable
            testID="assign-admin-button"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAssignSheet(true); }}
            style={{ backgroundColor: "#E53935", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center" }}
          >
            <Plus size={14} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", marginLeft: 4 }}>Assign</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#E53935" />}>
            {/* As Creator section */}
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Shield size={16} color="#E53935" />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>Admins Managing Me</Text>
              </View>
              {asCreator.length === 0 ? (
                <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 }}>
                  <Users size={32} color="#2C2C2E" />
                  <Text style={{ color: "#555558", fontSize: 14, marginTop: 10 }}>No admins assigned yet</Text>
                  <Text style={{ color: "#3C3C3E", fontSize: 12, marginTop: 4 }}>Tap "Assign" to add an admin</Text>
                </View>
              ) : (
                asCreator.map((a) => (
                  <AdminCard key={a.id} assignment={a} role="creator" />
                ))
              )}
            </View>

            {/* As Admin section */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Shield size={16} color="#4FC3F7" />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>Creators I Manage</Text>
              </View>
              {asAdmin.length === 0 ? (
                <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 }}>
                  <Users size={32} color="#2C2C2E" />
                  <Text style={{ color: "#555558", fontSize: 14, marginTop: 10 }}>Not managing any creators</Text>
                </View>
              ) : (
                asAdmin.map((a) => (
                  <AdminCard key={a.id} assignment={a} role="admin" />
                ))
              )}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Assign Admin Sheet */}
      <Modal
        visible={showAssignSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={() => setShowAssignSheet(false)}
        />
        <View style={{ backgroundColor: "#1C1C1E", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }}>Assign Admin</Text>
            <Pressable onPress={() => setShowAssignSheet(false)} style={{ padding: 4 }}>
              <X size={20} color="#8E8E93" />
            </Pressable>
          </View>

          <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>USER ID OR EMAIL</Text>
          <TextInput
            testID="admin-user-id-input"
            style={{ backgroundColor: "#2C2C2E", color: "#fff", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, marginBottom: 20 }}
            placeholder="Enter user ID or email"
            placeholderTextColor="#555558"
            value={inputUserId}
            onChangeText={setInputUserId}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
            PLATFORM FEE: {feePercent}%
          </Text>
          {/* Fee selector buttons */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {[2, 5, 8, 10, 12, 15, 18, 20].map((pct) => (
              <Pressable
                key={pct}
                testID={`fee-${pct}`}
                onPress={() => { Haptics.selectionAsync(); setFeePercent(pct); }}
                style={{
                  backgroundColor: feePercent === pct ? "#E53935" : "#2C2C2E",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: feePercent === pct ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: "600" }}>
                  {pct}%
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            testID="confirm-assign-button"
            onPress={handleAssign}
            disabled={assignAdmin.isPending || !inputUserId.trim()}
            style={{
              backgroundColor: assignAdmin.isPending || !inputUserId.trim() ? "#E5393550" : "#E53935",
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: "center",
            }}
          >
            {assignAdmin.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Assign Admin</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
