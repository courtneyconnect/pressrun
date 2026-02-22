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
import {
  ArrowLeft, Camera, Plus, Trash2,
  ChevronDown, ChevronUp, Link, Film,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { uploadFile } from "@/lib/upload";
import { pickImage, pickVideo, takePhoto } from "@/lib/file-picker";
import type { User as UserType, ContentSeries, SeriesExample } from "@/types";

// ─── Duration options ─────────────────────────────────────────────────────────
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

// ─── Series category options ───────────────────────────────────────────────────
const SERIES_CATEGORY_OPTIONS = [
  "Interview",
  "Vlog",
  "Review",
  "Tutorial",
  "Podcast",
  "Livestream",
  "Short Form",
  "Long Form",
  "Sponsored",
  "Other",
];

// ─── Shared components ────────────────────────────────────────────────────────
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
  label, value, onChangeText, testID, placeholder, multiline, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  testID: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
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
        spellCheck={false}
        contextMenuHidden={false}
      />
    </View>
  );
}

function DurationPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
        <View className="bg-[#1C1C1E] rounded-xl mt-1 overflow-hidden border border-[#2C2C2E]">
          {DURATION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              testID={`duration-option-${opt.value}`}
              className={`px-4 py-3 border-b border-[#2C2C2E] ${opt.value === value ? "bg-[#E53935]/10" : ""}`}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text className={`text-base ${opt.value === value ? "text-[#E53935] font-semibold" : "text-white"}`}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value || "Other";
  return (
    <View className="mb-4">
      <FieldLabel label="Series Category" />
      <Pressable
        testID="category-picker"
        className="bg-[#1C1C1E] rounded-xl px-4 py-3.5 flex-row items-center justify-between"
        onPress={() => setOpen((p) => !p)}
      >
        <Text className="text-white text-base">{selected}</Text>
        {open ? <ChevronUp size={16} color="#8E8E93" /> : <ChevronDown size={16} color="#8E8E93" />}
      </Pressable>
      {open ? (
        <View className="bg-[#1C1C1E] rounded-xl mt-1 overflow-hidden border border-[#2C2C2E]">
          {SERIES_CATEGORY_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              testID={`category-option-${opt.toLowerCase().replace(/\s/g, "-")}`}
              className={`px-4 py-3 border-b border-[#2C2C2E] ${opt === selected ? "bg-[#E53935]/10" : ""}`}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text className={`text-base ${opt === selected ? "text-[#E53935] font-semibold" : "text-white"}`}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Series examples ──────────────────────────────────────────────────────────
function ExampleRow({
  example,
  index,
  onUpdate,
  onDelete,
  onUploadVideo,
}: {
  example: SeriesExample;
  index: number;
  onUpdate: (ex: SeriesExample) => void;
  onDelete: () => void;
  onUploadVideo: () => void;
}) {
  return (
    <View className="bg-[#2C2C2E] rounded-xl p-3 mb-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          {example.type === "video" ? (
            <Film size={13} color="#E53935" />
          ) : (
            <Link size={13} color="#8E8E93" />
          )}
          <Text className="text-gray-400 text-xs ml-1.5">
            {example.type === "video" ? "Video" : "Link"}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          {/* Toggle type */}
          <Pressable
            testID={`toggle-example-type-${index}`}
            onPress={() => onUpdate({ ...example, type: example.type === "video" ? "link" : "video", url: "" })}
          >
            <Text className="text-[#E53935] text-xs font-medium">
              Switch to {example.type === "video" ? "Link" : "Video"}
            </Text>
          </Pressable>
          <Pressable testID={`delete-example-${index}`} onPress={onDelete}>
            <Trash2 size={14} color="#555558" />
          </Pressable>
        </View>
      </View>

      {/* Optional label */}
      <TextInput
        testID={`example-label-${index}`}
        className="bg-[#1C1C1E] text-white text-sm px-3 py-2 rounded-lg mb-2"
        placeholder="Label (optional)"
        placeholderTextColor="#555558"
        value={example.label ?? ""}
        onChangeText={(v) => onUpdate({ ...example, label: v })}
        autoCorrect={false}
        contextMenuHidden={false}
      />

      {example.type === "link" ? (
        <TextInput
          testID={`example-url-${index}`}
          className="bg-[#1C1C1E] text-white text-sm px-3 py-2 rounded-lg"
          placeholder="https://drive.google.com/... or any URL"
          placeholderTextColor="#555558"
          value={example.url}
          onChangeText={(v) => onUpdate({ ...example, url: v })}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          contextMenuHidden={false}
        />
      ) : (
        <View>
          {example.url ? (
            <View className="flex-row items-center bg-[#1C1C1E] rounded-lg px-3 py-2">
              <Film size={13} color="#E53935" />
              <Text className="text-gray-300 text-xs ml-2 flex-1" numberOfLines={1}>
                {example.url.split("/").pop()}
              </Text>
              <Pressable onPress={() => onUpdate({ ...example, url: "" })}>
                <Trash2 size={13} color="#555558" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              testID={`upload-video-${index}`}
              className="bg-[#1C1C1E] rounded-lg px-3 py-2.5 flex-row items-center justify-center"
              onPress={onUploadVideo}
            >
              <Film size={14} color="#8E8E93" />
              <Text className="text-gray-400 text-sm ml-2">Choose video from library</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Content Series form ──────────────────────────────────────────────────────
interface SeriesFormData {
  id?: string;
  title: string;
  description: string;
  coverImage: string | null;
  examples: SeriesExample[];
  durationMinutes: number;
  price: string;
  category: string;
  uploadingCover: boolean;
  uploadingExampleIndex: number | null;
}

function SeriesForm({
  item, index, onChange, onDelete,
}: {
  item: SeriesFormData;
  index: number;
  onChange: (updated: SeriesFormData) => void;
  onDelete: () => void;
}) {
  const handlePickCover = () => {
    Alert.alert("Cover Image", "Choose an image", [
      {
        text: "Choose from Library",
        onPress: async () => {
          const file = await pickImage([16, 9]);
          if (!file) return;
          onChange({ ...item, uploadingCover: true });
          try {
            const result = await uploadFile(file.uri, file.filename, file.mimeType);
            onChange({ ...item, coverImage: result.url, uploadingCover: false });
          } catch {
            onChange({ ...item, uploadingCover: false });
            Alert.alert("Error", "Failed to upload cover image.");
          }
        },
      },
      {
        text: "Take Photo",
        onPress: async () => {
          const file = await takePhoto();
          if (!file) return;
          onChange({ ...item, uploadingCover: true });
          try {
            const result = await uploadFile(file.uri, file.filename, file.mimeType);
            onChange({ ...item, coverImage: result.url, uploadingCover: false });
          } catch {
            onChange({ ...item, uploadingCover: false });
            Alert.alert("Error", "Failed to upload cover image.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleUploadExampleVideo = async (exIndex: number) => {
    const file = await pickVideo();
    if (!file) return;
    onChange({ ...item, uploadingExampleIndex: exIndex });
    try {
      const result = await uploadFile(file.uri, file.filename, file.mimeType);
      const updated = item.examples.map((ex, i) =>
        i === exIndex ? { ...ex, url: result.url } : ex
      );
      onChange({ ...item, examples: updated, uploadingExampleIndex: null });
    } catch (err) {
      onChange({ ...item, uploadingExampleIndex: null });
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Upload Failed", msg);
    }
  };

  const addExample = () => {
    if (item.examples.length >= 5) {
      Alert.alert("Limit reached", "You can add up to 5 examples per series.");
      return;
    }
    onChange({ ...item, examples: [...item.examples, { type: "link", url: "", label: "" }] });
  };

  return (
    <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-semibold text-sm flex-1 mr-2" numberOfLines={1}>
          {item.title || "New Series"}
        </Text>
        <Pressable testID={`delete-series-${index}`} onPress={onDelete} className="p-1">
          <Trash2 size={16} color="#E53935" />
        </Pressable>
      </View>

      {/* Cover image */}
      <View className="mb-3">
        <FieldLabel label="Cover Image" />
        <Pressable
          testID={`series-cover-${index}`}
          onPress={handlePickCover}
          disabled={item.uploadingCover}
          className="rounded-xl overflow-hidden"
        >
          {item.uploadingCover ? (
            <View className="bg-[#2C2C2E] rounded-xl h-28 items-center justify-center">
              <ActivityIndicator color="#E53935" />
              <Text className="text-gray-400 text-xs mt-2">Uploading...</Text>
            </View>
          ) : item.coverImage ? (
            <View className="relative">
              <Image
                source={{ uri: item.coverImage }}
                style={{ width: "100%", height: 110, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View className="absolute bottom-2 right-2 bg-black/60 rounded-lg px-2 py-1 flex-row items-center">
                <Camera size={11} color="#FFFFFF" />
                <Text className="text-white text-xs ml-1">Change</Text>
              </View>
            </View>
          ) : (
            <View className="bg-[#2C2C2E] rounded-xl h-28 items-center justify-center border border-dashed border-[#3C3C3E]">
              <Camera size={22} color="#555558" />
              <Text className="text-gray-500 text-xs mt-2">Tap to add cover image</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Title */}
      <View className="mb-3">
        <FieldLabel label="Series Name" />
        <TextInput
          testID={`series-title-${index}`}
          className="bg-[#2C2C2E] text-white text-base px-4 py-3 rounded-xl"
          placeholder="e.g. Day in My Life, Studio Session..."
          placeholderTextColor="#555558"
          value={item.title}
          onChangeText={(v) => onChange({ ...item, title: v })}
          contextMenuHidden={false}
        />
      </View>

      {/* Description */}
      <View className="mb-3">
        <FieldLabel label="Description (optional)" />
        <TextInput
          testID={`series-description-${index}`}
          className="bg-[#2C2C2E] text-white text-sm px-4 py-3 rounded-xl min-h-[70px]"
          placeholder="What happens during this shoot?"
          placeholderTextColor="#555558"
          value={item.description}
          onChangeText={(v) => onChange({ ...item, description: v })}
          multiline
          textAlignVertical="top"
          contextMenuHidden={false}
        />
      </View>

      {/* Duration + Price */}
      <DurationPicker
        value={item.durationMinutes}
        onChange={(v) => onChange({ ...item, durationMinutes: v })}
      />
      <View className="mb-3">
        <FieldLabel label="Booking Fee (USD)" />
        <View className="flex-row items-center bg-[#2C2C2E] rounded-xl px-4 py-3">
          <Text className="text-gray-400 text-base mr-1">$</Text>
          <TextInput
            testID={`series-price-${index}`}
            className="flex-1 text-white text-base"
            placeholder="0"
            placeholderTextColor="#555558"
            value={item.price}
            onChangeText={(v) => onChange({ ...item, price: v.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Examples */}
      <View>
        <View className="flex-row items-center justify-between mb-1.5">
          <FieldLabel label={`Examples (${item.examples.length}/5)`} />
        </View>
        <Text className="text-gray-600 text-xs mb-2">
          Upload a video from your camera roll, or paste a Google Drive / published URL.
        </Text>

        {item.examples.map((ex, exIndex) => (
          item.uploadingExampleIndex === exIndex ? (
            <View key={exIndex} className="bg-[#2C2C2E] rounded-xl p-3 mb-2 items-center">
              <ActivityIndicator color="#E53935" size="small" />
              <Text className="text-gray-400 text-xs mt-1.5">Uploading video...</Text>
            </View>
          ) : (
            <ExampleRow
              key={exIndex}
              example={ex}
              index={exIndex}
              onUpdate={(updated) => {
                const newExamples = item.examples.map((e, i) => i === exIndex ? updated : e);
                onChange({ ...item, examples: newExamples });
              }}
              onDelete={() => {
                onChange({ ...item, examples: item.examples.filter((_, i) => i !== exIndex) });
              }}
              onUploadVideo={() => handleUploadExampleVideo(exIndex)}
            />
          )
        ))}

        {item.examples.length < 5 && (
          <Pressable
            testID={`add-example-${index}`}
            className="border border-dashed border-[#3C3C3E] rounded-xl py-2.5 items-center flex-row justify-center"
            onPress={addExample}
          >
            <Plus size={14} color="#555558" />
            <Text className="text-gray-500 text-xs ml-1.5">Add example</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
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
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("");

  // Social
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [twitchUrl, setTwitchUrl] = useState("");
  const [kickUrl, setKickUrl] = useState("");
  const [whatnotUrl, setWhatnotUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Photo
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Content series
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
      setTwitchUrl(user.twitchUrl ?? "");
      setKickUrl(user.kickUrl ?? "");
      setWhatnotUrl(user.whatnotUrl ?? "");
      setLinkedinUrl(user.linkedinUrl ?? "");
      setWebsiteUrl(user.websiteUrl ?? "");
      setImageUri(user.image ?? null);
      if (user.contentSeries) {
        setSeriesList(
          user.contentSeries.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description ?? "",
            coverImage: s.coverImage ?? null,
            examples: s.examples ? (JSON.parse(s.examples) as SeriesExample[]) : [],
            durationMinutes: s.durationMinutes,
            price: s.price > 0 ? String(s.price / 100) : "",
            category: s.category ?? "Other",
            uploadingCover: false,
            uploadingExampleIndex: null,
          }))
        );
      }
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
            Alert.alert("Error", "Failed to upload photo.");
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
            Alert.alert("Error", "Failed to upload photo.");
          } finally {
            setIsUploadingPhoto(false);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const updateProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put<UserType>("/api/users/me", data),
  });
  const createSeries = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<ContentSeries>("/api/users/me/series", data),
  });
  const updateSeries = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<ContentSeries>(`/api/users/me/series/${id}`, data),
  });
  const deleteSeries = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/me/series/${id}`),
  });

  const handleSave = async () => {
    // Block save if any upload is in progress
    const anyUploading = seriesList.some((s) => s.uploadingCover || s.uploadingExampleIndex !== null);
    if (anyUploading || isUploadingPhoto) {
      Alert.alert("Please wait", "Uploads are still in progress.");
      return;
    }
    try {
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
        twitchUrl: twitchUrl.trim() || null,
        kickUrl: kickUrl.trim() || null,
        whatnotUrl: whatnotUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        image: imageUri || null,
      });

      await Promise.all(deletedSeriesIds.map((id) => deleteSeries.mutateAsync(id)));

      await Promise.all(
        seriesList.map((s) => {
          const payload = {
            title: s.title.trim(),
            description: s.description.trim() || null,
            coverImage: s.coverImage || null,
            examples: (() => {
              const valid = s.examples.filter((e) => e.url && e.url.trim().length > 0);
              return valid.length > 0 ? JSON.stringify(valid) : null;
            })(),
            durationMinutes: s.durationMinutes,
            price: Math.round(parseFloat(s.price || "0") * 100),
          };
          return s.id
            ? updateSeries.mutateAsync({ id: s.id, data: payload })
            : createSeries.mutateAsync(payload);
        })
      );

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  const isSaving = updateProfile.isPending || createSeries.isPending ||
    updateSeries.isPending || deleteSeries.isPending;

  const initials = (user?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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
          <ScrollView testID="edit-profile-form" className="flex-1 px-4" keyboardShouldPersistTaps="handled">
            {/* Avatar */}
            <View className="items-center py-6">
              <Pressable testID="change-photo-button" onPress={handleChangePhoto} disabled={isUploadingPhoto}>
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
                  placeholder="City" placeholderTextColor="#555558"
                  value={city} onChangeText={setCity}
                  contextMenuHidden={false}
                />
              </View>
              <View className="w-24">
                <FieldLabel label="State" />
                <TextInput
                  testID="state-input"
                  className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                  placeholder="State" placeholderTextColor="#555558"
                  value={stateVal} onChangeText={setStateVal}
                  autoCapitalize="characters"
                  contextMenuHidden={false}
                />
              </View>
            </View>
            <InputField label="Country" value={country} onChangeText={setCountry} testID="country-input" autoCapitalize="words" />

            {/* Social Links */}
            <SectionHeader title="Social Links" />
            <Text className="text-gray-500 text-xs mb-3 -mt-1">
              Paste your full profile URL — long-press any field to paste.
            </Text>
            <InputField label="Instagram" value={instagramUrl} onChangeText={setInstagramUrl} testID="instagram-input" placeholder="https://instagram.com/yourname" autoCapitalize="none" />
            <InputField label="TikTok" value={tiktokUrl} onChangeText={setTiktokUrl} testID="tiktok-input" placeholder="https://tiktok.com/@yourname" autoCapitalize="none" />
            <InputField label="YouTube" value={youtubeUrl} onChangeText={setYoutubeUrl} testID="youtube-input" placeholder="https://youtube.com/@yourchannel" autoCapitalize="none" />
            <InputField label="X / Twitter" value={twitterUrl} onChangeText={setTwitterUrl} testID="twitter-input" placeholder="https://x.com/yourname" autoCapitalize="none" />
            <InputField label="Twitch" value={twitchUrl} onChangeText={setTwitchUrl} testID="twitch-input" placeholder="https://twitch.tv/yourname" autoCapitalize="none" />
            <InputField label="Kick" value={kickUrl} onChangeText={setKickUrl} testID="kick-input" placeholder="https://kick.com/yourname" autoCapitalize="none" />
            <InputField label="Whatnot" value={whatnotUrl} onChangeText={setWhatnotUrl} testID="whatnot-input" placeholder="https://whatnot.com/user/yourname" autoCapitalize="none" />
            <InputField label="LinkedIn" value={linkedinUrl} onChangeText={setLinkedinUrl} testID="linkedin-input" placeholder="https://linkedin.com/in/yourname" autoCapitalize="none" />
            <InputField label="Website" value={websiteUrl} onChangeText={setWebsiteUrl} testID="website-input" placeholder="https://yourwebsite.com" autoCapitalize="none" />

            {/* Content Series */}
            <SectionHeader title="Content Series" />
            <Text className="text-gray-500 text-xs mb-3 -mt-1">
              Add individual series that can be booked. Include a cover image and up to 5 examples so people know what to expect.
            </Text>

            {seriesList.map((item, index) => (
              <SeriesForm
                key={item.id ?? `new-${index}`}
                item={item}
                index={index}
                onChange={(updated) =>
                  setSeriesList((prev) => prev.map((s, i) => i === index ? updated : s))
                }
                onDelete={() => {
                  if (item.id) setDeletedSeriesIds((prev) => [...prev, item.id!]);
                  setSeriesList((prev) => prev.filter((_, i) => i !== index));
                }}
              />
            ))}

            <Pressable
              testID="add-series-button"
              className="border border-dashed border-[#2C2C2E] rounded-2xl py-4 items-center mb-4 flex-row justify-center"
              onPress={() => setSeriesList((prev) => [
                ...prev,
                { title: "", description: "", coverImage: null, examples: [], durationMinutes: 60, price: "", category: "Other", uploadingCover: false, uploadingExampleIndex: null },
              ])}
            >
              <Plus size={16} color="#8E8E93" />
              <Text className="text-gray-400 text-sm font-medium ml-2">Add Content Series</Text>
            </Pressable>

            {/* Save */}
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
