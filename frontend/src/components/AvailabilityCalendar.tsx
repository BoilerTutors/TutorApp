import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";

export type AvailabilitySlot = {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(t: string): string {
  const part = t.split(":").slice(0, 2).join(":");
  const [h, m] = part.split(":").map(Number);
  if (h === 0 && m === 0) return "12:00 AM";
  if (h === 12) return `12:${String(m).padStart(2, "0")} PM`;
  if (h > 12) return `${h - 12}:${String(m).padStart(2, "0")} PM`;
  return `${h}:${String(m).padStart(2, "0")} AM`;
}

function parseTimeInput(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (match[3]?.toLowerCase() === "pm" && h < 12) h += 12;
    if (match[3]?.toLowerCase() === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    }
  }
  const [h, m] = trimmed.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const hour = h < 24 ? h : h % 24;
  const min = m < 60 ? m : 59;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

export default function AvailabilityCalendar() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDay, setNewDay] = useState(0);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const loadSlots = useCallback(async () => {
    try {
      const data = await api.get<AvailabilitySlot[]>("/availability/me");
      setSlots(data);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const slotsByDay = DAY_NAMES.map((_, i) => slots.filter((s) => s.day_of_week === i));

  const handleAddSlot = async () => {
    const start = parseTimeInput(newStart);
    const end = parseTimeInput(newEnd);
    if (!start || !end) {
      Alert.alert("Invalid time", "Use format 9:00 or 9:00 AM");
      return;
    }
    if (start >= end) {
      Alert.alert("Invalid range", "End time must be after start time");
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<AvailabilitySlot>("/availability/", {
        day_of_week: newDay,
        start_time: start,
        end_time: end,
      });
      setSlots((prev) => [...prev, created].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      setModalVisible(false);
      setNewStart("");
      setNewEnd("");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add slot");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSlot = async (id: number) => {
    try {
      await api.delete(`/availability/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove slot");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#2E57A2" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
        {DAY_NAMES.map((name, dayIndex) => (
          <View key={dayIndex} style={styles.dayCard}>
            <Text style={styles.dayName}>{name}</Text>
            {slotsByDay[dayIndex].map((slot) => (
              <View key={slot.id} style={styles.slotRow}>
                <Text style={styles.slotText}>
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </Text>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => handleRemoveSlot(slot.id)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#B91C1C" />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={styles.addSlotBtn}
              onPress={() => {
                setNewDay(dayIndex);
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={18} color="#2E57A2" />
              <Text style={styles.addSlotText}>Add time</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add availability</Text>
            <Text style={styles.modalSubtitle}>{DAY_NAMES[newDay]}</Text>

            <Text style={styles.label}>Start time (e.g. 9:00 or 2:30 PM)</Text>
            <TextInput
              style={styles.input}
              value={newStart}
              onChangeText={setNewStart}
              placeholder="9:00"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />

            <Text style={styles.label}>End time</Text>
            <TextInput
              style={styles.input}
              value={newEnd}
              onChangeText={setNewEnd}
              placeholder="17:00"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />

            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtn}
                onPress={handleAddSlot}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnText}>Add</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 14, color: "#6B7280" },
  weekScroll: { paddingVertical: 8, gap: 10, paddingRight: 20 },
  dayCard: {
    minWidth: 120,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  dayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B2D50",
    marginBottom: 10,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotText: { fontSize: 12, color: "#374151", flex: 1 },
  removeBtn: { padding: 4 },
  addSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    marginTop: 4,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2E57A2",
    borderRadius: 8,
  },
  addSlotText: { fontSize: 13, fontWeight: "600", color: "#2E57A2" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#6B7280" },
  modalBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
