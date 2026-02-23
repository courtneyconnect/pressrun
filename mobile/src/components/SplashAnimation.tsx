import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated, Easing, Dimensions, StyleSheet } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

export function SplashAnimation({ onComplete }: { onComplete: () => void }) {
  // Globe rings — 5 rings that expand outward
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const ring4 = useRef(new Animated.Value(0)).current;
  const rings = [ring0, ring1, ring2, ring3, ring4];

  const ringOpacity0 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity3 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity4 = useRef(new Animated.Value(0.6)).current;
  const ringsOpacity = [ringOpacity0, ringOpacity1, ringOpacity2, ringOpacity3, ringOpacity4];

  // Character walk-in from left
  const charX = useRef(new Animated.Value(-120)).current;
  const charBob = useRef(new Animated.Value(0)).current;
  const dotFlicker = useRef(new Animated.Value(1)).current;

  // Logo fade in
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  // Overall fade out
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Globe rings expand staggered
    const ringAnims = rings.map((r, i) =>
      Animated.sequence([
        Animated.delay(i * 120),
        Animated.parallel([
          Animated.timing(r, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(ringsOpacity[i], { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ])
    );

    // Character walk in
    const charWalkIn = Animated.timing(charX, {
      toValue: W / 2 - 50,
      duration: 700,
      delay: 200,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    });

    // Character bob while standing
    const charBobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(charBob, { toValue: -5, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(charBob, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    // Record dot flicker
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotFlicker, { toValue: 0.05, duration: 300, useNativeDriver: true }),
        Animated.timing(dotFlicker, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(500),
      ])
    );

    // Logo appear
    const logoIn = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, delay: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, delay: 700, friction: 8, tension: 40, useNativeDriver: true }),
    ]);

    // Fade out whole splash after 2.2s
    const fadeOut = Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 400,
      delay: 2200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    charBobLoop.start();
    dotLoop.start();

    Animated.parallel([
      ...ringAnims,
      charWalkIn,
      logoIn,
      fadeOut,
    ]).start(() => {
      charBobLoop.stop();
      dotLoop.stop();
      onComplete();
    });
  }, []);

  const CHARACTER_SIZE = 100;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          opacity: containerOpacity,
        },
      ]}
    >
      {/* Globe rings */}
      {rings.map((r, i) => {
        const baseSize = 60 + i * 50;
        const scale = r.interpolate({ inputRange: [0, 1], outputRange: [1, 3.5] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: baseSize,
              height: baseSize,
              borderRadius: baseSize / 2,
              borderWidth: 1.5,
              borderColor: "#E53935",
              opacity: ringsOpacity[i],
              transform: [{ scale }],
            }}
          />
        );
      })}

      {/* Character */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: H * 0.28,
          left: 0,
          transform: [{ translateX: charX }, { translateY: charBob }],
        }}
      >
        <View style={{ position: "relative", width: CHARACTER_SIZE, height: CHARACTER_SIZE }}>
          <Image
            source={require("../../assets/images/pressrun-character.png")}
            style={{ width: CHARACTER_SIZE, height: CHARACTER_SIZE, resizeMode: "contain" }}
          />
          {/* REC dot */}
          <Animated.View
            style={{
              position: "absolute",
              top: CHARACTER_SIZE * 0.18,
              left: CHARACTER_SIZE * 0.52,
              width: CHARACTER_SIZE * 0.09,
              height: CHARACTER_SIZE * 0.09,
              borderRadius: CHARACTER_SIZE * 0.045,
              backgroundColor: "#E53935",
              opacity: dotFlicker,
            }}
          />
        </View>
      </Animated.View>

      {/* Logo */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text style={{ fontSize: 48, fontWeight: "800", letterSpacing: -1 }}>
          <Text style={{ color: "#FFFFFF" }}>Press</Text>
          <Text style={{ color: "#E53935" }}>Run</Text>
        </Text>
        <Text style={{ color: "#555558", fontSize: 14, letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>
          Your Press Network
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
