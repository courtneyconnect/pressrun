import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, Radio, ChevronRight } from "lucide-react-native";
import { api } from "@/lib/api/api";
import { useInvalidateSession } from "@/lib/auth/use-session";
import type {
  UserRole,
  TalentCategory,
  PressStopCategory,
} from "@/types";
import * as Haptics from "expo-haptics";

const TALENT_CATEGORIES: { label: string; value: TalentCategory }[] = [
  { label: "Creator", value: "CREATOR" },
  { label: "Artist", value: "ARTIST" },
  { label: "Influencer", value: "INFLUENCER" },
  { label: "Athlete", value: "ATHLETE" },
  { label: "Speaker", value: "SPEAKER" },
  { label: "Musician", value: "MUSICIAN" },
  { label: "Author", value: "AUTHOR" },
  { label: "Other", value: "OTHER" },
];

const PRESS_STOP_CATEGORIES: { label: string; value: PressStopCategory }[] = [
  { label: "Podcast", value: "PODCAST" },
  { label: "Brand", value: "BRAND" },
  { label: "Media Outlet", value: "MEDIA_OUTLET" },
  { label: "Retail Store", value: "RETAIL_STORE" },
  { label: "Event Space", value: "EVENT_SPACE" },
  { label: "Livestream Studio", value: "LIVESTREAM_STUDIO" },
  { label: "Creator", value: "CREATOR" },
  { label: "Other", value: "OTHER" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateSession = useInvalidateSession();
  const [step, setStep] = useState<number>(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const setupProfile = useMutation({
    mutationFn: async () => {
      // Set role
      await api.put("/api/users/me/role", { role });
      // Update profile
      await api.put("/api/users/me", {
        name: name.trim(),
        city: city.trim() || null,
        bio: bio.trim() || null,
        ...(role === "TALENT"
          ? { talentProfile: { category } }
          : { pressStopProfile: { category } }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      invalidateSession();
      router.replace("/(app)/(tabs)" as any);
    },
  });

  const categories =
    role === "TALENT" ? TALENT_CATEGORIES : PRESS_STOP_CATEGORIES;

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <ScrollView testID="onboarding-screen" className="flex-1 px-6">
          {/* Progress */}
          <View className="flex-row gap-2 mt-4 mb-8">
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? "bg-[#E53935]" : "bg-[#2C2C2E]"
                }`}
              />
            ))}
          </View>

          {/* Step 1: Role Selection */}
          {step === 1 ? (
            <View>
              <Text className="text-white text-3xl font-bold mb-2">
                Welcome to PressRun
              </Text>
              <Text className="text-gray-400 text-base mb-8">
                How will you use PressRun?
              </Text>

              <Pressable
                testID="role-talent-button"
                className={`bg-[#1C1C1E] rounded-2xl p-6 mb-4 border-2 ${
                  role === "TALENT" ? "border-[#E53935]" : "border-transparent"
                }`}
                onPress={() => { Haptics.selectionAsync(); setRole("TALENT"); }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-[#E53935]/20 items-center justify-center mr-4">
                    <Mic size={28} color="#E53935" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">
                      Creator
                    </Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      Book press stops for your tour
                    </Text>
                    <Text className="text-gray-600 text-xs mt-1">
                      You can always do both — this sets your primary profile
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#8E8E93" />
                </View>
              </Pressable>

              <Pressable
                testID="role-pressstop-button"
                className={`bg-[#1C1C1E] rounded-2xl p-6 mb-8 border-2 ${
                  role === "PRESS_STOP"
                    ? "border-[#E53935]"
                    : "border-transparent"
                }`}
                onPress={() => { Haptics.selectionAsync(); setRole("PRESS_STOP"); }}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-[#E53935]/20 items-center justify-center mr-4">
                    <Radio size={28} color="#E53935" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">
                      Press Stop
                    </Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      Host creators at your venue
                    </Text>
                    <Text className="text-gray-600 text-xs mt-1">
                      You can always do both — this sets your primary profile
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#8E8E93" />
                </View>
              </Pressable>

              <Pressable
                testID="next-step-1-button"
                className={`rounded-xl py-4 items-center ${
                  role ? "bg-[#E53935]" : "bg-[#E53935]/30"
                }`}
                onPress={() => { if (role) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(2); } }}
                disabled={!role}
              >
                <Text className="text-white font-semibold text-base">
                  Continue
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Step 2: Category Selection */}
          {step === 2 ? (
            <View>
              <Text className="text-white text-3xl font-bold mb-2">
                Your Category
              </Text>
              <Text className="text-gray-400 text-base mb-6">
                What best describes you?
              </Text>

              <View className="flex-row flex-wrap gap-3 mb-8">
                {categories.map((cat) => (
                  <Pressable
                    key={cat.value}
                    testID={`category-${cat.value.toLowerCase()}`}
                    className={`rounded-xl px-5 py-3 border ${
                      category === cat.value
                        ? "bg-[#E53935] border-[#E53935]"
                        : "bg-[#1C1C1E] border-[#2C2C2E]"
                    }`}
                    onPress={() => { Haptics.selectionAsync(); setCategory(cat.value); }}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        category === cat.value
                          ? "text-white"
                          : "text-gray-300"
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                testID="next-step-2-button"
                className={`rounded-xl py-4 items-center ${
                  category ? "bg-[#E53935]" : "bg-[#E53935]/30"
                }`}
                onPress={() => { if (category) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(3); } }}
                disabled={!category}
              >
                <Text className="text-white font-semibold text-base">
                  Continue
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Step 3: Basic Info */}
          {step === 3 ? (
            <View>
              <Text className="text-white text-3xl font-bold mb-2">
                About You
              </Text>
              <Text className="text-gray-400 text-base mb-6">
                Help people find and connect with you.
              </Text>

              <View className="mb-4">
                <Text className="text-gray-400 text-sm mb-2">Name</Text>
                <TextInput
                  testID="onboarding-name-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="Your name"
                  placeholderTextColor="#8E8E93"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-400 text-sm mb-2">City</Text>
                <TextInput
                  testID="onboarding-city-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="Where are you based?"
                  placeholderTextColor="#8E8E93"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-400 text-sm mb-2">Bio</Text>
                <TextInput
                  testID="onboarding-bio-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3 rounded-xl min-h-[100px]"
                  placeholder="Tell people about yourself..."
                  placeholderTextColor="#8E8E93"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                testID="get-started-button"
                className={`rounded-xl py-4 items-center mb-8 ${
                  setupProfile.isPending || !name.trim()
                    ? "bg-[#E53935]/40"
                    : "bg-[#E53935]"
                }`}
                onPress={handleSave}
                disabled={setupProfile.isPending || !name.trim()}
              >
                {setupProfile.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Get Started
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <View className="h-12" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  function handleSave() {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setupProfile.mutate();
  }
}
