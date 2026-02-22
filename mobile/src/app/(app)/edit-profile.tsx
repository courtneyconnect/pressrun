import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, User } from "lucide-react-native";
import { api } from "@/lib/api/api";
import { uploadFile } from "@/lib/upload";
import { pickImage, takePhoto } from "@/lib/file-picker";
import type { User as UserType } from "@/types";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserType>("/api/users/me"),
  });

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
      setImageUri(user.image ?? null);
    }
  }, [user]);

  const handleChangePhoto = () => {
    Alert.alert("Profile Photo", "Choose a photo", [
      {
        text: "Choose from Library",
        onPress: async () => {
          const file = await pickImage();
          if (!file) return;
          setIsUploadingPhoto(true);
          try {
            const result = await uploadFile(file.uri, file.filename, file.mimeType);
            setImageUri(result.url);
          } catch {
            Alert.alert("Error", "Failed to upload photo. Please try again.");
          } finally {
            setIsUploadingPhoto(false);
          }
        },
      },
      {
        text: "Take Photo",
        onPress: async () => {
          const file = await takePhoto();
          if (!file) return;
          setIsUploadingPhoto(true);
          try {
            const result = await uploadFile(file.uri, file.filename, file.mimeType);
            setImageUri(result.url);
          } catch {
            Alert.alert("Error", "Failed to upload photo. Please try again.");
          } finally {
            setIsUploadingPhoto(false);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const updateProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put<UserType>("/api/users/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    onError: () => {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim() || undefined,
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
      image: imageUri || null,
    });
  };

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    testId: string,
    options?: { multiline?: boolean; placeholder?: string }
  ) => (
    <View className="mb-4">
      <Text className="text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        {label}
      </Text>
      <TextInput
        testID={testId}
        className={`bg-[#1C1C1E] text-white text-base px-4 rounded-xl ${
          options?.multiline ? "py-3 min-h-[100px]" : "py-3.5"
        }`}
        placeholder={options?.placeholder ?? label}
        placeholderTextColor="#555558"
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
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#1C1C1E]">
          <Pressable testID="back-button" onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg">Edit Profile</Text>
          <Pressable
            testID="save-header-button"
            onPress={handleSave}
            disabled={updateProfile.isPending || isUploadingPhoto}
          >
            <Text
              className={`font-semibold text-base ${
                updateProfile.isPending || isUploadingPhoto
                  ? "text-[#E53935]/40"
                  : "text-[#E53935]"
              }`}
            >
              Save
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View testID="edit-profile-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView
            testID="edit-profile-form"
            className="flex-1 px-4"
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <View className="items-center py-6">
              <Pressable
                testID="change-photo-button"
                onPress={handleChangePhoto}
                disabled={isUploadingPhoto}
                className="relative"
              >
                <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center overflow-hidden">
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="large" color="#E53935" />
                  ) : imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: 96, height: 96, borderRadius: 48 }}
                    />
                  ) : (
                    <Text className="text-white text-3xl font-bold">{initials}</Text>
                  )}
                </View>
                {/* Camera badge */}
                {!isUploadingPhoto && (
                  <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E53935] items-center justify-center border-2 border-black">
                    <Camera size={14} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
              <Text className="text-gray-400 text-sm mt-2">
                {isUploadingPhoto ? "Uploading..." : "Tap to change photo"}
              </Text>
            </View>

            {/* Basic Info */}
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              Basic Info
            </Text>
            {renderInput("Name", name, setName, "name-input")}
            {renderInput("Headline", headline, setHeadline, "headline-input", {
              placeholder: "What do you do?",
            })}
            {renderInput("Bio", bio, setBio, "bio-input", {
              multiline: true,
              placeholder: "Tell people about yourself...",
            })}

            {/* Location */}
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 mt-2">
              Location
            </Text>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  City
                </Text>
                <TextInput
                  testID="city-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="City"
                  placeholderTextColor="#555558"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View className="w-24">
                <Text className="text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  State
                </Text>
                <TextInput
                  testID="state-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="State"
                  placeholderTextColor="#555558"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>
            {renderInput("Country", country, setCountry, "country-input")}

            {/* Social */}
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 mt-2">
              Social Links
            </Text>
            {renderInput("Instagram", instagramHandle, setInstagramHandle, "instagram-input", {
              placeholder: "@handle",
            })}
            {renderInput("TikTok", tiktokHandle, setTiktokHandle, "tiktok-input", {
              placeholder: "@handle",
            })}
            {renderInput("YouTube", youtubeHandle, setYoutubeHandle, "youtube-input", {
              placeholder: "@channel",
            })}
            {renderInput("Twitter / X", twitterHandle, setTwitterHandle, "twitter-input", {
              placeholder: "@handle",
            })}
            {renderInput("Website", websiteUrl, setWebsiteUrl, "website-input", {
              placeholder: "https://",
            })}

            {/* Save Button */}
            <Pressable
              testID="save-profile-button"
              className={`rounded-xl py-4 items-center mt-4 mb-10 ${
                updateProfile.isPending || isUploadingPhoto
                  ? "bg-[#E53935]/50"
                  : "bg-[#E53935]"
              }`}
              onPress={handleSave}
              disabled={updateProfile.isPending || isUploadingPhoto}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">Save Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
