import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
};

type AvailabilitySlot = {
  id: number;
  user_id: number;
  day_of_week: number; // 0=Mon ... 6=Sun
  start_time: string;  // "HH:MM:SS"
  end_time: string;
};

type SessionBlock = {
  id: number; // session id
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  tutorName: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Hours to display: 7am - 10pm
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}:00`;
}

function doSlotsOverlap(
  slots: AvailabilitySlot[],
  day: number,
  startMin: number,
  endMin: number,
  excludeId?: number
): boolean {
  return slots
    .filter((s) => s.day_of_week === day && s.id !== excludeId)
    .some((s) => {
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return startMin < sEnd && endMin > sStart;
    });
}

function jsDayToAppDay(jsDay: number): number {
  // JS: 0=Sun..6=Sat; app: 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

function slotOverlapsAnySession(slot: AvailabilitySlot, sessions: SessionBlock[]): boolean {
  const slotStart = timeToMinutes(slot.start_time);
  const slotEnd = timeToMinutes(slot.end_time);
  return sessions.some((s) => {
    if (s.day_of_week !== slot.day_of_week) return false;
    const sStart = timeToMinutes(s.start_time);
    const sEnd = timeToMinutes(s.end_time);
    return slotStart < sEnd && slotEnd > sStart;
  });
}

export default function AvailabilityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add slot modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMinute, setEndMinute] = useState(0);

  // Detail modal (tap on existing slot)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedSessionBlock, setSelectedSessionBlock] = useState<SessionBlock | null>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [availSlots, pastSessions, futureSessions] = await Promise.all([
        api.get<AvailabilitySlot[]>("/availability/me"),
        api.get<
          Array<{
            id: number;
            tutor_id: number;
            scheduled_start: string;
            scheduled_end: string;
            subject: string;
            status: "pending" | "confirmed" | "completed" | "cancelled";
          }>
        >("/sessions/student/past"),
        api.get<
          Array<{
            id: number;
            tutor_id: number;
            scheduled_start: string;
            scheduled_end: string;
            subject: string;
            status: "pending" | "confirmed" | "completed" | "cancelled";
          }>
        >("/sessions/student/future"),
      ]);
      const allSessions = [...pastSessions, ...futureSessions];
      const activeSessions = allSessions.filter((s) => s.status !== "cancelled");
      const uniqueTutorIds = Array.from(new Set(activeSessions.map((s) => s.tutor_id)));
      const tutorNamePairs = await Promise.all(
        uniqueTutorIds.map(async (id) => {
          try {
            const user = await api.get<{ first_name: string; last_name: string }>(`/users/${id}`);
            return [id, `${user.first_name} ${user.last_name}`.trim()] as const;
          } catch {
            return [id, `Tutor #${id}`] as const;
          }
        })
      );
      const tutorNameById = new Map<number, string>(tutorNamePairs);

      const blocks: SessionBlock[] = activeSessions.map((s) => {
        const start = new Date(s.scheduled_start);
        const end = new Date(s.scheduled_end);
        return {
          id: s.id,
          day_of_week: jsDayToAppDay(start.getDay()),
          start_time: `${String(start.getHours()).padStart(2, "0")}:${String(
            start.getMinutes()
          ).padStart(2, "0")}:00`,
          end_time: `${String(end.getHours()).padStart(2, "0")}:${String(
            end.getMinutes()
          ).padStart(2, "0")}:00`,
          subject: s.subject,
          tutorName: tutorNameById.get(s.tutor_id) ?? `Tutor #${s.tutor_id}`,
          status: s.status,
        };
      });
      setSlots(availSlots);
      setSessionBlocks(blocks);
    } catch {
      Alert.alert("Error", "Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddSlot = async () => {
    const startMin = startHour * 60 + startMinute;
    const endMin = endHour * 60 + endMinute;

    if (startMin >= endMin) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }

    if (doSlotsOverlap(slots, selectedDay, startMin, endMin)) {
      Alert.alert("Conflict", "This slot overlaps with an existing availability slot.");
      return;
    }
    const overlapsSession = sessionBlocks.some((s) => {
      if (s.day_of_week !== selectedDay) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return startMin < sEnd && endMin > sStart;
    });
    if (overlapsSession) {
      Alert.alert("Conflict", "This slot overlaps with an existing tutoring session.");
      return;
    }

    setSaving(true);
    try {
      const newSlot = await api.post<AvailabilitySlot>("/availability/", {
        day_of_week: selectedDay,
        start_time: minutesToTime(startMin),
        end_time: minutesToTime(endMin),
      });
      setSlots((prev) => [...prev, newSlot]);
      setShowAddModal(false);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save slot.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      await api.delete(`/availability/${selectedSlot.id}`);
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id));
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
      setSelectedSlot(null);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete slot.");
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = (day: number) => {
    setSelectedDay(day);
    setStartHour(9);
    setStartMinute(0);
    setEndHour(10);
    setEndMinute(0);
    setShowAddModal(true);
  };

  const openSlotDetail = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setSelectedSessionBlock(null);
    setShowDetailModal(true);
  };

  const openSessionDetail = (block: SessionBlock) => {
    setSelectedSessionBlock(block);
    setSelectedSlot(null);
    setShowDetailModal(true);
  };

  // Render a single day column
  const renderDayColumn = (dayIndex: number) => {
    const daySessionBlocks = sessionBlocks.filter((s) => s.day_of_week === dayIndex);
    const daySlots = slots
      .filter((s) => s.day_of_week === dayIndex)
      .filter((s) => !slotOverlapsAnySession(s, daySessionBlocks));
    const HOUR_HEIGHT = 48;
    const START_HOUR = 7;

    return (
      <View key={dayIndex} style={styles.dayColumn}>
        <Text style={styles.dayHeader}>{DAYS[dayIndex]}</Text>
        <View style={[styles.dayGrid, { height: HOURS.length * HOUR_HEIGHT }]}>
          {/* Hour lines */}
          {HOURS.map((h, i) => (
            <View
              key={h}
              style={[styles.hourLine, { top: i * HOUR_HEIGHT }]}
            />
          ))}

          {/* Availability slots */}
          {daySlots.map((slot) => {
            const startMin = timeToMinutes(slot.start_time);
            const endMin = timeToMinutes(slot.end_time);
            const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
            const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotBlock, { top, height }]}
                onPress={() => openSlotDetail(slot)}
              >
                <Text style={styles.slotText} numberOfLines={1}>
                  {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Session blocks */}
          {daySessionBlocks.map((block) => {
            const startMin = timeToMinutes(block.start_time);
            const endMin = timeToMinutes(block.end_time);
            const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
            const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
            return (
              <TouchableOpacity
                key={`session-${block.id}`}
                style={[styles.sessionBlock, { top, height }]}
                onPress={() => openSessionDetail(block)}
              >
                <Text style={styles.sessionBlockText} numberOfLines={1}>
                  📚 {block.subject}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Add button at bottom */}
          <TouchableOpacity
            style={styles.addDayBtn}
            onPress={() => openAddModal(dayIndex)}
          >
            <Ionicons name="add" size={16} color="#2E57A2" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2E57A2" }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#D4AF4A" }]} />
          <Text style={styles.legendText}>Session</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E57A2" />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.calendarContainer}>
              {/* Time labels */}
              <View style={styles.timeColumn}>
                <View style={styles.dayHeader} />
                {HOURS.map((h) => (
                  <View key={h} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText}>{formatHour(h)}</Text>
                  </View>
                ))}
              </View>

              {/* Day columns */}
              {DAYS.map((_, i) => renderDayColumn(i))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Add Slot Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Availability</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#5D667C" />
              </TouchableOpacity>
            </View>

            {/* Day picker */}
            <Text style={styles.modalLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {FULL_DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                  onPress={() => setSelectedDay(i)}
                >
                  <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Start time */}
            <Text style={styles.modalLabel}>Start Time</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timePicker}>
                <TouchableOpacity onPress={() => setStartHour((h) => Math.min(22, h + 1))}>
                  <Ionicons name="chevron-up" size={20} color="#2E57A2" />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>{startHour.toString().padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setStartHour((h) => Math.max(0, h - 1))}>
                  <Ionicons name="chevron-down" size={20} color="#2E57A2" />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timePicker}>
                <TouchableOpacity onPress={() => setStartMinute((m) => (m + 15) % 60)}>
                  <Ionicons name="chevron-up" size={20} color="#2E57A2" />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>{startMinute.toString().padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setStartMinute((m) => (m - 15 + 60) % 60)}>
                  <Ionicons name="chevron-down" size={20} color="#2E57A2" />
                </TouchableOpacity>
              </View>
            </View>

            {/* End time */}
            <Text style={styles.modalLabel}>End Time</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timePicker}>
                <TouchableOpacity onPress={() => setEndHour((h) => Math.min(23, h + 1))}>
                  <Ionicons name="chevron-up" size={20} color="#2E57A2" />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>{endHour.toString().padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setEndHour((h) => Math.max(0, h - 1))}>
                  <Ionicons name="chevron-down" size={20} color="#2E57A2" />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timePicker}>
                <TouchableOpacity onPress={() => setEndMinute((m) => (m + 15) % 60)}>
                  <Ionicons name="chevron-up" size={20} color="#2E57A2" />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>{endMinute.toString().padStart(2, "0")}</Text>
                <TouchableOpacity onPress={() => setEndMinute((m) => (m - 15 + 60) % 60)}>
                  <Ionicons name="chevron-down" size={20} color="#2E57A2" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleAddSlot}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetailModal(false)}>
          <View style={styles.detailModalContent}>
            {selectedSlot && (
              <>
                <Text style={styles.detailTitle}>Availability Slot</Text>
                <Text style={styles.detailDay}>{FULL_DAYS[selectedSlot.day_of_week]}</Text>
                <Text style={styles.detailTime}>
                  {selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    setShowDetailModal(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                  <Text style={styles.deleteBtnText}>Delete Slot</Text>
                </TouchableOpacity>
              </>
            )}
            {selectedSessionBlock && (
              <>
                <Text style={styles.detailTitle}>Session</Text>
                <Text style={styles.detailDay}>{FULL_DAYS[selectedSessionBlock.day_of_week]}</Text>
                <Text style={styles.detailTime}>
                  {selectedSessionBlock.start_time.slice(0, 5)} – {selectedSessionBlock.end_time.slice(0, 5)}
                </Text>
                <Text style={styles.detailSubject}>📚 {selectedSessionBlock.subject}</Text>
                <Text style={styles.detailTutor}>Tutor: {selectedSessionBlock.tutorName}</Text>
                {selectedSessionBlock.status ? (
                  <Text style={styles.detailTutor}>Status: {selectedSessionBlock.status}</Text>
                ) : null}
                <View style={styles.sessionNotice}>
                  <Ionicons name="lock-closed-outline" size={14} color="#5D667C" />
                  <Text style={styles.sessionNoticeText}>This block is reserved for a session</Text>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Slot?</Text>
            <Text style={styles.confirmBody}>
              Are you sure you want to remove this availability slot?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleDeleteSlot}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";
const GOLD = "#D4AF4A";
const HOUR_HEIGHT = 48;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850" },
  legend: {
    flexDirection: "row",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
    gap: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 13, color: "#5D667C" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  calendarContainer: { flexDirection: "row", padding: 8 },
  timeColumn: { width: 48, marginTop: 0 },
  timeLabel: { height: HOUR_HEIGHT, justifyContent: "flex-start", paddingTop: 2 },
  timeLabelText: { fontSize: 10, color: "#8C93A4", textAlign: "right", paddingRight: 4 },
  dayColumn: { width: 80, marginHorizontal: 2 },
  dayHeader: { height: 28, justifyContent: "center", alignItems: "center" },
  dayGrid: { position: "relative" },
  hourLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#E8EBF0",
  },
  slotBlock: {
    position: "absolute",
    left: 2,
    right: 2,
    backgroundColor: BLUE,
    borderRadius: 4,
    padding: 2,
    overflow: "hidden",
    opacity: 0.85,
  },
  slotText: { fontSize: 9, color: "#FFF", fontWeight: "600" },
  sessionBlock: {
    position: "absolute",
    left: 2,
    right: 2,
    backgroundColor: GOLD,
    borderRadius: 4,
    padding: 2,
    overflow: "hidden",
    opacity: 0.9,
  },
  sessionBlockText: { fontSize: 9, color: "#1B2D50", fontWeight: "600" },
  addDayBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2F3850" },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#3A4357", marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    marginRight: 8,
  },
  dayChipActive: { backgroundColor: BLUE },
  dayChipText: { fontSize: 14, color: "#5D667C" },
  dayChipTextActive: { color: "#FFF", fontWeight: "600" },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timePicker: { alignItems: "center", width: 60 },
  timePickerValue: { fontSize: 28, fontWeight: "700", color: NAVY, marginVertical: 4 },
  timeColon: { fontSize: 28, fontWeight: "700", color: NAVY, marginHorizontal: 8 },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: "#9CA3AF" },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Detail modal
  detailModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    margin: 32,
    alignItems: "center",
  },
  detailTitle: { fontSize: 18, fontWeight: "700", color: NAVY, marginBottom: 8 },
  detailDay: { fontSize: 16, color: "#5D667C", marginBottom: 4 },
  detailTime: { fontSize: 22, fontWeight: "700", color: BLUE, marginBottom: 16 },
  detailSubject: { fontSize: 16, fontWeight: "600", color: NAVY, marginBottom: 4 },
  detailTutor: { fontSize: 14, color: "#5D667C", marginBottom: 12 },
  sessionNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sessionNoticeText: { fontSize: 13, color: "#5D667C" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  deleteBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  // Confirm modal
  confirmModal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    margin: 32,
  },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: NAVY, marginBottom: 8 },
  confirmBody: { fontSize: 14, color: "#5D667C", marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: "row", gap: 12 },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 15, color: "#5D667C", fontWeight: "600" },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E74C3C",
    alignItems: "center",
  },
  confirmDeleteText: { fontSize: 15, color: "#FFF", fontWeight: "700" },
});