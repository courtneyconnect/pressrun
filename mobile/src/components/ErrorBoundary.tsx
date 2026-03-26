import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

interface Props {
  children: React.ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // Errors are surfaced in the fallback UI
  }

  handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          testID="error-boundary-fallback"
          style={{
            flex: 1,
            backgroundColor: "#000",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(229,57,53,0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 32 }}>⚠</Text>
          </View>

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            {this.props.title ?? "Something went wrong"}
          </Text>

          <Text
            style={{
              color: "#8E8E93",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            An unexpected error occurred.{"\n"}Tap below to try again.
          </Text>

          <Pressable
            testID="error-boundary-retry"
            onPress={this.handleRetry}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#c62828" : "#E53935",
              borderRadius: 14,
              paddingHorizontal: 36,
              paddingVertical: 14,
            })}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
