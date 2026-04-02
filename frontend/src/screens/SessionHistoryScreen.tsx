import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
};

type TutoringSessionPublic = {
  id: number;
  tutor_id: number;
  student_id: number;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
  cost_cents: number;
  notes: string | null;
  status: string;
  purchased_at: string;
};

type SessionWithTutor = TutoringSessionPublic & { tutorName: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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
  const [sessions, setSessions] = useState<SessionWithTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorSearch, setTutorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const raw = await api.get<TutoringSessionPublic[]>("/sessions/student/past");

        // Fetch unique tutor names
        const uniqueTutorIds = Array.from(new Set(raw.map((s) => s.tutor_id)));
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
        const nameById = new Map<number, string>(tutorNamePairs);

        setSessions(raw.map((s) => ({ ...s, tutorName: nameById.get(s.tutor_id) ?? `Tutor #${s.tutor_id}` })));
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    let result = sessions;
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
  }, [sessions, tutorSearch, dateFrom, dateTo]);

  const totalSpent = useMemo(
    () => filtered.reduce((sum, s) => sum + s.cost_cents, 0),
    [filtered]
  );

  const completedCount = useMemo(
    () => filtered.filter((s) => s.status === "completed").length,
    [filtered]
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <TouchableOpacity onPress={() => setShowFilters((v) => !v)} style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={22} color={showFilters ? BLUE : "#5D667C"} />
        </TouchableOpacity>
      </View>

      {/* Payment Summary */}
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

      {/* Filters */}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#CCD1DC" />
          <Text style={styles.emptyText}>
            {sessions.length === 0 ? "No past sessions" : "No sessions match your filters"}
          </Text>
          <Text style={styles.emptySubtext}>
            {sessions.length === 0
              ? "Your completed sessions will appear here"
              : "Try adjusting your search or date range"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filtered.map((session) => (
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
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

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
  filterIconBtn: { padding: 4 },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "700", color: NAVY },
  summaryLabel: { fontSize: 12, color: "#8C93A4", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#E8EBF0", marginVertical: 4 },
  filtersContainer: {
    backgroundColor: "#FFF",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 14, color: NAVY },
  dateFilters: { flexDirection: "row", gap: 10 },
  dateInput: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#5D667C", marginBottom: 4, fontWeight: "600" },
  dateField: {
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 13,
    color: NAVY,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  clearBtn: { marginTop: 8, alignSelf: "flex-end" },
  clearBtnText: { fontSize: 13, color: BLUE, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#5D667C" },
  emptySubtext: { marginTop: 4, fontSize: 14, color: "#8C93A4", textAlign: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sessionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  sessionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sessionInfo: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: "700", color: NAVY },
  subject: { fontSize: 14, color: BLUE, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  sessionDetails: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 13, color: "#5D667C" },
  notes: { marginTop: 10, fontSize: 13, color: "#8C93A4", fontStyle: "italic" },
});