import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useMutation({
    mutationFn: async (emailAddress: string) => {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: emailAddress,
        type: "sign-in",
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to send code");
      }
      return result;
    },
    onSuccess: () => {
      router.push({ pathname: "/verify-otp", params: { email } } as any);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSendCode = () => {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    sendOtp.mutate(email.trim().toLowerCase());
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View testID="sign-in-screen" className="flex-1 px-6 justify-center">
            {/* Logo */}
            <View className="items-center mb-12">
              <Text className="text-5xl font-bold tracking-tight">
                <Text className="text-white">PRESS</Text>
                <Text className="text-[#E53935]">RUN</Text>
              </Text>
              <Text className="text-gray-400 text-base mt-3 tracking-wide">
                Book your press run.
              </Text>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-2 ml-1">
                Email address
              </Text>
              <TextInput
                testID="email-input"
                className="bg-[#1C1C1E] text-white text-base px-4 py-4 rounded-xl"
                placeholder="you@example.com"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!sendOtp.isPending}
              />
            </View>

            {/* Error */}
            {error ? (
              <View className="mb-4 px-1">
                <Text testID="error-text" className="text-[#E53935] text-sm">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Send Code Button */}
            <Pressable
              testID="send-code-button"
              className={`rounded-xl py-4 items-center ${
                sendOtp.isPending ? "bg-[#E53935]/60" : "bg-[#E53935]"
              }`}
              onPress={handleSendCode}
              disabled={sendOtp.isPending}
            >
              {sendOtp.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Send Code
                </Text>
              )}
            </Pressable>

            {/* Footer */}
            <View className="items-center mt-8">
              <Text className="text-gray-500 text-xs text-center leading-5">
                We will send a 6-digit verification code{"\n"}to your email
                address.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
