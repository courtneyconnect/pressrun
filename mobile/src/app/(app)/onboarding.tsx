import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Video,
  Building2,
  Search,
  CalendarDays,
  Star,
  Music2,
  Twitch,
  Gamepad2,
  Mic2,
  Camera,
  Youtube,
  Podcast,
  ShoppingBag,
  Dumbbell,
  Briefcase,
  Utensils,
  Tv,
  Radio,
} from "lucide-react-native";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import * as Haptics from "expo-haptics";
import type { UserRole } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Creator subcategories ─────────────────────────────────────────────────────

const CREATOR_CATEGORIES = [
  { id: "music_artist", label: "Music Artist", icon: Music2, color: "#FF6B6B" },
  { id: "streamer", label: "Streamer", icon: Twitch, color: "#9146FF" },
  { id: "gamer", label: "Gamer", icon: Gamepad2, color: "#4FC3F7" },
  { id: "podcaster", label: "Podcaster", icon: Mic2, color: "#FF9F43" },
  { id: "photographer", label: "Photographer", icon: Camera, color: "#A8E6CF" },
  { id: "youtuber", label: "YouTuber", icon: Youtube, color: "#FF0000" },
  { id: "content_creator", label: "Content Creator", icon: Video, color: "#E53935" },
  { id: "lifestyle", label: "Lifestyle", icon: ShoppingBag, color: "#F8A5C2" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, color: "#78E08F" },
  { id: "business", label: "Business", icon: Briefcase, color: "#60A3BC" },
  { id: "food", label: "Food & Cooking", icon: Utensils, color: "#F9CA24" },
  { id: "tv_film", label: "TV / Film", icon: Tv, color: "#BDC3C7" },
];

const PRESS_STOP_CATEGORIES = [
  { id: "podcast_show", label: "Podcast Show", icon: Podcast, color: "#FF9F43" },
  { id: "radio_station", label: "Radio Station", icon: Radio, color: "#4FC3F7" },
  { id: "youtube_channel", label: "YouTube Channel", icon: Youtube, color: "#FF0000" },
  { id: "streaming_show", label: "Streaming Show", icon: Twitch, color: "#9146FF" },
  { id: "brand", label: "Brand / Sponsor", icon: ShoppingBag, color: "#F8A5C2" },
  { id: "media_outlet", label: "Media Outlet", icon: Tv, color: "#BDC3C7" },
  { id: "music_label", label: "Music Label", icon: Music2, color: "#FF6B6B" },
  { id: "pr_agency", label: "PR Agency", icon: Briefcase, color: "#60A3BC" },
  { id: "esports", label: "Esports Org", icon: Gamepad2, color: "#A8E6CF" },
  { id: "sports_team", label: "Sports Team", icon: Dumbbell, color: "#78E08F" },
  { id: "food_brand", label: "Food & Bev Brand", icon: Utensils, color: "#F9CA24" },
  { id: "entertainment", label: "Entertainment Co.", icon: Star, color: "#FFD700" },
];

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i + 1 === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i + 1 === current ? "#E53935" : "#3A3A3C",
          }}
        />
      ))}
    </View>
  );
}

// ─── Red button ────────────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: disabled ? "#7B1A18" : "#E53935",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        opacity: pressed ? 0.85 : 1,
        width: "100%",
      })}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 17 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 }}>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: "center" }}>
        <View
          style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#E53935", opacity: 0.08, top: -40, alignSelf: "center" }}
          pointerEvents="none"
        />
        <View
          style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "#E53935", opacity: 0.12, top: 0, alignSelf: "center" }}
          pointerEvents="none"
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 52, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1 }}>Press</Text>
          <Text style={{ fontSize: 52, fontWeight: "800", color: "#E53935", letterSpacing: -1 }}>Run</Text>
        </View>
        <Text style={{ fontSize: 18, color: "#8E8E93", textAlign: "center", letterSpacing: 0.2 }}>
          Where creators meet press.
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ width: "100%", paddingBottom: 20 }}>
        <PrimaryButton
          testID="welcome-get-started-button"
          label="Get Started"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        />
        <Text style={{ color: "#3A3A3C", fontSize: 12, textAlign: "center", marginTop: 14 }}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

// ─── Step 2: Name ─────────────────────────────────────────────────────────────

function NameStep({
  name,
  setName,
  onNext,
  onBack,
}: {
  name: string;
  setName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28 }}>
      <Pressable testID="name-back-button" onPress={onBack} style={{ marginBottom: 32, alignSelf: "flex-start" }}>
        <ArrowLeft size={24} color="#8E8E93" />
      </Pressable>
      <Text style={{ fontSize: 32, fontWeight: "800", color: "#FFFFFF", marginBottom: 8, letterSpacing: -0.5 }}>
        What's your name?
      </Text>
      <Text style={{ fontSize: 16, color: "#8E8E93", marginBottom: 36 }}>
        This is how you'll appear to others.
      </Text>
      <TextInput
        testID="onboarding-name-input"
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        placeholderTextColor="#3A3A3C"
        autoFocus
        autoCapitalize="words"
        style={{
          backgroundColor: "#1C1C1E",
          borderRadius: 14,
          paddingHorizontal: 18,
          paddingVertical: 16,
          fontSize: 18,
          color: "#FFFFFF",
          borderWidth: 1.5,
          borderColor: name.trim().length > 0 ? "#E53935" : "#2C2C2E",
          marginBottom: 12,
        }}
      />
      <View style={{ flex: 1 }} />
      <View style={{ paddingBottom: 20 }}>
        <PrimaryButton
          testID="name-continue-button"
          label="Continue"
          disabled={name.trim().length === 0}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        />
      </View>
    </View>
  );
}

