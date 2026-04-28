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
  TextInput,
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
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type SessionBlock = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  tutorName: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const HOUR_HEIGHT = 48;
const START_HOUR = 7;

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

// Parse "HH:MM" or "H:MM" into total minutes, returns null if invalid
function parseTimeInput(input: string): number | null {
  const clean = input.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export default function AvailabilityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState("09:00");
  const [endTimeInput, setEndTimeInput] = useState("10:00");
  const [sessionLabel, setSessionLabel] = useState("");
  const [tutorLabel, setTutorLabel] = useState("");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedSessionBlock, setSelectedSessionBlock] = useState<SessionBlock | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const availSlots = await api.get<AvailabilitySlot[]>("/availability/me");
      setSlots(availSlots);
    } catch {
      Alert.alert("Error", "Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAddModal = (day: number, isSession = false) => {
    setSelectedDay(day);
    setStartTimeInput("09:00");
    setEndTimeInput("10:00");
    setSessionLabel("");
    setTutorLabel("");
    setAddingSession(isSession);
    setShowAddModal(true);
  };

  const handleAddSlot = async () => {
    const startMin = parseTimeInput(startTimeInput);
    const endMin = parseTimeInput(endTimeInput);

    if (startMin === null) {
      Alert.alert("Invalid time", "Start time must be in HH:MM format (e.g. 09:00).");
      return;
    }
    if (endMin === null) {
      Alert.alert("Invalid time", "End time must be in HH:MM format (e.g. 10:00).");
      return;
    }
    if (startMin >= endMin) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }

    const sessionOverlap = sessionBlocks
      .filter((s) => s.day_of_week === selectedDay)
      .some((s) => {
        const sStart = timeToMinutes(s.start_time);
        const sEnd = timeToMinutes(s.end_time);
        return startMin < sEnd && endMin > sStart;
      });

    if (sessionOverlap) {
      Alert.alert("Conflict", "This time overlaps with an existing session block.");
      return;
    }

    const availOverlap = slots
      .filter((s) => s.day_of_week === selectedDay)
      .some((s) => {
        const sStart = timeToMinutes(s.start_time);
        const sEnd = timeToMinutes(s.end_time);
        return startMin < sEnd && endMin > sStart;
      });

    if (addingSession) {
      if (availOverlap) {
        Alert.alert("Conflict", "This session overlaps with an existing availability slot.");
        return;
      }
      setSessionBlocks((prev) => [
        ...prev,
        {
          id: Date.now(),
          day_of_week: selectedDay,
          start_time: minutesToTime(startMin),
          end_time: minutesToTime(endMin),
          subject: sessionLabel.trim() || "Tutoring Session",
          tutorName: tutorLabel.trim() || "Demo Tutor",
        },
      ]);
      setShowAddModal(false);
      return;
    }

    if (availOverlap) {
      Alert.alert(
        "Overlap Detected",
        "This slot overlaps with another availability slot. It will be shown in red.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Anyway",
            onPress: async () => {
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
            },
          },
        ]
      );
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

  const renderDayColumn = (dayIndex: number) => {
    const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
    const daySessionBlocks = sessionBlocks.filter((s) => s.day_of_week === dayIndex);

    const slotOverlapsSession = (slot: AvailabilitySlot) => {
      const sStart = timeToMinutes(slot.start_time);
      const sEnd = timeToMinutes(slot.end_time);
      return daySessionBlocks.some((b) => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return sStart < bEnd && sEnd > bStart;
      });
    };

    const slotOverlapsAvailability = (slot: AvailabilitySlot) => {
      return daySlots.some((other) => {
        if (other.id === slot.id) return false;
        const sStart = timeToMinutes(slot.start_time);
        const sEnd = timeToMinutes(slot.end_time);
        const oStart = timeToMinutes(other.start_time);
        const oEnd = timeToMinutes(other.end_time);
        return sStart < oEnd && sEnd > oStart;
      });
    };

    return (
      <View key={dayIndex} style={styles.dayColumn}>
        <Text style={styles.dayHeader}>{DAYS[dayIndex]}</Text>
        <View style={[styles.dayGrid, { height: HOURS.length * HOUR_HEIGHT }]}>
          {HOURS.map((h, i) => (
            <View key={h} style={[styles.hourLine, { top: i * HOUR_HEIGHT }]} />
          ))}

          {daySlots.map((slot) => {
            const startMin = timeToMinutes(slot.start_time);
            const endMin = timeToMinutes(slot.end_time);
            const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
            const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
            const hasConflict = slotOverlapsSession(slot) || slotOverlapsAvailability(slot);
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotBlock, { top, height }, hasConflict && styles.slotBlockConflict]}
                onPress={() => openSlotDetail(slot)}
              >
                <Text style={styles.slotText} numberOfLines={1}>
                  {hasConflict ? "⚠ " : ""}{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                </Text>
              </TouchableOpacity>
            );
          })}

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

          <TouchableOpacity
            style={styles.addDayBtn}
            onPress={() => openAddModal(dayIndex, false)}
          >
            <Ionicons name="add" size={14} color="#2E57A2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addSessionDayBtn}
            onPress={() => openAddModal(dayIndex, true)}
          >
            <Ionicons name="calendar" size={14} color="#D4AF4A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2E57A2" }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#D4AF4A" }]} />
          <Text style={styles.legendText}>Session</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#E74C3C" }]} />
          <Text style={styles.legendText}>Conflict</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="add" size={14} color="#2E57A2" />
          <Text style={styles.legendText}> Availability</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="calendar" size={14} color="#D4AF4A" />
          <Text style={styles.legendText}> Session</Text>
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
              <View style={styles.timeColumn}>
                <View style={{ height: 28 }} />
                {HOURS.map((h) => (
                  <View key={h} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText}>{formatHour(h)}</Text>
                  </View>
                ))}
              </View>
              {DAYS.map((_, i) => renderDayColumn(i))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowAddModal(false); setAddingSession(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {addingSession ? "Add Session Block" : "Add Availability"}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setAddingSession(false); }}>
                <Ionicons name="close" size={24} color="#5D667C" />
              </TouchableOpacity>
            </View>

            {addingSession && (
              <>
                <Text style={styles.modalLabel}>Subject / Class</Text>
                <TextInput
                  style={styles.labelInput}
                  placeholder="e.g. CS 180"
                  placeholderTextColor="#B0B6C3"
                  value={sessionLabel}
                  onChangeText={setSessionLabel}
                  autoCapitalize="characters"
                />
                <Text style={styles.modalLabel}>Tutor Name</Text>
                <TextInput
                  style={styles.labelInput}
                  placeholder="e.g. Alex Chen"
                  placeholderTextColor="#B0B6C3"
                  value={tutorLabel}
                  onChangeText={setTutorLabel}
                />
              </>
            )}

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

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.modalLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTimeInput}
                  onChangeText={setStartTimeInput}
                  placeholder="09:00"
                  placeholderTextColor="#B0B6C3"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={styles.timeHint}>HH:MM (24hr)</Text>
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.timeSeparatorText}>→</Text>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.modalLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTimeInput}
                  onChangeText={setEndTimeInput}
                  placeholder="10:00"
                  placeholderTextColor="#B0B6C3"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={styles.timeHint}>HH:MM (24hr)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, addingSession && styles.saveBtnSession, saving && styles.saveBtnDisabled]}
              onPress={handleAddSlot}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {addingSession ? "Add Session Block" : "Save Availability Slot"}
                </Text>
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
                  onPress={() => { setShowDetailModal(false); setShowDeleteConfirm(true); }}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850" },
  legend: {
    flexDirection: "row", padding: 12, paddingHorizontal: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
    gap: 12, flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: "#5D667C" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  calendarContainer: { flexDirection: "row", padding: 8 },
  timeColumn: { width: 48 },
  timeLabel: { height: HOUR_HEIGHT, justifyContent: "flex-start", paddingTop: 2 },
  timeLabelText: { fontSize: 10, color: "#8C93A4", textAlign: "right", paddingRight: 4 },
  dayColumn: { width: 80, marginHorizontal: 2 },
  dayHeader: { height: 28, textAlign: "center", fontSize: 13, fontWeight: "600", color: NAVY, paddingTop: 4 },
  dayGrid: { position: "relative" },
  hourLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#E8EBF0" },
  slotBlock: {
    position: "absolute", left: 2, right: 2,
    backgroundColor: BLUE, borderRadius: 4, padding: 2, overflow: "hidden", opacity: 0.85,
  },
  slotBlockConflict: { backgroundColor: "#E74C3C", opacity: 1 },
  slotText: { fontSize: 9, color: "#FFF", fontWeight: "600" },
  sessionBlock: {
    position: "absolute", left: 2, right: 2,
    backgroundColor: GOLD, borderRadius: 4, padding: 2, overflow: "hidden", opacity: 0.9,
  },
  sessionBlockText: { fontSize: 9, color: "#1B2D50", fontWeight: "600" },
  addDayBtn: {
    position: "absolute", bottom: 24, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
  },
  addSessionDayBtn: {
    position: "absolute", bottom: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#FFF8E7", alignItems: "center", justifyContent: "center",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2F3850" },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#3A4357", marginBottom: 8 },
  labelInput: {
    borderWidth: 1, borderColor: "#E1E5EE", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: NAVY,
    backgroundColor: "#FFF", marginBottom: 16,
  },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F2F5", marginRight: 8 },
  dayChipActive: { backgroundColor: BLUE },
  dayChipText: { fontSize: 14, color: "#5D667C" },
  dayChipTextActive: { color: "#FFF", fontWeight: "600" },
  timeRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20, gap: 8 },
  timeField: { flex: 1 },
  timeInput: {
    borderWidth: 1, borderColor: "#E1E5EE", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 22,
    fontWeight: "700", color: NAVY, textAlign: "center",
    backgroundColor: "#FAFBFC",
  },
  timeHint: { fontSize: 11, color: "#B0B6C3", textAlign: "center", marginTop: 4 },
  timeSeparator: { paddingTop: 36, alignItems: "center" },
  timeSeparatorText: { fontSize: 20, color: "#8C93A4" },
  saveBtn: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnSession: { backgroundColor: "#C9A23E" },
  saveBtnDisabled: { backgroundColor: "#9CA3AF" },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  detailModalContent: {
    backgroundColor: "#FFF", borderRadius: 16, padding: 24, margin: 32, alignItems: "center",
  },
  detailTitle: { fontSize: 18, fontWeight: "700", color: NAVY, marginBottom: 8 },
  detailDay: { fontSize: 16, color: "#5D667C", marginBottom: 4 },
  detailTime: { fontSize: 22, fontWeight: "700", color: BLUE, marginBottom: 16 },
  detailSubject: { fontSize: 16, fontWeight: "600", color: NAVY, marginBottom: 4 },
  detailTutor: { fontSize: 14, color: "#5D667C", marginBottom: 12 },
  sessionNotice: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F5F6F8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6,
  },
  sessionNoticeText: { fontSize: 13, color: "#5D667C" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E74C3C", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  deleteBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  confirmModal: { backgroundColor: "#FFF", borderRadius: 16, padding: 24, margin: 32 },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: NAVY, marginBottom: 8 },
  confirmBody: { fontSize: 14, color: "#5D667C", marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: "row", gap: 12 },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#E1E5EE", alignItems: "center",
  },
  confirmCancelText: { fontSize: 15, color: "#5D667C", fontWeight: "600" },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#E74C3C", alignItems: "center" },
  confirmDeleteText: { fontSize: 15, color: "#FFF", fontWeight: "700" },
});