import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSession } from "@/lib/auth/use-session";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api/api";
import type { User } from "@/types";
import { SplashAnimation } from "@/components/SplashAnimation";
import { PressRunLoader } from "@/components/PressRunLoader";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PressRunTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#E53935",
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    border: "#2C2C2E",
    notification: "#E53935",
  },
};

function RootLayoutNav() {
  const { data: session, isLoading } = useSession();
  const router = useRouter();

  const { data: userProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<User>("/api/users/me"),
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (session?.user && userProfile && !userProfile.onboardingComplete) {
      router.replace("/(app)/onboarding" as any);
    }
  }, [session?.user, userProfile?.onboardingComplete]);

  if (isLoading) {
    return (
      <View testID="loading-indicator" style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <PressRunLoader size={80} />
      </View>
    );
  }

  return (
    <ThemeProvider value={PressRunTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session?.user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session?.user}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify-otp" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
          {showSplash ? (
            <SplashAnimation
              onComplete={() => {
                SplashScreen.hideAsync();
                setShowSplash(false);
              }}
            />
          ) : null}
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
