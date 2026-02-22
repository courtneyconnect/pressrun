import { Stack, useRouter } from 'expo-router';
import { Text, View, Pressable } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View testID="not-found-screen" className="flex-1 items-center justify-center bg-black p-5">
        <Text className="text-xl font-bold text-white">
          This screen does not exist.
        </Text>

        <Pressable
          testID="go-home-button"
          className="mt-4 py-4"
          onPress={() => router.replace("/" as any)}
        >
          <Text className="text-sm text-[#E53935]">Go to home screen</Text>
        </Pressable>
      </View>
    </>
  );
}