// ─── Step 3: Role ─────────────────────────────────────────────────────────────

function RoleStep({
  role,
  setRole,
  onNext,
  onBack,
}: {
  role: UserRole | null;
  setRole: (r: UserRole) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28 }}>
      <Pressable testID="role-back-button" onPress={onBack} style={{ marginBottom: 32, alignSelf: "flex-start" }}>
        <ArrowLeft size={24} color="#8E8E93" />
      </Pressable>
      <Text style={{ fontSize: 32, fontWeight: "800", color: "#FFFFFF", marginBottom: 8, letterSpacing: -0.5 }}>
        I am a...
      </Text>
      <Text style={{ fontSize: 16, color: "#8E8E93", marginBottom: 32 }}>
        Pick the role that fits you best.
      </Text>
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 24 }}>
        <Pressable
          testID="role-creator-card"
          onPress={() => { Haptics.selectionAsync(); setRole("TALENT"); }}
          style={{
            flex: 1,
            backgroundColor: role === "TALENT" ? "#2D0F0E" : "#1C1C1E",
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderColor: role === "TALENT" ? "#E53935" : "#2C2C2E",
            alignItems: "flex-start",
            minHeight: 200,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: role === "TALENT" ? "#E53935" : "#2C2C2E", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Video size={24} color={role === "TALENT" ? "#FFFFFF" : "#8E8E93"} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 }}>Creator</Text>
          <Text style={{ fontSize: 13, color: "#8E8E93", lineHeight: 19 }}>
            I create content and want to book press stops like podcasts, brands, and media outlets.
          </Text>
        </Pressable>
        <Pressable
          testID="role-manager-card"
          onPress={() => { Haptics.selectionAsync(); setRole("PRESS_STOP"); }}
          style={{
            flex: 1,
            backgroundColor: role === "PRESS_STOP" ? "#2D0F0E" : "#1C1C1E",
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderColor: role === "PRESS_STOP" ? "#E53935" : "#2C2C2E",
            alignItems: "flex-start",
            minHeight: 200,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: role === "PRESS_STOP" ? "#E53935" : "#2C2C2E", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Building2 size={24} color={role === "PRESS_STOP" ? "#FFFFFF" : "#8E8E93"} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 }}>Manager</Text>
          <Text style={{ fontSize: 13, color: "#8E8E93", lineHeight: 19 }}>
            I manage a press stop, brand, or media outlet and want to book creators for content.
          </Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ paddingBottom: 20 }}>
        <PrimaryButton
          testID="role-continue-button"
          label="Continue"
          disabled={role === null}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        />
      </View>
    </View>
  );
}

// ─── Step 4: Content Categories ───────────────────────────────────────────────

