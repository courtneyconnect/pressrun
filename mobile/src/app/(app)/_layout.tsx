import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="press-stop/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="chat/[userId]" />
      <Stack.Screen name="create-tour" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen
        name="onboarding"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}
