import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";

type AvailabilitySlot = {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  sessionId: number;
  subject: string;
  tutorName: string;
  scheduledStart: string; // ISO string
  scheduledEnd: string;   // ISO string
  onAdded?: () => void;
};

function isoToDayOfWeek(iso: string): number {
  // JS getDay(): 0=Sun,1=Mon...6=Sat → convert to 0=Mon...6=Sun
  const jsDay = new Date(iso).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function isoToTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}:00`;
}

export default function AddToCalendarButton({
  sessionId,
  subject,
  tutorName,
  scheduledStart,
  scheduledEnd,
  onAdded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      // Check existing slots to prevent duplicates
      const existing = await api.get<AvailabilitySlot[]>("/availability/me");

      const dayOfWeek = isoToDayOfWeek(scheduledStart);
      const startTime = isoToTime(scheduledStart);
      const endTime = isoToTime(scheduledEnd);

      // Check for duplicate: same day + overlapping time
      const isDuplicate = existing.some((slot) => {
        if (slot.day_of_week !== dayOfWeek) return false;
        const existStart = slot.start_time.slice(0, 5);
        const existEnd = slot.end_time.slice(0, 5);
        const newStart = startTime.slice(0, 5);
        const newEnd = endTime.slice(0, 5);
        return existStart === newStart && existEnd === newEnd;
      });

      if (isDuplicate) {
        Alert.alert("Already Added", "This session is already on your calendar.");
        return;
      }

      // Check for conflict with existing slots
      const startMin = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]);
      const endMin = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
      const hasConflict = existing.some((slot) => {
        if (slot.day_of_week !== dayOfWeek) return false;
        const sStart = parseInt(slot.start_time.split(":")[0]) * 60 + parseInt(slot.start_time.split(":")[1]);
        const sEnd = parseInt(slot.end_time.split(":")[0]) * 60 + parseInt(slot.end_time.split(":")[1]);
        return startMin < sEnd && endMin > sStart;
      });

      if (hasConflict) {
        Alert.alert(
          "Time Conflict",
          "This session overlaps with an existing slot on your calendar. Remove the conflicting slot first."
        );
        return;
      }

      await api.post("/availability/", {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      });

      setAdded(true);
      onAdded?.();
      Alert.alert("Added!", `${subject} with ${tutorName} has been added to your calendar.`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add to calendar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, added && styles.btnAdded]}
      onPress={handleAdd}
      disabled={loading || added}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Ionicons
            name={added ? "checkmark-circle" : "calendar-outline"}
            size={18}
            color="#FFF"
          />
          <Text style={styles.btnText}>
            {added ? "Added to Calendar" : "Add to Calendar"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Also export a full session detail screen that uses this button
// This can be navigated to from matches or session history

export function SessionDetailScreen() {
  // This is a placeholder — the button above is the main deliverable for Story 42.
  // Wire AddToCalendarButton into any screen that shows session details.
  return null;
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  btnAdded: {
    backgroundColor: "#1F7A4C",
  },
  btnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});