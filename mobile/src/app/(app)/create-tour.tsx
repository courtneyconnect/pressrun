import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, MapPin, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react-native";
import { api } from "@/lib/api/api";
import type { Tour } from "@/types";
import * as Haptics from "expo-haptics";

interface StopInput {
  city: string;
  state: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
}

const PRESS_STOP_TYPES = [
  "Podcast",
  "Interview",
  "Short Form",
  "Long Form",
  "Vlog",
  "On The Street",
  "Reviews",
  "Brand Deal",
  "Live Event",
  "Retail Store",
  "Livestream Studio",
  "Other",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return iso;
  return `${SHORT_MONTHS[month]} ${day}, ${year}`;
}

function CalendarModal({
  visible,
  onClose,
  startDate,
  endDate,
  onSelectStart,
  onSelectEnd,
}: {
  visible: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onSelectStart: (d: string) => void;
  onSelectEnd: (d: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [pickingEnd, setPickingEnd] = useState<boolean>(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const dateStr = isoDate(viewYear, viewMonth, day);
    Haptics.selectionAsync();
    if (!pickingEnd) {
      onSelectStart(dateStr);
      onSelectEnd("");
      setPickingEnd(true);
    } else {
      if (dateStr >= startDate) {
        onSelectEnd(dateStr);
      } else {
        onSelectStart(dateStr);
        onSelectEnd("");
      }
      setPickingEnd(false);
    }
  };

  const isInRange = (day: number): boolean => {
    if (!startDate || !endDate) return false;
    const d = isoDate(viewYear, viewMonth, day);
    return d > startDate && d < endDate;
  };

  const isStart = (day: number): boolean => {
    return isoDate(viewYear, viewMonth, day) === startDate;
  };

  const isEnd = (day: number): boolean => {
    return isoDate(viewYear, viewMonth, day) === endDate;
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}
        onPress={onClose}
      />
      <View style={{ backgroundColor: "#1C1C1E", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Pressable onPress={prevMonth} style={{ padding: 8 }}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={nextMonth} style={{ padding: 8 }}>
            <ChevronRight size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Instruction */}
        <Text style={{ color: "#8E8E93", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          {pickingEnd ? "Now tap the end date" : "Tap start date"}
        </Text>

        {/* Day headers */}
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <Text key={d} style={{ flex: 1, color: "#555558", fontSize: 12, fontWeight: "600", textAlign: "center" }}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={{ width: "14.28%", height: 40 }} />;
            }
            const selected = isStart(day) || isEnd(day);
            const inRange = isInRange(day);
            return (
              <Pressable
                key={`day-${day}`}
                onPress={() => handleDayPress(day)}
                style={{
                  width: "14.28%",
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? "#E53935" : inRange ? "#E5393520" : "transparent",
                  borderRadius: selected ? 20 : 0,
                }}
              >
                <Text style={{
                  color: selected ? "#fff" : inRange ? "#E53935" : "#fff",
                  fontSize: 14,
                  fontWeight: selected ? "700" : "400",
                }}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selected range display */}
        {startDate ? (
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#2C2C2E" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#8E8E93", fontSize: 11 }}>Start</Text>
              <Text style={{ color: "#E53935", fontSize: 14, fontWeight: "700", marginTop: 2 }}>{startDate ? formatDisplayDate(startDate) : "—"}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#8E8E93", fontSize: 11 }}>End</Text>
              <Text style={{ color: "#E53935", fontSize: 14, fontWeight: "700", marginTop: 2 }}>{endDate ? formatDisplayDate(endDate) : "—"}</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onClose}
          style={{ backgroundColor: "#E53935", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 16 }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function SingleDatePickerModal({
  visible,
  onClose,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const dateStr = isoDate(viewYear, viewMonth, day);
    Haptics.selectionAsync();
    onSelect(dateStr);
    onClose();
  };

  const isSelected = (day: number): boolean => {
    return isoDate(viewYear, viewMonth, day) === value;
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}
        onPress={onClose}
      />
      <View style={{ backgroundColor: "#1C1C1E", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Pressable onPress={prevMonth} style={{ padding: 8 }}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={nextMonth} style={{ padding: 8 }}>
            <ChevronRight size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Instruction */}
        <Text style={{ color: "#8E8E93", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          Tap a date to select
        </Text>

        {/* Day headers */}
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <Text key={d} style={{ flex: 1, color: "#555558", fontSize: 12, fontWeight: "600", textAlign: "center" }}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={{ width: "14.28%", height: 40 }} />;
            }
            const selected = isSelected(day);
            return (
              <Pressable
                key={`day-${day}`}
                onPress={() => handleDayPress(day)}
                style={{
                  width: "14.28%",
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? "#E53935" : "transparent",
                  borderRadius: selected ? 20 : 0,
                }}
              >
                <Text style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: selected ? "700" : "400",
                }}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selected date display */}
        {value ? (
          <View style={{ alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#2C2C2E" }}>
            <Text style={{ color: "#8E8E93", fontSize: 11 }}>Selected</Text>
            <Text style={{ color: "#E53935", fontSize: 14, fontWeight: "700", marginTop: 2 }}>{formatDisplayDate(value)}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={onClose}
          style={{ backgroundColor: "#2C2C2E", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 16 }}
        >
          <Text style={{ color: "#8E8E93", fontSize: 15, fontWeight: "700" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function CreateTourScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(1);

  // Step 1
  const [name, setName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // Step 2
  const [stops, setStops] = useState<StopInput[]>([]);
  const [newStop, setNewStop] = useState<StopInput>({
    city: "",
    state: "",
    country: "US",
    arrivalDate: "",
    departureDate: "",
  });
  const [showArrivalPicker, setShowArrivalPicker] = useState<boolean>(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState<boolean>(false);

  // Step 3
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const createTour = useMutation({
    mutationFn: (data: {
      name: string;
      startDate: string;
      endDate: string;
      stops: StopInput[];
      pressStopTypes: string[];
    }) => api.post<Tour>("/api/tours", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      router.back();
    },
  });

  const addStop = () => {
    if (!newStop.city.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStops((prev) => [...prev, { ...newStop }]);
    setNewStop({ city: "", state: "", country: "US", arrivalDate: "", departureDate: "" });
  };

  const removeStop = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleType = (type: string) => {
    Haptics.selectionAsync();
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createTour.mutate({
      name: name.trim(),
      startDate,
      endDate,
      stops,
      pressStopTypes: selectedTypes,
    });
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    }
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep((s) => s + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable testID="back-button" onPress={goBack} style={{ padding: 4 }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18, marginLeft: 12 }}>
            Create Tour
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: s <= step ? "#E53935" : "#2C2C2E",
              }}
            />
          ))}
        </View>

        <ScrollView
          testID="create-tour-form"
          style={{ flex: 1, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 1: Name + Dates ── */}
          {step === 1 ? (
            <View>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 4 }}>
                Name Your Tour
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 14, marginBottom: 24 }}>
                Step 1 of 3 — Give your press tour a name and set your dates
              </Text>

              <Text style={{ color: "#8E8E93", fontSize: 13, marginBottom: 8, fontWeight: "600" }}>
                TOUR NAME
              </Text>
              <TextInput
                testID="tour-name-input"
                style={{ backgroundColor: "#1C1C1E", color: "#fff", fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 24 }}
                placeholder="e.g. Summer Press Tour 2025"
                placeholderTextColor="#555558"
                value={name}
                onChangeText={setName}
              />

              <Text style={{ color: "#8E8E93", fontSize: 13, marginBottom: 8, fontWeight: "600" }}>
                TOUR DATES
              </Text>
              <Pressable
                testID="open-calendar-button"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCalendar(true); }}
                style={{ backgroundColor: "#1C1C1E", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" }}
              >
                <View style={{ flex: 1 }}>
                  {startDate ? (
                    <View>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                        {formatDisplayDate(startDate)}
                        {endDate ? ` — ${formatDisplayDate(endDate)}` : null}
                      </Text>
                      <Text style={{ color: "#555558", fontSize: 12, marginTop: 2 }}>Tap to change</Text>
                    </View>
                  ) : (
                    <Text style={{ color: "#555558", fontSize: 15 }}>Select start and end dates</Text>
                  )}
                </View>
                <View style={{ backgroundColor: "#E53935", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Calendar</Text>
                </View>
              </Pressable>

              <View style={{ height: 32 }} />
              <Pressable
                testID="step1-continue"
                onPress={goNext}
                disabled={!name.trim()}
                style={{
                  backgroundColor: name.trim() ? "#E53935" : "#E5393540",
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── STEP 2: Cities ── */}
          {step === 2 ? (
            <View>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 4 }}>
                Add City Stops
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 14, marginBottom: 24 }}>
                Step 2 of 3 — Where are you going on this tour?
              </Text>

              {/* Existing stops */}
              {stops.length > 0 ? (
                <View style={{ marginBottom: 16 }}>
                  {stops.map((stop, index) => (
                    <View
                      key={`stop-${index}`}
                      style={{ backgroundColor: "#1C1C1E", borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center" }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E53935" + "20", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <MapPin size={16} color="#E53935" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                          {stop.city}{stop.state ? `, ${stop.state}` : null}
                        </Text>
                        {stop.arrivalDate ? (
                          <Text style={{ color: "#555558", fontSize: 12, marginTop: 2 }}>
                            {formatDisplayDate(stop.arrivalDate)}{stop.departureDate ? ` – ${formatDisplayDate(stop.departureDate)}` : null}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        testID={`remove-stop-${index}`}
                        onPress={() => removeStop(index)}
                        style={{ padding: 6 }}
                      >
                        <X size={18} color="#555558" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Add stop form */}
              <View style={{ backgroundColor: "#1C1C1E", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: "#8E8E93", fontSize: 12, fontWeight: "600", marginBottom: 10 }}>ADD A STOP</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                  <TextInput
                    testID="stop-city-input"
                    style={{ flex: 1, backgroundColor: "#2C2C2E", color: "#fff", fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
                    placeholder="City"
                    placeholderTextColor="#555558"
                    value={newStop.city}
                    onChangeText={(v) => setNewStop((s) => ({ ...s, city: v }))}
                  />
                  <TextInput
                    testID="stop-state-input"
                    style={{ width: 72, backgroundColor: "#2C2C2E", color: "#fff", fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
                    placeholder="State"
                    placeholderTextColor="#555558"
                    value={newStop.state}
                    onChangeText={(v) => setNewStop((s) => ({ ...s, state: v }))}
                  />
                </View>

                {/* Arrival date picker button */}
                <Pressable
                  testID="stop-arrival-input"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowArrivalPicker(true); }}
                  style={{
                    backgroundColor: "#2C2C2E",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: newStop.arrivalDate ? "#fff" : "#555558", fontSize: 14 }}>
                    {newStop.arrivalDate ? formatDisplayDate(newStop.arrivalDate) : "Arrival Date"}
                  </Text>
                  <CalendarDays size={16} color="#8E8E93" />
                </Pressable>

                {/* Departure date picker button */}
                <Pressable
                  testID="stop-departure-input"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDeparturePicker(true); }}
                  style={{
                    backgroundColor: "#2C2C2E",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: newStop.departureDate ? "#fff" : "#555558", fontSize: 14 }}>
                    {newStop.departureDate ? formatDisplayDate(newStop.departureDate) : "Departure Date"}
                  </Text>
                  <CalendarDays size={16} color="#8E8E93" />
                </Pressable>

                <Pressable
                  testID="add-stop-button"
                  onPress={addStop}
                  style={{ backgroundColor: "#2C2C2E", borderRadius: 10, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                >
                  <Plus size={16} color="#E53935" />
                  <Text style={{ color: "#E53935", fontWeight: "600", fontSize: 14, marginLeft: 6 }}>Add Stop</Text>
                </Pressable>
              </View>

              <Pressable
                testID="step2-continue"
                onPress={goNext}
                style={{ backgroundColor: "#E53935", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 32 }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── STEP 3: Press Stop Types ── */}
          {step === 3 ? (
            <View>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 4 }}>
                Press Stop Types
              </Text>
              <Text style={{ color: "#8E8E93", fontSize: 14, marginBottom: 24 }}>
                Step 3 of 3 — What types of press stops are you looking to book?
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
                {PRESS_STOP_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type);
                  return (
                    <Pressable
                      key={type}
                      testID={`type-chip-${type.toLowerCase().replace(/ /g, "-")}`}
                      onPress={() => toggleType(type)}
                      style={{
                        backgroundColor: selected ? "#E53935" : "#1C1C1E",
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderWidth: 1.5,
                        borderColor: selected ? "#E53935" : "#2C2C2E",
                      }}
                    >
                      <Text style={{ color: selected ? "#fff" : "#8E8E93", fontSize: 14, fontWeight: selected ? "700" : "500" }}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                testID="create-tour-button"
                onPress={handleCreate}
                disabled={createTour.isPending}
                style={{
                  backgroundColor: createTour.isPending ? "#E5393560" : "#E53935",
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                {createTour.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Create Tour</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        startDate={startDate}
        endDate={endDate}
        onSelectStart={setStartDate}
        onSelectEnd={setEndDate}
      />

      <SingleDatePickerModal
        visible={showArrivalPicker}
        onClose={() => setShowArrivalPicker(false)}
        value={newStop.arrivalDate}
        onSelect={(date) => setNewStop((s) => ({ ...s, arrivalDate: date }))}
      />

      <SingleDatePickerModal
        visible={showDeparturePicker}
        onClose={() => setShowDeparturePicker(false)}
        value={newStop.departureDate}
        onSelect={(date) => setNewStop((s) => ({ ...s, departureDate: date }))}
      />
    </View>
  );
}