function CategoryStep({
  role,
  selected,
  setSelected,
  onNext,
  onBack,
}: {
  role: UserRole | null;
  selected: string[];
  setSelected: (v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const categories = role === "PRESS_STOP" ? PRESS_STOP_CATEGORIES : CREATOR_CATEGORIES;

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 28 }}>
      <Pressable testID="category-back-button" onPress={onBack} style={{ marginBottom: 24, alignSelf: "flex-start" }}>
        <ArrowLeft size={24} color="#8E8E93" />
      </Pressable>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginBottom: 6, letterSpacing: -0.5 }}>
        {role === "PRESS_STOP" ? "What kind of outlet?" : "What kind of creator?"}
      </Text>
      <Text style={{ fontSize: 15, color: "#8E8E93", marginBottom: 20 }}>
        Select all that apply — you can always change this later.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {categories.map((cat) => {
            const isSelected = selected.includes(cat.id);
            const IconComp = cat.icon;
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggle(cat.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isSelected ? "#2D0F0E" : "#1C1C1E",
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: isSelected ? "#E53935" : "#2C2C2E",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: isSelected ? "#E53935" : "#2C2C2E",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <IconComp size={14} color={isSelected ? "#fff" : cat.color} />
                </View>
                <Text style={{ color: isSelected ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: isSelected ? "700" : "500" }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: 20, paddingTop: 12 }}>
        <PrimaryButton
          testID="category-continue-button"
          label={selected.length > 0 ? `Continue (${selected.length} selected)` : "Skip for now"}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        />
      </View>
    </View>
  );
}

// ─── Step 5: How It Works ─────────────────────────────────────────────────────

const HOW_IT_WORKS_SLIDES = [
  {
    icon: Search,
    title: "Discover",
    body: "Browse creator press stops and content series. Filter by city, category, and more.",
  },
  {
    icon: CalendarDays,
    title: "Book",
    body: "Send a booking request directly to creators or press stops. Negotiate dates and fees in-app.",
  },
  {
    icon: Star,
    title: "Create Together",
    body: "Confirm the shoot, create great content, and leave reviews to build your reputation.",
  },
];

function HowItWorksStep({
  onNext,
  onBack,
  isSubmitting,
}: {
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}) {
  const [slide, setSlide] = useState<number>(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goToSlide = (nextSlide: number, direction: "forward" | "back") => {
    const startX = direction === "forward" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideAnim.setValue(startX);
    setSlide(nextSlide);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  };

  const current = HOW_IT_WORKS_SLIDES[slide];
  const IconComponent = current.icon;
  const isLast = slide === HOW_IT_WORKS_SLIDES.length - 1;

  return (
    <View style={{ flex: 1, paddingHorizontal: 28 }}>
      <Pressable
        testID="how-back-button"
        onPress={() => { if (slide > 0) { goToSlide(slide - 1, "back"); } else { onBack(); } }}
        style={{ marginBottom: 32, alignSelf: "flex-start" }}
      >
        <ArrowLeft size={24} color="#8E8E93" />
      </Pressable>
      <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "center", transform: [{ translateX: slideAnim }] }}>
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
          <View style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#E53935", opacity: 0.12 }} />
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#2D0F0E", borderWidth: 2, borderColor: "#E53935", alignItems: "center", justifyContent: "center" }}>
            <IconComponent size={40} color="#E53935" />
          </View>
        </View>
        <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginBottom: 16, letterSpacing: -0.5 }}>
          {current.title}
        </Text>
        <Text style={{ fontSize: 17, color: "#8E8E93", textAlign: "center", lineHeight: 26, paddingHorizontal: 12 }}>
          {current.body}
        </Text>
      </Animated.View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 }}>
        {HOW_IT_WORKS_SLIDES.map((_, i) => (
          <View key={i} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === slide ? "#E53935" : "#3A3A3C" }} />
        ))}
      </View>
      <View style={{ paddingBottom: 20 }}>
        <PrimaryButton
          testID={isLast ? "lets-go-button" : "how-next-button"}
          label={isLast ? "Let's Go!" : "Next"}
          loading={isLast === true && isSubmitting === true}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (isLast) { onNext(); } else { goToSlide(slide + 1, "forward"); }
          }}
        />
      </View>
    </View>
  );
}

// ─── Main onboarding component ────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>(session?.user?.name ?? "");
  const [role, setRole] = useState<UserRole | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name && name === "") {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const completeOnboarding = useMutation({
    mutationFn: () =>
      api.post("/api/users/me/complete-onboarding", {
        role: role as UserRole,
        name: name.trim(),
        contentCategories: categories,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/(app)/(tabs)/" as any);
    },
    onError: (err: Error) => {
      setError(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const goToStep = (nextStep: number) => {
    Animated.timing(slideAnim, {
      toValue: nextStep > step ? -SCREEN_WIDTH : SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(nextStep > step ? SCREEN_WIDTH : -SCREEN_WIDTH);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    });
  };

  const TOTAL_STEPS = 5;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {step > 1 ? (
          <View style={{ paddingHorizontal: 28, paddingTop: 8, paddingBottom: 4, alignItems: "center" }}>
            <StepDots current={step} total={TOTAL_STEPS} />
          </View>
        ) : null}

        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          {step === 1 ? <WelcomeStep onNext={() => goToStep(2)} /> : null}
          {step === 2 ? (
            <NameStep name={name} setName={setName} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />
          ) : null}
          {step === 3 ? (
            <RoleStep role={role} setRole={setRole} onNext={() => goToStep(4)} onBack={() => goToStep(2)} />
          ) : null}
          {step === 4 ? (
            <CategoryStep
              role={role}
              selected={categories}
              setSelected={setCategories}
              onNext={() => goToStep(5)}
              onBack={() => goToStep(3)}
            />
          ) : null}
          {step === 5 ? (
            <HowItWorksStep
              onNext={() => { setError(null); completeOnboarding.mutate(); }}
              onBack={() => goToStep(4)}
              isSubmitting={completeOnboarding.isPending}
            />
          ) : null}
        </Animated.View>

        {error ? (
          <View style={{ marginHorizontal: 28, marginBottom: 16, backgroundColor: "#2D0F0E", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E53935" }}>
            <Text style={{ color: "#FF6B6B", fontSize: 14, textAlign: "center" }}>{error}</Text>
            <Pressable
              testID="onboarding-retry-button"
              onPress={() => { setError(null); completeOnboarding.mutate(); }}
              style={{ marginTop: 10, alignItems: "center" }}
            >
              <Text style={{ color: "#E53935", fontWeight: "700", fontSize: 14 }}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
