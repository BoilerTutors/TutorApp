import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SessionCard, { type Session } from "../components/SessionCard";
import { api } from "../api/client";
import type { TutoringSession } from "../types/models";

const PAGE_SIZE = 10;

type SortOption = "recent" | "oldest" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Most Recent",
  oldest: "Oldest",
  name: "Name (A–Z)",
};

const FALLBACK_PAST_SESSIONS: Session[] = [
  { id: 101, studentName: "Emma D.", subject: "Chemistry", date: "Monday, Apr 22", startTime: "10:00 AM", endTime: "11:00 AM", duration: "1 hour", status: "completed" },
  { id: 102, studentName: "Liam P.", subject: "Linear Algebra", date: "Sunday, Apr 21", startTime: "3:00 PM", endTime: "4:00 PM", duration: "1 hour", status: "completed" },
  { id: 103, studentName: "Sophia R.", subject: "Data Structures", date: "Saturday, Apr 20", startTime: "1:00 PM", endTime: "2:30 PM", duration: "1.5 hours", status: "completed" },
  { id: 104, studentName: "Noah K.", subject: "Physics II", date: "Friday, Apr 19", startTime: "11:00 AM", endTime: "12:00 PM", duration: "1 hour", status: "completed" },
  { id: 105, studentName: "Olivia M.", subject: "Organic Chemistry", date: "Thursday, Apr 18", startTime: "2:00 PM", endTime: "3:00 PM", duration: "1 hour", status: "completed" },
  { id: 106, studentName: "Aiden T.", subject: "Calculus III", date: "Wednesday, Apr 17", startTime: "9:00 AM", endTime: "10:00 AM", duration: "1 hour", status: "completed" },
  { id: 107, studentName: "Isabella C.", subject: "Statistics", date: "Tuesday, Apr 16", startTime: "4:00 PM", endTime: "5:00 PM", duration: "1 hour", status: "completed" },
  { id: 108, studentName: "Mason W.", subject: "Discrete Math", date: "Monday, Apr 15", startTime: "10:00 AM", endTime: "11:30 AM", duration: "1.5 hours", status: "completed" },
  { id: 109, studentName: "Ava J.", subject: "Biology", date: "Sunday, Apr 14", startTime: "1:00 PM", endTime: "2:00 PM", duration: "1 hour", status: "completed" },
  { id: 110, studentName: "Ethan B.", subject: "Computer Architecture", date: "Saturday, Apr 13", startTime: "3:00 PM", endTime: "4:30 PM", duration: "1.5 hours", status: "completed" },
  { id: 111, studentName: "Charlotte L.", subject: "Differential Equations", date: "Friday, Apr 12", startTime: "11:00 AM", endTime: "12:00 PM", duration: "1 hour", status: "completed" },
  { id: 112, studentName: "James H.", subject: "Thermodynamics", date: "Thursday, Apr 11", startTime: "2:00 PM", endTime: "3:00 PM", duration: "1 hour", status: "completed" },
  { id: 113, studentName: "Amelia F.", subject: "Probability", date: "Wednesday, Apr 10", startTime: "9:00 AM", endTime: "10:00 AM", duration: "1 hour", status: "completed" },
  { id: 114, studentName: "Benjamin G.", subject: "Operating Systems", date: "Tuesday, Apr 9", startTime: "4:00 PM", endTime: "5:30 PM", duration: "1.5 hours", status: "completed" },
  { id: 115, studentName: "Mia N.", subject: "Algorithms", date: "Monday, Apr 8", startTime: "10:00 AM", endTime: "11:00 AM", duration: "1 hour", status: "completed" },
  { id: 116, studentName: "Lucas V.", subject: "Calculus I", date: "Sunday, Apr 7", startTime: "1:00 PM", endTime: "2:00 PM", duration: "1 hour", status: "completed" },
  { id: 117, studentName: "Harper S.", subject: "English Composition", date: "Saturday, Apr 6", startTime: "3:00 PM", endTime: "4:00 PM", duration: "1 hour", status: "completed" },
  { id: 118, studentName: "Alexander Q.", subject: "Microeconomics", date: "Friday, Apr 5", startTime: "11:00 AM", endTime: "12:00 PM", duration: "1 hour", status: "completed" },
  { id: 119, studentName: "Evelyn Z.", subject: "Genetics", date: "Thursday, Apr 4", startTime: "2:00 PM", endTime: "3:30 PM", duration: "1.5 hours", status: "completed" },
  { id: 120, studentName: "Daniel X.", subject: "Signals & Systems", date: "Wednesday, Apr 3", startTime: "9:00 AM", endTime: "10:00 AM", duration: "1 hour", status: "completed" },
  { id: 121, studentName: "Abigail A.", subject: "Abstract Algebra", date: "Tuesday, Apr 2", startTime: "4:00 PM", endTime: "5:00 PM", duration: "1 hour", status: "completed" },
  { id: 122, studentName: "Ryan S.", subject: "Calculus II", date: "Monday, Apr 1", startTime: "10:00 AM", endTime: "11:00 AM", duration: "1 hour", status: "completed" },
  { id: 123, studentName: "Emily O.", subject: "Machine Learning", date: "Sunday, Mar 31", startTime: "1:00 PM", endTime: "2:30 PM", duration: "1.5 hours", status: "completed" },
  { id: 124, studentName: "John D.", subject: "Physics", date: "Saturday, Mar 30", startTime: "3:00 PM", endTime: "4:00 PM", duration: "1 hour", status: "completed" },
  { id: 125, studentName: "Grace I.", subject: "Biochemistry", date: "Friday, Mar 29", startTime: "11:00 AM", endTime: "12:00 PM", duration: "1 hour", status: "completed" },
];

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = Math.max(0, end.getTime() - start.getTime());
  const minutes = Math.round(ms / 60000);
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} min`;
}

function formatSessionDateParts(startIso: string, endIso: string): {
  date: string;
  startTime: string;
  endTime: string;
} {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, startTime, endTime };
}

function mapBackendStatusToCardStatus(
  status: TutoringSession["status"]
): Session["status"] {
  return status;
}

function sortSessions(sessions: Session[], sort: SortOption): Session[] {
  const copy = [...sessions];
  const toEpoch = (s: Session) => {
    const d = new Date(`${s.date} ${s.startTime}`);
    return Number.isNaN(d.getTime()) ? s.id : d.getTime();
  };
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => toEpoch(a) - toEpoch(b));
    case "name":
      return copy.sort((a, b) => a.studentName.localeCompare(b.studentName));
    default:
      return copy.sort((a, b) => toEpoch(b) - toEpoch(a));
  }
}

export default function TutorPastSessionsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pastSessions, setPastSessions] = useState<Session[]>(FALLBACK_PAST_SESSIONS);

  useEffect(() => {
    let mounted = true;
    const loadPastSessions = async () => {
      try {
        const raw = await api.get<TutoringSession[]>("/sessions/tutor/past");

        const uniqueStudentIds = Array.from(new Set(raw.map((s) => s.student_id)));
        const studentLookupPairs = await Promise.all(
          uniqueStudentIds.map(async (id) => {
            try {
              const user = await api.get<{ first_name: string; last_name: string }>(
                `/users/${id}`
              );
              return [id, `${user.first_name} ${user.last_name}`.trim()] as const;
            } catch {
              return [id, `Student #${id}`] as const;
            }
          })
        );
        const studentNameById = new Map<number, string>(studentLookupPairs);

        const mapped: Session[] = raw.map((s) => {
          const parts = formatSessionDateParts(s.scheduled_start, s.scheduled_end);
          return {
            id: s.id,
            studentName: studentNameById.get(s.student_id) ?? `Student #${s.student_id}`,
            subject: s.subject,
            date: parts.date,
            startTime: parts.startTime,
            endTime: parts.endTime,
            duration: formatDuration(s.scheduled_start, s.scheduled_end),
            status: mapBackendStatusToCardStatus(s.status),
          };
        });

        if (mounted && mapped.length > 0) {
          setPastSessions(mapped);
        }
      } catch {
        // Keep fallback placeholders if API call fails.
      }
    };

    void loadPastSessions();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pastSessions;
    return pastSessions.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q)
    );
  }, [pastSessions, searchQuery]);

  const sorted = useMemo(() => sortSessions(filtered, sortBy), [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(safePage));
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    setPageInput("1");
  };

  const handleSortSelect = (option: SortOption) => {
    setSortBy(option);
    setSortModalVisible(false);
    setPage(1);
    setPageInput("1");
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Search + Sort Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#8C93A4" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#A0A7B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#8C93A4" />
            </Pressable>
          )}
        </View>
        <Pressable
          style={styles.sortBtn}
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="swap-vertical" size={16} color="#FFF" />
          <Text style={styles.sortBtnText}>Sort</Text>
        </Pressable>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.modalOption,
                  sortBy === option && styles.modalOptionActive,
                ]}
                onPress={() => handleSortSelect(option)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sortBy === option && styles.modalOptionTextActive,
                  ]}
                >
                  {SORT_LABELS[option]}
                </Text>
                {sortBy === option && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Results Count */}
      <Text style={styles.resultsText}>
        {sorted.length} session{sorted.length !== 1 ? "s" : ""}
        {searchQuery ? ` matching "${searchQuery}"` : ""}
      </Text>

      {/* Session Cards */}
      {pageItems.length > 0 ? (
        pageItems.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))
      ) : (
        <Text style={styles.emptyText}>No sessions found.</Text>
      )}

      {/* Pagination */}
      {sorted.length > PAGE_SIZE && (
        <View style={styles.paginationRow}>
          <Pressable
            style={[styles.pageArrow, safePage <= 1 && styles.pageArrowDisabled]}
            onPress={() => goToPage(safePage - 1)}
            disabled={safePage <= 1}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={safePage <= 1 ? "#C0C5D0" : NAVY}
            />
          </Pressable>

          <View style={styles.pageInputWrap}>
            <TextInput
              style={styles.pageInput}
              value={pageInput}
              onChangeText={setPageInput}
              onSubmitEditing={handlePageInputSubmit}
              onBlur={handlePageInputSubmit}
              keyboardType="number-pad"
              returnKeyType="go"
              selectTextOnFocus
            />
          </View>

          <Text style={styles.pageLabel}>of {totalPages}</Text>

          <Pressable
            style={[
              styles.pageArrow,
              safePage >= totalPages && styles.pageArrowDisabled,
            ]}
            onPress={() => goToPage(safePage + 1)}
            disabled={safePage >= totalPages}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={safePage >= totalPages ? "#C0C5D0" : NAVY}
            />
          </Pressable>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const NAVY = "#1B2D50";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 16,
  },

  // Search + Sort
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: NAVY,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    gap: 5,
  },
  sortBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 20,
    width: "75%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 14,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: NAVY,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
  },
  modalOptionTextActive: {
    color: "#FFF",
  },

  // Results
  resultsText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },

  // Pagination
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 10,
  },
  pageArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  pageArrowDisabled: {
    opacity: 0.5,
  },
  pageInputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 8,
    backgroundColor: "#FFF",
    width: 48,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  pageInput: {
    fontSize: 14,
    fontWeight: "600",
    color: NAVY,
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },
  pageLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  bottomSpacer: {
    height: 30,
  },
});
