import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, X, BadgeCheck, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api/api";

type UserSearchResult = {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  verified: boolean;
  avgRating: number | null;
  totalReviews: number;
  role: string;
};

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () =>
      api.get<UserSearchResult[]>(
        `/api/users/search?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.length >= 1,
  });

  const handleClear = () => {
    setInputValue("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  };

  const handleUserPress = (item: UserSearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${item.id}` as any);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleChip = (role: string) => {
    if (!role) return null;
    const lower = role.toLowerCase();
    if (lower === "talent") {
      return { label: "Talent", bg: "rgba(229,57,53,0.15)", color: "#E53935" };
    }
    if (lower === "press stop" || lower === "press_stop") {
      return { label: "Press Stop", bg: "rgba(79,195,247,0.15)", color: "#4FC3F7" };
    }
    return null;
  };

  const renderItem = ({ item }: { item: UserSearchResult }) => {
    const initials = getInitials(item.name ?? "?");
    const roleChip = getRoleChip(item.role);
    const subtitle = item.headline
      ? item.headline
      : item.city
      ? item.state
        ? `${item.city}, ${item.state}`
        : item.city
      : null;

    return (
      <Pressable
        testID={`user-result-${item.id}`}
        onPress={() => handleUserPress(item)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: pressed ? "#1C1C1E" : "transparent",
        })}
      >
        {/* Avatar */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#2C2C2E",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              {initials}
            </Text>
          )}
        </View>

        {/* Name + subtitle */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "700",
                marginRight: item.verified ? 4 : 0,
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.verified ? <BadgeCheck size={15} color="#4FC3F7" /> : null}
          </View>
          {subtitle ? (
            <Text
              style={{ color: "#8E8E93", fontSize: 13, marginTop: 2 }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Role chip */}
        {roleChip ? (
          <View
            style={{
              backgroundColor: roleChip.bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                color: roleChip.color,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {roleChip.label}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const showEmptyNoQuery = debouncedQuery.length === 0;
  const showEmptyNoResults =
    debouncedQuery.length >= 1 &&
    !isLoading &&
    (results?.length ?? 0) === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable
            testID="search-back-button"
            onPress={() => router.back()}
            style={{ padding: 4, marginRight: 12 }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
              flex: 1,
              textAlign: "center",
              marginRight: 40,
            }}
          >
            Search
          </Text>
        </View>

        {/* Search Input */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1C1C1E",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Search size={18} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              testID="search-input"
              style={{
                flex: 1,
                color: "#FFFFFF",
                fontSize: 16,
              }}
              placeholder="Search people..."
              placeholderTextColor="#636366"
              value={inputValue}
              onChangeText={setInputValue}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {inputValue.length > 0 ? (
              <Pressable
                testID="search-clear-button"
                onPress={handleClear}
                style={{ padding: 4, marginLeft: 4 }}
              >
                <X size={16} color="#8E8E93" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Separator */}
        <View style={{ height: 1, backgroundColor: "#1C1C1E", marginBottom: 4 }} />

        {/* Loading */}
        {isLoading && debouncedQuery.length >= 1 ? (
          <View
            testID="search-loading"
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : showEmptyNoQuery ? (
          /* Empty state — no query */
          <View
            testID="search-empty-state"
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#1C1C1E",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Users size={32} color="#3A3A3C" />
            </View>
            <Text
              style={{
                color: "#636366",
                fontSize: 15,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Search for creators, press stops, and talent
            </Text>
          </View>
        ) : showEmptyNoResults ? (
          /* Empty state — query but no results */
          <View
            testID="search-no-results"
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#1C1C1E",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Search size={32} color="#3A3A3C" />
            </View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              No users found
            </Text>
            <Text
              style={{
                color: "#636366",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              No users found for "{debouncedQuery}"
            </Text>
          </View>
        ) : (
          /* Results list */
          <FlatList
            testID="search-results-list"
            data={results ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: 1,
                  backgroundColor: "#1C1C1E",
                  marginLeft: 76,
                  marginRight: 16,
                }}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
