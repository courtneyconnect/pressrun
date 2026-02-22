import React, { useEffect, useRef } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

const { width: SW, height: SH } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#E53935", "#FFD700", "#4FC3F7", "#66BB6A", "#FF6B35",
  "#9C27B0", "#FF80AB", "#00BCD4", "#FFEB3B", "#F44336",
  "#2196F3", "#4CAF50", "#FF9800", "#E91E63", "#00E676",
];

const NUM_PARTICLES = 28;

function ConfettiParticle({ index, startDelay }: { index: number; startDelay: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const angle = (index / NUM_PARTICLES) * Math.PI * 2;
  const distance = 120 + Math.random() * 160;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 80; // bias upward
  const size = 8 + Math.random() * 10;
  const isWide = Math.random() > 0.5;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(startDelay, withTiming(1, { duration: 100 }));
    tx.value = withDelay(startDelay, withTiming(dx, { duration: 700, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(
      startDelay,
      withSequence(
        withTiming(dy - 40, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(dy + 120, { duration: 500, easing: Easing.in(Easing.quad) })
      )
    );
    rotate.value = withDelay(startDelay, withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 900 }));
    opacity.value = withDelay(
      startDelay + 600,
      withTiming(0, { duration: 400 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: isWide ? size * 1.8 : size,
          height: isWide ? size * 0.6 : size,
          backgroundColor: color,
          borderRadius: 2,
        },
      ]}
    />
  );
}

function StopSign({ onDismiss }: { onDismiss: () => void }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    // Haptics: heavy impact + notification sequence
    const doHaptics = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 240);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 600);
    };

    // Sound
    const playHorn = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/truck-horn.wav"),
          { shouldPlay: true, volume: 1.0 }
        );
        setTimeout(() => sound.unloadAsync(), 3000);
      } catch (e) {
        // Sound failure is non-critical
      }
    };

    overlayOpacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 10, stiffness: 180, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 150 });

    doHaptics();
    playHorn();

    // Auto-dismiss after 3s: scale out then call onDismiss
    const timer = setTimeout(() => {
      scale.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => runOnJS(onDismiss)(), 320);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const signStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const OCT_SIZE = 220;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        overlayStyle,
        {
          backgroundColor: "rgba(0,0,0,0.75)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        },
      ]}
    >
      {/* Confetti burst from center */}
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
          width: SW,
          height: SH,
        }}
      >
        {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
          <ConfettiParticle key={i} index={i} startDelay={50 + i * 8} />
        ))}
      </View>

      <Animated.View style={[signStyle, { alignItems: "center", justifyContent: "center" }]}>
        {/* Octagon shape: rotated squares layered */}
        <View
          style={{
            width: OCT_SIZE,
            height: OCT_SIZE,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Base square rotated 22.5deg — octagon approximation */}
          <View
            style={{
              position: "absolute",
              width: OCT_SIZE * 0.92,
              height: OCT_SIZE * 0.92,
              backgroundColor: "#C62828",
              transform: [{ rotate: "22.5deg" }],
              borderRadius: 18,
            }}
          />
          {/* Overlay square at 0deg */}
          <View
            style={{
              position: "absolute",
              width: OCT_SIZE * 0.92,
              height: OCT_SIZE * 0.92,
              backgroundColor: "#C62828",
              transform: [{ rotate: "0deg" }],
              borderRadius: 18,
            }}
          />
          {/* White border ring rotated 22.5deg */}
          <View
            style={{
              position: "absolute",
              width: OCT_SIZE * 0.78,
              height: OCT_SIZE * 0.78,
              backgroundColor: "transparent",
              borderWidth: 4,
              borderColor: "white",
              transform: [{ rotate: "22.5deg" }],
              borderRadius: 14,
            }}
          />
          {/* White border ring at 0deg */}
          <View
            style={{
              position: "absolute",
              width: OCT_SIZE * 0.78,
              height: OCT_SIZE * 0.78,
              backgroundColor: "transparent",
              borderWidth: 4,
              borderColor: "white",
              transform: [{ rotate: "0deg" }],
              borderRadius: 14,
            }}
          />
          {/* Text */}
          <View style={{ alignItems: "center", zIndex: 10 }}>
            <Text
              style={{
                color: "white",
                fontSize: 26,
                fontWeight: "900",
                letterSpacing: 2,
                textAlign: "center",
                lineHeight: 30,
              }}
            >
              PRESS{"\n"}STOP
            </Text>
            <View
              style={{
                width: "80%",
                height: 2,
                backgroundColor: "white",
                marginVertical: 6,
              }}
            />
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "800",
                letterSpacing: 1.5,
                textAlign: "center",
              }}
            >
              BOOKED
            </Text>
          </View>
        </View>

        {/* Sub-label */}
        <View
          style={{
            marginTop: 24,
            backgroundColor: "rgba(255,255,255,0.15)",
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 15,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Booking request sent!
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

interface BookingCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

export function BookingCelebration({ visible, onDismiss }: BookingCelebrationProps) {
  if (!visible) return null;
  return <StopSign onDismiss={onDismiss} />;
}
