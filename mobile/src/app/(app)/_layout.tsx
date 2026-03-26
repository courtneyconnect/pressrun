import { Stack } from "expo-router";
import { useEffect } from "react";
import { registerForPushNotifications } from "@/services/notifications";
import { useSession } from "@/lib/auth/use-session";

export default function AppLayout() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      void registerForPushNotifications();
    }
  }, [session?.user?.id]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="press-stop/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="booking/negotiate" />
      <Stack.Screen name="chat/[userId]" />
      <Stack.Screen name="create-tour" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="series/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="tour-discovery" />
      <Stack.Screen name="tour/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="search" />
      <Stack.Screen name="admin-assignments" />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
