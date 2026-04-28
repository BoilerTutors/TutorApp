import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  "Student Dashboard": undefined;
  "Report Tutor": { tutorId: number; tutorName: string; sessionId?: number };
};

type SessionWithTutor = {
  id: number;
  tutor_id: number;
  tutorName: string;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
  cost_cents: number;
  notes: string | null;
  status: string;
  purchased_at: string;
};

const DEMO_SESSIONS: SessionWithTutor[] = [
  {
    id: 1, tutor_id: 1, tutorName: "Alex Chen", subject: "CS 180",
    scheduled_start: "2026-03-05T14:00:00Z", scheduled_end: "2026-03-05T15:00:00Z",
    cost_cents: 1500, notes: "Helped with recursion and object-oriented concepts.",
    status: "completed", purchased_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 2, tutor_id: 2, tutorName: "Jordan Smith", subject: "MA 265",
    scheduled_start: "2026-03-10T10:00:00Z", scheduled_end: "2026-03-10T11:30:00Z",
    cost_cents: 1800, notes: "Linear algebra exam prep, eigenvalues and matrix operations.",
    status: "completed", purchased_at: "2026-03-07T00:00:00Z",
  },
  {
    id: 3, tutor_id: 1, tutorName: "Alex Chen", subject: "CS 251",
    scheduled_start: "2026-03-15T16:00:00Z", scheduled_end: "2026-03-15T17:00:00Z",
    cost_cents: 1500, notes: null,
    status: "completed", purchased_at: "2026-03-12T00:00:00Z",
  },
  {
    id: 4, tutor_id: 3, tutorName: "Maya Patel", subject: "PHYS 172",
    scheduled_start: "2026-03-20T13:00:00Z", scheduled_end: "2026-03-20T14:00:00Z",
    cost_cents: 1200, notes: null,
    status: "cancelled", purchased_at: "2026-03-17T00:00:00Z",
  },
  {
    id: 5, tutor_id: 2, tutorName: "Jordan Smith", subject: "MA 162",
    scheduled_start: "2026-03-25T09:00:00Z", scheduled_end: "2026-03-25T10:00:00Z",
    cost_cents: 1200, notes: "Integral calculus review before midterm.",
    status: "completed", purchased_at: "2026-03-22T00:00:00Z",
  },
  {
    id: 6, tutor_id: 4, tutorName: "Chris Thompson", subject: "CS 354",
    scheduled_start: "2026-03-28T15:00:00Z", scheduled_end: "2026-03-28T16:30:00Z",
    cost_cents: 1800, notes: "Operating systems concepts, memory management.",
    status: "completed", purchased_at: "2026-03-25T00:00:00Z",
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${mins}m`;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#1F7A4C",
  cancelled: "#E74C3C",
  pending: "#D4AF4A",
  confirmed: "#2E57A2",
};

export default function SessionHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tutorSearch, setTutorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = DEMO_SESSIONS;
    if (tutorSearch.trim()) {
      result = result.filter((s) =>
        s.tutorName.toLowerCase().includes(tutorSearch.trim().toLowerCase())
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((s) => new Date(s.scheduled_start) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      result = result.filter((s) => new Date(s.scheduled_start) <= to);
    }
    return result;
  }, [tutorSearch, dateFrom, dateTo]);

  const totalSpent = useMemo(
    () => filtered.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.cost_cents, 0),
    [filtered]
  );

  const completedCount = useMemo(
    () => filtered.filter((s) => s.status === "completed").length,
    [filtered]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <TouchableOpacity onPress={() => setShowFilters((v) => !v)} style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={22} color={showFilters ? BLUE : "#5D667C"} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Total Sessions</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: BLUE }]}>{formatCost(totalSpent)}</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#8C93A4" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by tutor name..."
              placeholderTextColor="#B0B6C3"
              value={tutorSearch}
              onChangeText={setTutorSearch}
              autoCapitalize="none"
            />
            {tutorSearch.length > 0 && (
              <Pressable onPress={() => setTutorSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#8C93A4" />
              </Pressable>
            )}
          </View>
          <View style={styles.dateFilters}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>From</Text>
              <TextInput
                style={styles.dateField}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B0B6C3"
                value={dateFrom}
                onChangeText={setDateFrom}
              />
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>To</Text>
              <TextInput
                style={styles.dateField}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B0B6C3"
                value={dateTo}
                onChangeText={setDateTo}
              />
            </View>
          </View>
          {(tutorSearch || dateFrom || dateTo) && (
            <TouchableOpacity
              onPress={() => { setTutorSearch(""); setDateFrom(""); setDateTo(""); }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#CCD1DC" />
            <Text style={styles.emptyText}>No sessions match your filters</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or date range</Text>
          </View>
        ) : (
          filtered.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.tutorName}>{session.tutorName}</Text>
                  <Text style={styles.subject}>{session.subject}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[session.status]}20` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[session.status] ?? "#5D667C" }]}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#8C93A4" />
                  <Text style={styles.detailText}>{formatDate(session.scheduled_start)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color="#8C93A4" />
                  <Text style={styles.detailText}>{formatDuration(session.scheduled_start, session.scheduled_end)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={14} color="#8C93A4" />
                  <Text style={styles.detailText}>{formatCost(session.cost_cents)}</Text>
                </View>
              </View>

              {session.notes ? (
                <Text style={styles.notes} numberOfLines={2}>{session.notes}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => navigation.navigate("Report Tutor", {
                  tutorId: session.tutor_id,
                  tutorName: session.tutorName,
                  sessionId: session.id,
                })}
              >
                <Ionicons name="flag-outline" size={14} color="#E74C3C" />
                <Text style={styles.reportBtnText}>Report Tutor</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850" },
  filterIconBtn: { padding: 4 },
  summaryCard: {
    flexDirection: "row", backgroundColor: "#FFF", padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "700", color: NAVY },
  summaryLabel: { fontSize: 12, color: "#8C93A4", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#E8EBF0", marginVertical: 4 },
  filtersContainer: {
    backgroundColor: "#FFF", padding: 12,
    borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F5F6F8",
    borderRadius: 8, paddingHorizontal: 10, height: 38, marginBottom: 10,
    borderWidth: 1, borderColor: "#E1E5EE",
  },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 14, color: NAVY },
  dateFilters: { flexDirection: "row", gap: 10 },
  dateInput: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#5D667C", marginBottom: 4, fontWeight: "600" },
  dateField: {
    backgroundColor: "#F5F6F8", borderRadius: 8, paddingHorizontal: 10,
    height: 36, fontSize: 13, color: NAVY, borderWidth: 1, borderColor: "#E1E5EE",
  },
  clearBtn: { marginTop: 8, alignSelf: "flex-end" },
  clearBtnText: { fontSize: 13, color: BLUE, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#5D667C" },
  emptySubtext: { marginTop: 4, fontSize: 14, color: "#8C93A4", textAlign: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sessionCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#E1E5EE",
  },
  sessionTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 12,
  },
  sessionInfo: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: "700", color: NAVY },
  subject: { fontSize: 14, color: BLUE, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  sessionDetails: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 13, color: "#5D667C" },
  notes: { marginTop: 10, fontSize: 13, color: "#8C93A4", fontStyle: "italic" },
  reportBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 12, alignSelf: "flex-end",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  reportBtnText: { fontSize: 13, color: "#E74C3C", fontWeight: "600" },
});