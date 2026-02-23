import React, { useEffect, useRef } from "react";
import { View, Image, Animated, Easing, Text } from "react-native";

// The character image is at assets/images/pressrun-character.png
// Import it with require

type Props = {
  size?: number;        // size of the character image, default 80
  label?: string;       // optional text below character
  showLabel?: boolean;  // default true
};

export function PressRunLoader({ size = 80, label = "Loading...", showLabel = true }: Props) {
  // Walking: gentle up-down bob using translateY
  const bobAnim = useRef(new Animated.Value(0)).current;
  // Tilt: gentle left-right rotation for walking feel
  const tiltAnim = useRef(new Animated.Value(0)).current;
  // Record dot flicker: opacity pulse
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Bob up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -6, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Slight tilt rock
    Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, { toValue: 4, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tiltAnim, { toValue: -4, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Record dot flicker (fast blink, like REC light)
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.1, duration: 400, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  const rotate = tiltAnim.interpolate({ inputRange: [-4, 4], outputRange: ["-4deg", "4deg"] });

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Character with walk animation */}
      <Animated.View
        style={{
          transform: [
            { translateY: bobAnim },
            { rotate },
          ],
        }}
      >
        <View style={{ position: "relative", width: size, height: size }}>
          <Image
            source={require("../../assets/images/pressrun-character.png")}
            style={{ width: size, height: size, resizeMode: "contain" }}
          />
          {/* REC dot overlay — positioned over the camera lens area (top-right quadrant of image) */}
          <Animated.View
            style={{
              position: "absolute",
              top: size * 0.18,
              left: size * 0.52,
              width: size * 0.09,
              height: size * 0.09,
              borderRadius: size * 0.045,
              backgroundColor: "#E53935",
              opacity: dotAnim,
            }}
          />
        </View>
      </Animated.View>

      {showLabel && label ? (
        <Text style={{ color: "#8E8E93", fontSize: 13, marginTop: 12, fontWeight: "500", letterSpacing: 0.3 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
