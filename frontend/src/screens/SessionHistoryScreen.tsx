import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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

type SessionNote = {
  id: number;
  session_id: number;
  tutor_id: number;
  student_id: number;
  content: string;
  subject: string;
  created_at: string;
  updated_at: string;
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
  const [tutorNotes, setTutorNotes] = useState<Map<number, SessionNote | null>>(new Map());
  const [favoritedTutorIds, setFavoritedTutorIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tutorSearch, setTutorSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<number>>(new Set());

  const loadSessionsAndExtras = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.get<TutoringSessionPublic[]>("/sessions/student/past");

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
      const sessionsWithTutor = raw.map((s) => ({
        ...s,
        tutorName: nameById.get(s.tutor_id) ?? `Tutor #${s.tutor_id}`,
      }));
      setSessions(sessionsWithTutor);

      // Tutor notes for completed sessions
      const completed = sessionsWithTutor.filter((s) => s.status === "completed");
      const notePairs = await Promise.all(
        completed.map(async (s) => {
          try {
            const note = await api.get<SessionNote | null>(`/session-notes/${s.id}`);
            return [s.id, note] as const;
          } catch {
            return [s.id, null] as const;
          }
        })
      );
      setTutorNotes(new Map(notePairs));

      // Favorite status for each unique tutor
      const favPairs = await Promise.all(
        uniqueTutorIds.map(async (id) => {
          try {
            const result = await api.get<{ is_favorited: boolean }>(`/favorites/me/check/${id}`);
            return [id, result.is_favorited] as const;
          } catch {
            return [id, false] as const;
          }
        })
      );
      const favSet = new Set<number>();
      favPairs.forEach(([id, isFav]) => {
        if (isFav) favSet.add(id);
      });
      setFavoritedTutorIds(favSet);
    } catch {
      setSessions([]);
      setTutorNotes(new Map());
      setFavoritedTutorIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessionsAndExtras();
  }, [loadSessionsAndExtras]);

  useFocusEffect(
    useCallback(() => {
      void loadSessionsAndExtras();
    }, [loadSessionsAndExtras])
  );

  const toggleNoteExpanded = (sessionId: number) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleFavorite = async (tutorId: number, tutorName: string) => {
    const isFav = favoritedTutorIds.has(tutorId);
    // Optimistic update
    setFavoritedTutorIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(tutorId);
      else next.add(tutorId);
      return next;
    });
    try {
      if (isFav) {
        await api.delete(`/favorites/${tutorId}`);
      } else {
        await api.post(`/favorites/${tutorId}`, {});
      }
    } catch (e) {
      // Revert on failure
      setFavoritedTutorIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(tutorId);
        else next.delete(tutorId);
        return next;
      });
      const message = e instanceof Error ? e.message : "Failed to update favorites";
      Alert.alert("Error", message);
    }
  };

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
          {filtered.map((session) => {
            const tutorNote = tutorNotes.get(session.id) ?? null;
            const isExpanded = expandedNoteIds.has(session.id);
            const showTutorNotesSection = session.status === "completed";
            const isFavorited = favoritedTutorIds.has(session.tutor_id);

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View style={styles.sessionInfo}>
                    <View style={styles.tutorRow}>
                      <Text style={styles.tutorName}>{session.tutorName}</Text>
                      <Pressable
                        onPress={() => toggleFavorite(session.tutor_id, session.tutorName)}
                        hitSlop={10}
                        style={styles.favBtn}
                      >
                        <Ionicons
                          name={isFavorited ? "heart" : "heart-outline"}
                          size={20}
                          color={isFavorited ? "#E74C3C" : "#8C93A4"}
                        />
                      </Pressable>
                    </View>
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

                {showTutorNotesSection && (
                  <Pressable
                    style={styles.tutorNotesSection}
                    onPress={() => tutorNote && toggleNoteExpanded(session.id)}
                  >
                    <View style={styles.tutorNotesHeader}>
                      <Ionicons name="document-text-outline" size={14} color={BLUE} />
                      <Text style={styles.tutorNotesLabel}>Notes from your tutor</Text>
                      {tutorNote ? (
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color="#8C93A4"
                        />
                      ) : null}
                    </View>
                    {tutorNote ? (
                      <Text style={styles.tutorNotesContent} numberOfLines={isExpanded ? undefined : 3}>
                        {tutorNote.content}
                      </Text>
                    ) : (
                      <Text style={styles.tutorNotesEmpty}>
                        Your tutor hasn't added notes for this session yet.
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
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
  tutorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tutorName: { fontSize: 16, fontWeight: "700", color: NAVY },
  favBtn: { padding: 2 },
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
  tutorNotesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8EBF0",
  },
  tutorNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  tutorNotesLabel: { fontSize: 12, fontWeight: "700", color: BLUE, flex: 1 },
  tutorNotesContent: { fontSize: 13, color: "#374151", lineHeight: 19 },
  tutorNotesEmpty: { fontSize: 13, color: "#8C93A4", fontStyle: "italic" },
});