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
import { ArrowLeft, Camera, Plus, Trash2, Video, ChevronDown, ChevronUp } from "lucide-react-native";
import { api } from "@/lib/api/api";
import { uploadFile } from "@/lib/upload";
import { pickImage, takePhoto } from "@/lib/file-picker";
import type { User as UserType, ContentSeries } from "@/types";

// ─── Duration picker options ──────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
  { label: "4 hr", value: 240 },
  { label: "Half day (6 hr)", value: 360 },
  { label: "Full day (8 hr)", value: 480 },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 mt-2">
      {title}
    </Text>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text className="text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
      {label}
    </Text>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  testID,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  testID: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "url" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View className="mb-4">
      <FieldLabel label={label} />
      <TextInput
        testID={testID}
        className={`bg-[#1C1C1E] text-white text-base px-4 rounded-xl ${
          multiline ? "py-3 min-h-[90px]" : "py-3.5"
        }`}
        placeholder={placeholder ?? label}
        placeholderTextColor="#555558"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
      />
    </View>
  );
}

function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = DURATION_OPTIONS.find((o) => o.value === value) ?? DURATION_OPTIONS[3];

  return (
    <View className="mb-4">
      <FieldLabel label="Shoot Duration" />
      <Pressable
        testID="duration-picker"
        className="bg-[#1C1C1E] rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        onPress={() => setOpen((p) => !p)}
      >
        <Text className="text-white text-base">{selected.label}</Text>
        {open ? <ChevronUp size={16} color="#8E8E93" /> : <ChevronDown size={16} color="#8E8E93" />}
      </Pressable>
      {open ? (
        <View className="bg-[#1C1C1E] rounded-xl mt-1 overflow-hidden">
          {DURATION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              testID={`duration-option-${opt.value}`}
              className={`px-4 py-3 border-b border-[#2C2C2E] ${
                opt.value === value ? "bg-[#E53935]/10" : ""
              }`}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text
                className={`text-base ${opt.value === value ? "text-[#E53935] font-semibold" : "text-white"}`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface SeriesFormData {
  id?: string;
  title: string;
  description: string;
  durationMinutes: number;
  price: string; // dollars as string for input
}

function SeriesForm({
  item,
  onChange,
  onDelete,
}: {
  item: SeriesFormData;
  onChange: (updated: SeriesFormData) => void;
  onDelete: () => void;
}) {
  return (
    <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-semibold text-sm">
          {item.title || "New Series"}
        </Text>
        <Pressable testID="delete-series-button" onPress={onDelete} className="p-1">
          <Trash2 size={16} color="#E53935" />
        </Pressable>
      </View>

      <View className="mb-3">
        <FieldLabel label="Series Name" />
        <TextInput
          testID="series-title-input"
          className="bg-[#2C2C2E] text-white text-base px-4 py-3 rounded-xl"
          placeholder="e.g. Day in My Life, Studio Session..."
          placeholderTextColor="#555558"
          value={item.title}
          onChangeText={(v) => onChange({ ...item, title: v })}
        />
      </View>

      <View className="mb-3">
        <FieldLabel label="Description (optional)" />
        <TextInput
          testID="series-description-input"
          className="bg-[#2C2C2E] text-white text-sm px-4 py-3 rounded-xl min-h-[70px]"
          placeholder="What happens during this shoot?"
          placeholderTextColor="#555558"
          value={item.description}
          onChangeText={(v) => onChange({ ...item, description: v })}
          multiline
          textAlignVertical="top"
        />
      </View>

      <DurationPicker
        value={item.durationMinutes}
        onChange={(v) => onChange({ ...item, durationMinutes: v })}
      />

      <View>
        <FieldLabel label="Booking Fee (USD)" />
        <View className="flex-row items-center bg-[#2C2C2E] rounded-xl px-4 py-3">
          <Text className="text-gray-400 text-base mr-1">$</Text>
          <TextInput
            testID="series-price-input"
            className="flex-1 text-white text-base"
            placeholder="0"
            placeholderTextColor="#555558"
            value={item.price}
            onChangeText={(v) => onChange({ ...item, price: v.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserType>("/api/users/me"),
  });

  // Profile fields
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("");

  // Social links — store full URLs
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Photo
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Content series (local state — saved individually)
  const [seriesList, setSeriesList] = useState<SeriesFormData[]>([]);
  const [deletedSeriesIds, setDeletedSeriesIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setHeadline(user.headline ?? "");
      setBio(user.bio ?? "");
      setCity(user.city ?? "");
      setStateVal(user.state ?? "");
      setCountry(user.country ?? "");
      setInstagramUrl(user.instagramHandle ?? "");
      setTiktokUrl(user.tiktokHandle ?? "");
      setYoutubeUrl(user.youtubeHandle ?? "");
      setTwitterUrl(user.twitterHandle ?? "");
      setWebsiteUrl(user.websiteUrl ?? "");
      setImageUri(user.image ?? null);
      if (user.contentSeries) {
        setSeriesList(
          user.contentSeries.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description ?? "",
            durationMinutes: s.durationMinutes,
            price: s.price > 0 ? String(s.price / 100) : "",
          }))
        );
      }
    }
  }, [user]);

  // Photo change
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

  // Profile save
  const updateProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put<UserType>("/api/users/me", data),
    onError: () => Alert.alert("Error", "Failed to save profile. Please try again."),
  });

  // Series mutations
  const createSeries = useMutation({
    mutationFn: (data: { title: string; description: string | null; durationMinutes: number; price: number }) =>
      api.post<ContentSeries>("/api/users/me/series", data),
  });

  const updateSeries = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContentSeries> }) =>
      api.put<ContentSeries>(`/api/users/me/series/${id}`, data),
  });

  const deleteSeries = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/me/series/${id}`),
  });

  const handleSave = async () => {
    try {
      // 1. Save profile
      await updateProfile.mutateAsync({
        name: name.trim() || undefined,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        state: stateVal.trim() || null,
        country: country.trim() || null,
        instagramHandle: instagramUrl.trim() || null,
        tiktokHandle: tiktokUrl.trim() || null,
        youtubeHandle: youtubeUrl.trim() || null,
        twitterHandle: twitterUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        image: imageUri || null,
      });

      // 2. Delete removed series
      await Promise.all(deletedSeriesIds.map((id) => deleteSeries.mutateAsync(id)));

      // 3. Upsert series
      await Promise.all(
        seriesList.map((s) => {
          const payload = {
            title: s.title.trim(),
            description: s.description.trim() || null,
            durationMinutes: s.durationMinutes,
            price: Math.round(parseFloat(s.price || "0") * 100),
          };
          if (s.id) {
            return updateSeries.mutateAsync({ id: s.id, data: payload });
          } else {
            return createSeries.mutateAsync(payload);
          }
        })
      );

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  const isSaving =
    updateProfile.isPending ||
    createSeries.isPending ||
    updateSeries.isPending ||
    deleteSeries.isPending ||
    isUploadingPhoto;

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const addSeries = () => {
    setSeriesList((prev) => [
      ...prev,
      { title: "", description: "", durationMinutes: 60, price: "" },
    ]);
  };

  const updateSeriesItem = (index: number, updated: SeriesFormData) => {
    setSeriesList((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  const removeSeriesItem = (index: number) => {
    const item = seriesList[index];
    if (item.id) setDeletedSeriesIds((prev) => [...prev, item.id!]);
    setSeriesList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#1C1C1E]">
          <Pressable testID="back-button" onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg">Edit Profile</Text>
          <Pressable testID="save-header-button" onPress={handleSave} disabled={isSaving}>
            <Text className={`font-semibold text-base ${isSaving ? "text-[#E53935]/40" : "text-[#E53935]"}`}>
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
              >
                <View className="w-24 h-24 rounded-full bg-[#1C1C1E] items-center justify-center overflow-hidden">
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="large" color="#E53935" />
                  ) : imageUri ? (
                    <Image source={{ uri: imageUri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                  ) : (
                    <Text className="text-white text-3xl font-bold">{initials}</Text>
                  )}
                </View>
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
            <SectionHeader title="Basic Info" />
            <InputField label="Name" value={name} onChangeText={setName} testID="name-input" autoCapitalize="words" />
            <InputField label="Headline" value={headline} onChangeText={setHeadline} testID="headline-input" placeholder="What do you do?" />
            <InputField label="Bio" value={bio} onChangeText={setBio} testID="bio-input" placeholder="Tell people about yourself..." multiline />

            {/* Location */}
            <SectionHeader title="Location" />
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <FieldLabel label="City" />
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
                <FieldLabel label="State" />
                <TextInput
                  testID="state-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="State"
                  placeholderTextColor="#555558"
                  value={stateVal}
                  onChangeText={setStateVal}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <InputField label="Country" value={country} onChangeText={setCountry} testID="country-input" autoCapitalize="words" />

            {/* Social Links */}
            <SectionHeader title="Social Links" />
            <Text className="text-gray-500 text-xs mb-3 -mt-1">
              Paste your full profile URL (e.g. https://instagram.com/yourname)
            </Text>
            <InputField label="Instagram" value={instagramUrl} onChangeText={setInstagramUrl} testID="instagram-input" placeholder="https://instagram.com/yourname" keyboardType="url" autoCapitalize="none" />
            <InputField label="TikTok" value={tiktokUrl} onChangeText={setTiktokUrl} testID="tiktok-input" placeholder="https://tiktok.com/@yourname" keyboardType="url" autoCapitalize="none" />
            <InputField label="YouTube" value={youtubeUrl} onChangeText={setYoutubeUrl} testID="youtube-input" placeholder="https://youtube.com/@yourchannel" keyboardType="url" autoCapitalize="none" />
            <InputField label="X / Twitter" value={twitterUrl} onChangeText={setTwitterUrl} testID="twitter-input" placeholder="https://x.com/yourname" keyboardType="url" autoCapitalize="none" />
            <InputField label="Website" value={websiteUrl} onChangeText={setWebsiteUrl} testID="website-input" placeholder="https://yourwebsite.com" keyboardType="url" autoCapitalize="none" />

            {/* Content Series */}
            <SectionHeader title="Content Series" />
            <Text className="text-gray-500 text-xs mb-3 -mt-1">
              Add individual series that can be booked. Set shoot duration so booking times are accurate.
            </Text>

            {seriesList.map((item, index) => (
              <SeriesForm
                key={item.id ?? `new-${index}`}
                item={item}
                onChange={(updated) => updateSeriesItem(index, updated)}
                onDelete={() => removeSeriesItem(index)}
              />
            ))}

            <Pressable
              testID="add-series-button"
              className="border border-dashed border-[#2C2C2E] rounded-2xl py-4 items-center mb-4 flex-row justify-center"
              onPress={addSeries}
            >
              <Plus size={16} color="#8E8E93" />
              <Text className="text-gray-400 text-sm font-medium ml-2">Add Content Series</Text>
            </Pressable>

            {/* Save Button */}
            <Pressable
              testID="save-profile-button"
              className={`rounded-xl py-4 items-center mt-2 mb-10 ${isSaving ? "bg-[#E53935]/50" : "bg-[#E53935]"}`}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
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
