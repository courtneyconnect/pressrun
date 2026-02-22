import React from "react";
import { Tabs } from "expo-router";
import {
  Search,
  MapPin,
  Calendar,
  MessageSquare,
  User,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1C1C1E",
          borderTopColor: "#2C2C2E",
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: "#E53935",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarButtonTestID: "tab-discover",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Search size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: "Tours",
          tabBarButtonTestID: "tab-tours",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MapPin size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarButtonTestID: "tab-bookings",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Calendar size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarButtonTestID: "tab-messages",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <User size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => Haptics.selectionAsync() }}
      />
    </Tabs>
  );
}
