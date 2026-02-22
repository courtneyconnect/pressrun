import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { OtpInput } from "react-native-otp-entry";
import { ArrowLeft } from "lucide-react-native";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email ?? "";
  const invalidateSession = useInvalidateSession();
  const [error, setError] = useState<string | null>(null);

  const verifyOtp = useMutation({
    mutationFn: async (otp: string) => {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Invalid code");
      }
      return result;
    },
    onSuccess: () => {
      invalidateSession();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to resend code");
      }
      return result;
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleOtpFilled = (otp: string) => {
    setError(null);
    verifyOtp.mutate(otp);
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Back Button */}
          <Pressable
            testID="back-button"
            className="px-4 py-3 self-start"
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>

          <View testID="verify-otp-screen" className="flex-1 px-6 justify-center">
            {/* Header */}
            <View className="items-center mb-10">
              <Text className="text-3xl font-bold text-white mb-3">
                Enter Code
              </Text>
              <Text className="text-gray-400 text-base text-center">
                We sent a verification code to
              </Text>
              <Text className="text-white text-base font-medium mt-1">
                {email}
              </Text>
            </View>

            {/* OTP Input */}
            <View testID="otp-input" className="mb-6">
              <OtpInput
                numberOfDigits={6}
                onFilled={handleOtpFilled}
                disabled={verifyOtp.isPending}
                theme={{
                  containerStyle: {
                    gap: 10,
                  },
                  pinCodeContainerStyle: {
                    backgroundColor: "#1C1C1E",
                    borderColor: "#2C2C2E",
                    borderWidth: 1,
                    borderRadius: 12,
                    width: 48,
                    height: 56,
                  },
                  pinCodeTextStyle: {
                    color: "#FFFFFF",
                    fontSize: 22,
                    fontWeight: "600",
                  },
                  focusedPinCodeContainerStyle: {
                    borderColor: "#E53935",
                    borderWidth: 2,
                  },
                }}
              />
            </View>

            {/* Loading / Error */}
            {verifyOtp.isPending ? (
              <View className="items-center mb-4">
                <ActivityIndicator testID="verify-loading" color="#E53935" />
                <Text className="text-gray-400 text-sm mt-2">
                  Verifying...
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="mb-4 items-center">
                <Text testID="error-text" className="text-[#E53935] text-sm">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Resend */}
            <View className="items-center mt-4">
              <Pressable
                testID="resend-button"
                onPress={() => {
                  setError(null);
                  resendOtp.mutate();
                }}
                disabled={resendOtp.isPending}
              >
                {resendOtp.isPending ? (
                  <ActivityIndicator size="small" color="#8E8E93" />
                ) : (
                  <Text className="text-gray-400 text-sm">
                    Did not receive it?{" "}
                    <Text className="text-[#E53935] font-medium">Resend</Text>
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
