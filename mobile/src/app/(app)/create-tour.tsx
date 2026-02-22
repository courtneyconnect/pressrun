import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, MapPin } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { Tour } from "@/types";

interface StopInput {
  city: string;
  state: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
}

export default function CreateTourScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [stops, setStops] = useState<StopInput[]>([]);
  const [newStop, setNewStop] = useState<StopInput>({
    city: "",
    state: "",
    country: "US",
    arrivalDate: "",
    departureDate: "",
  });

  const createTour = useMutation({
    mutationFn: (data: {
      name: string;
      startDate: string;
      endDate: string;
      stops: StopInput[];
    }) => api.post<Tour>("/api/tours", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      router.back();
    },
  });

  const addStop = () => {
    if (!newStop.city.trim()) return;
    setStops((prev) => [...prev, { ...newStop }]);
    setNewStop({
      city: "",
      state: "",
      country: "US",
      arrivalDate: "",
      departureDate: "",
    });
  };

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createTour.mutate({
      name: name.trim(),
      startDate,
      endDate,
      stops,
    });
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Pressable testID="back-button" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-semibold text-lg ml-3">
            Create Tour
          </Text>
        </View>

        <ScrollView testID="create-tour-form" className="flex-1 px-4">
          {/* Tour Name */}
          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">Tour Name</Text>
            <TextInput
              testID="tour-name-input"
              className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
              placeholder="e.g. Summer Press Tour 2025"
              placeholderTextColor="#8E8E93"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Date Range */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-2">Start Date</Text>
              <TextInput
                testID="start-date-input"
                className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8E8E93"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-2">End Date</Text>
              <TextInput
                testID="end-date-input"
                className="bg-[#1C1C1E] text-white text-base px-4 py-3.5 rounded-xl"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8E8E93"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          {/* Stops Section */}
          <View className="mb-4">
            <Text className="text-gray-400 text-xs font-medium mb-3 uppercase">
              Tour Stops ({stops.length})
            </Text>

            {/* Existing stops */}
            {stops.map((stop, index) => (
              <View
                key={`stop-${index}`}
                className="bg-[#1C1C1E] rounded-xl p-3 mb-2 flex-row items-center"
              >
                <MapPin size={16} color="#E53935" />
                <Text className="text-white text-sm ml-2 flex-1">
                  {stop.city}{stop.state ? `, ${stop.state}` : null}
                </Text>
                <Pressable
                  testID={`remove-stop-${index}`}
                  onPress={() => removeStop(index)}
                >
                  <X size={18} color="#8E8E93" />
                </Pressable>
              </View>
            ))}

            {/* Add Stop Form */}
            <View className="bg-[#1C1C1E] rounded-2xl p-4 mt-2">
              <View className="flex-row gap-3 mb-3">
                <TextInput
                  testID="stop-city-input"
                  className="flex-1 bg-[#2C2C2E] text-white text-sm px-3 py-2.5 rounded-lg"
                  placeholder="City"
                  placeholderTextColor="#8E8E93"
                  value={newStop.city}
                  onChangeText={(v) =>
                    setNewStop((s) => ({ ...s, city: v }))
                  }
                />
                <TextInput
                  testID="stop-state-input"
                  className="w-20 bg-[#2C2C2E] text-white text-sm px-3 py-2.5 rounded-lg"
                  placeholder="State"
                  placeholderTextColor="#8E8E93"
                  value={newStop.state}
                  onChangeText={(v) =>
                    setNewStop((s) => ({ ...s, state: v }))
                  }
                />
              </View>
              <View className="flex-row gap-3 mb-3">
                <TextInput
                  testID="stop-arrival-input"
                  className="flex-1 bg-[#2C2C2E] text-white text-sm px-3 py-2.5 rounded-lg"
                  placeholder="Arrival (YYYY-MM-DD)"
                  placeholderTextColor="#8E8E93"
                  value={newStop.arrivalDate}
                  onChangeText={(v) =>
                    setNewStop((s) => ({ ...s, arrivalDate: v }))
                  }
                />
                <TextInput
                  testID="stop-departure-input"
                  className="flex-1 bg-[#2C2C2E] text-white text-sm px-3 py-2.5 rounded-lg"
                  placeholder="Departure (YYYY-MM-DD)"
                  placeholderTextColor="#8E8E93"
                  value={newStop.departureDate}
                  onChangeText={(v) =>
                    setNewStop((s) => ({ ...s, departureDate: v }))
                  }
                />
              </View>
              <Pressable
                testID="add-stop-button"
                className="bg-[#2C2C2E] rounded-lg py-2.5 items-center flex-row justify-center"
                onPress={addStop}
              >
                <Plus size={16} color="#E53935" />
                <Text className="text-[#E53935] font-medium text-sm ml-1">
                  Add Stop
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Create Button */}
          <Pressable
            testID="create-tour-button"
            className={`rounded-xl py-4 items-center mb-8 ${
              createTour.isPending || !name.trim()
                ? "bg-[#E53935]/40"
                : "bg-[#E53935]"
            }`}
            onPress={handleCreate}
            disabled={createTour.isPending || !name.trim()}
          >
            {createTour.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Create Tour
              </Text>
            )}
          </Pressable>

          <View className="h-12" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
