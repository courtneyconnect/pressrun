import React, { useState, useEffect } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { User } from "@/types";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
  });

  const [name, setName] = useState<string>("");
  const [headline, setHeadline] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [instagramHandle, setInstagramHandle] = useState<string>("");
  const [tiktokHandle, setTiktokHandle] = useState<string>("");
  const [youtubeHandle, setYoutubeHandle] = useState<string>("");
  const [twitterHandle, setTwitterHandle] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setHeadline(user.headline ?? "");
      setBio(user.bio ?? "");
      setCity(user.city ?? "");
      setState(user.state ?? "");
      setCountry(user.country ?? "");
      setInstagramHandle(user.instagramHandle ?? "");
      setTiktokHandle(user.tiktokHandle ?? "");
      setYoutubeHandle(user.youtubeHandle ?? "");
      setTwitterHandle(user.twitterHandle ?? "");
      setWebsiteUrl(user.websiteUrl ?? "");
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data: Partial<User>) =>
      api.put<User>("/api/users/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim(),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
      instagramHandle: instagramHandle.trim() || null,
      tiktokHandle: tiktokHandle.trim() || null,
      youtubeHandle: youtubeHandle.trim() || null,
      twitterHandle: twitterHandle.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
    });
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    testId: string,
    options?: { multiline?: boolean; placeholder?: string }
  ) => (
    <View className="mb-4">
      <Text className="text-gray-400 text-sm mb-2">{label}</Text>
      <TextInput
        testID={testId}
        className={`bg-[#1C1C1E] text-white text-base px-4 rounded-xl ${
          options?.multiline ? "py-3 min-h-[100px]" : "py-3.5"
        }`}
        placeholder={options?.placeholder ?? label}
        placeholderTextColor="#8E8E93"
        value={value}
        onChangeText={onChangeText}
        multiline={options?.multiline}
        textAlignVertical={options?.multiline ? "top" : "center"}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable testID="back-button" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg">Edit Profile</Text>
          <View className="w-6" />
        </View>

        {isLoading ? (
          <View testID="edit-profile-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView testID="edit-profile-form" className="flex-1 px-4">
            {renderInput("Name", name, setName, "name-input")}
            {renderInput("Headline", headline, setHeadline, "headline-input", {
              placeholder: "What do you do?",
            })}
            {renderInput("Bio", bio, setBio, "bio-input", {
              multiline: true,
              placeholder: "Tell people about yourself...",
            })}

            {/* Location */}
            <Text className="text-gray-400 text-xs font-medium mb-3 mt-2 uppercase">
              Location
            </Text>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <TextInput
                  testID="city-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="City"
                  placeholderTextColor="#8E8E93"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View className="w-24">
                <TextInput
                  testID="state-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="State"
                  placeholderTextColor="#8E8E93"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>
            {renderInput("Country", country, setCountry, "country-input")}

            {/* Social Links */}
            <Text className="text-gray-400 text-xs font-medium mb-3 mt-2 uppercase">
              Social Links
            </Text>
            {renderInput(
              "Instagram",
              instagramHandle,
              setInstagramHandle,
              "instagram-input",
              { placeholder: "@handle" }
            )}
            {renderInput(
              "TikTok",
              tiktokHandle,
              setTiktokHandle,
              "tiktok-input",
              { placeholder: "@handle" }
            )}
            {renderInput(
              "YouTube",
              youtubeHandle,
              setYoutubeHandle,
              "youtube-input",
              { placeholder: "@channel" }
            )}
            {renderInput(
              "Twitter / X",
              twitterHandle,
              setTwitterHandle,
              "twitter-input",
              { placeholder: "@handle" }
            )}
            {renderInput(
              "Website",
              websiteUrl,
              setWebsiteUrl,
              "website-input",
              { placeholder: "https://" }
            )}

            {/* Save Button */}
            <Pressable
              testID="save-profile-button"
              className={`rounded-xl py-4 items-center mt-2 mb-8 ${
                updateProfile.isPending ? "bg-[#E53935]/60" : "bg-[#E53935]"
              }`}
              onPress={handleSave}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Save Changes
                </Text>
              )}
            </Pressable>

            <View className="h-12" />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
