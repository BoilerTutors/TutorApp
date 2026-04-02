import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "../api/client";
import ViewProfileModal from "../components/ViewProfileModal";

type MatchItem = {
  rank: number;
  tutor_id: number;
  tutor_profile_id: number | null;
  tutor_first_name: string;
  tutor_last_name: string;
  tutor_major: string | null;
  tutor_hourly_rate_cents?: number | null;
  similarity_score: number;
};
type TutorClassLite = {
  class_id: number;
  course_code: string;
};
type TutorProfileLookup = {
  id: number;
  classes_tutoring?: TutorClassLite[];
};
type ClassPublic = {
  id: number;
  subject: string;
  class_number: number;
};
type ClassFilterOption = {
  classId: number;
  label: string;
};
type ClassSearchItem = {
  id: number;
  label: string;
};
type UserLookup = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};
type RootStackParamList = {
  Matches: { matches?: MatchItem[] } | undefined;
  Messenger:
    | {
        openTutorUserId?: number;
        openTutorName?: string;
      }
    | undefined;
};

export default function MatchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Matches">>();
  const initialMatches = route.params?.matches ?? [];

  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [loading, setLoading] = useState(initialMatches.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [matchingTutorIds, setMatchingTutorIds] = useState<Record<number, boolean>>({});
  const [matchedTutorIds, setMatchedTutorIds] = useState<Record<number, boolean>>({});
  const [tutorEmailsById, setTutorEmailsById] = useState<Record<number, string>>({});
  const [tutorClassesByTutorUserId, setTutorClassesByTutorUserId] = useState<
    Record<number, TutorClassLite[]>
  >({});
  const [classCatalog, setClassCatalog] = useState<ClassSearchItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassFilterOption | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null);

  const loadTutorEmails = async (rows: MatchItem[]) => {
    const uniqueTutorIds = Array.from(new Set(rows.map((row) => row.tutor_id)));
    if (uniqueTutorIds.length === 0) {
      setTutorEmailsById({});
      return;
    }
    const pairs = await Promise.all(
      uniqueTutorIds.map(async (id) => {
        try {
          const user = await api.get<UserLookup>(`/users/${id}`);
          return [id, user.email] as const;
        } catch {
          return [id, ""] as const;
        }
      })
    );
    const next: Record<number, string> = {};
    for (const [id, email] of pairs) {
      next[id] = email;
    }
    setTutorEmailsById(next);
  };

  const loadClassCatalog = async () => {
    try {
      const classRows = await api.get<ClassPublic[]>("/classes/?limit=500");
      const mapped = classRows.map((row) => ({
        id: row.id,
        label: `${row.subject} ${row.class_number}`,
      }));
      mapped.sort((a, b) => a.label.localeCompare(b.label));
      setClassCatalog(mapped);
    } catch {
      setClassCatalog([]);
    }
  };

  const loadTutorClasses = async (rows: MatchItem[]) => {
    const tutorsWithProfile = rows.filter((row) => row.tutor_profile_id != null);
    if (tutorsWithProfile.length === 0) {
      setTutorClassesByTutorUserId({});
      return;
    }

    const pairs = await Promise.all(
      tutorsWithProfile.map(async (row) => {
        try {
          const profile = await api.get<TutorProfileLookup>(`/tutors/${row.tutor_profile_id}`);
          return [row.tutor_id, profile.classes_tutoring ?? []] as const;
        } catch {
          return [row.tutor_id, [] as TutorClassLite[]] as const;
        }
      })
    );

    const next: Record<number, TutorClassLite[]> = {};
    for (const [tutorId, classes] of pairs) {
      next[tutorId] = classes;
    }
    setTutorClassesByTutorUserId(next);
  };

  const selectedClassId = selectedClass?.classId ?? null;
  const selectedClassLabel = selectedClass?.label ?? null;

  const classSuggestions = useMemo(() => {
    const q = classSearchQuery.trim().toLowerCase();
    if (!q) {
      return classCatalog.slice(0, 8);
    }
    return classCatalog
      .filter((row) => row.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [classCatalog, classSearchQuery]);

  const loadLatestMatches = async (classId: number | null = selectedClassId) => {
    try {
      const path =
        classId != null ? `/matches/me/refresh?class_id=${classId}` : "/matches/me/refresh";
      const data = await api.post<MatchItem[]>(path);
      setMatches(data);
      await Promise.all([loadTutorEmails(data), loadTutorClasses(data)]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSavedMatches = async () => {
    try {
      const saved = await api.get<MatchItem[]>("/matches/me");
      const next: Record<number, boolean> = {};
      for (const row of saved) {
        next[row.tutor_id] = true;
      }
      setMatchedTutorIds(next);
    } catch {
      // Ignore silently; candidate list can still be shown.
    }
  };

  const handleSelectMatch = async (item: MatchItem) => {
    setMatchingTutorIds((prev) => ({ ...prev, [item.tutor_id]: true }));
    try {
      const saved = await api.post<MatchItem[]>("/matches/me/select", {
        tutor_id: item.tutor_id,
        class_id: selectedClassId,
      });
      const next: Record<number, boolean> = {};
      for (const row of saved) {
        next[row.tutor_id] = true;
      }
      setMatchedTutorIds(next);
      navigation.navigate("Messenger", {
        openTutorUserId: item.tutor_id,
        openTutorName: `${item.tutor_first_name} ${item.tutor_last_name}`,
      });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save selected match");
    } finally {
      setMatchingTutorIds((prev) => ({ ...prev, [item.tutor_id]: false }));
    }
  };

  const handleOpenProfile = (userId: number) => {
    setSelectedProfileUserId(userId);
    setProfileModalVisible(true);
  };

  useEffect(() => {
    if (initialMatches.length > 0) {
      void Promise.all([loadTutorEmails(initialMatches), loadTutorClasses(initialMatches)]);
    }
    void loadClassCatalog();
    void loadSavedMatches();
    if (initialMatches.length === 0) {
      void loadLatestMatches(null);
    }
  }, [initialMatches.length]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E57A2" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  if (matches.length === 0 && selectedClassId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyBody}>Go back and calculate matches first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => `${item.rank}-${item.tutor_id}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by class</Text>
            <TextInput
              value={classSearchQuery}
              onChangeText={(text) => {
                setClassSearchQuery(text);
                setShowClassSuggestions(true);
              }}
              onFocus={() => {
                setShowClassSuggestions(true);
              }}
              placeholder="Type class (e.g., CS 180)"
              style={styles.filterInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {showClassSuggestions && classSuggestions.length > 0 ? (
              <View style={styles.suggestionsContainer}>
                {classSuggestions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      const picked = { classId: option.id, label: option.label };
                      setSelectedClass(picked);
                      setClassSearchQuery(option.label);
                      setShowClassSuggestions(false);
                      void loadLatestMatches(option.id);
                    }}
                  >
                    <Text style={styles.suggestionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {selectedClassLabel ? (
              <Pressable
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedClass(null);
                  setClassSearchQuery("");
                  setShowClassSuggestions(false);
                  void loadLatestMatches(null);
                }}
              >
                <Text style={styles.clearFilterBtnText}>Clear filter</Text>
              </Pressable>
            ) : null}
            {selectedClassLabel && matches.length === 0 ? (
              <Text style={styles.filterHint}>
                No tutors found for {selectedClassLabel}. Try another class.
              </Text>
            ) : null}
          </View>
        }
        onRefresh={() => {
          setRefreshing(true);
          void loadLatestMatches(selectedClassId);
        }}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.rank}>#{item.rank}</Text>
              <Text style={styles.score}>{(item.similarity_score * 100).toFixed(1)}%</Text>
            </View>
            <Text style={styles.name}>{item.tutor_first_name} {item.tutor_last_name}</Text>
            <Text style={styles.meta}>Tutor ID: {item.tutor_profile_id ?? "—"}</Text>
            {/* TESTING ONLY: easy to remove once no longer needed */}
            <Text style={styles.meta}>Tutor Email: {tutorEmailsById[item.tutor_id] || "—"}</Text>
            <Text style={styles.meta}>Major: {item.tutor_major || "—"}</Text>
            <Text style={styles.meta}>
              Rate:{" "}
              {item.tutor_hourly_rate_cents != null
                ? `$${(item.tutor_hourly_rate_cents / 100).toFixed(2)}/hr`
                : "—"}
            </Text>
            <Text style={styles.meta}>
              Classes:{" "}
              {(tutorClassesByTutorUserId[item.tutor_id] ?? [])
                .map((c) => c.course_code)
                .join(", ") || "—"}
            </Text>
            {selectedClassId != null ? (
              <Text style={styles.filteredClassMeta}>
                Filtered class match: {selectedClassLabel ?? `Class ${selectedClassId}`}
              </Text>
            ) : null}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, styles.viewProfileBtn]}
                onPress={() => {
                  handleOpenProfile(item.tutor_id);
                }}
              >
                <Text style={[styles.actionBtnText, styles.viewProfileBtnText]}>View Profile</Text>
              </Pressable>
              {(() => {
                const isMatched = !!matchedTutorIds[item.tutor_id];
                const isMatching = !!matchingTutorIds[item.tutor_id];
                return (
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.matchBtn,
                  isMatched && styles.matchBtnMatched,
                ]}
                onPress={() => {
                  void handleSelectMatch(item);
                }}
                disabled={isMatching || isMatched}
              >
                <Text style={[styles.actionBtnText, isMatched && styles.actionBtnTextMatched]}>
                  {isMatched
                    ? "Matched"
                    : isMatching
                      ? "Matching..."
                      : "Match"}
                </Text>
              </Pressable>
                );
              })()}
            </View>
          </View>
        )}
        ListFooterComponent={
          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              void loadLatestMatches(selectedClassId);
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh list</Text>
          </Pressable>
        }
      />
      <ViewProfileModal
        visible={profileModalVisible}
        userId={selectedProfileUserId}
        onClose={() => {
          setProfileModalVisible(false);
          setSelectedProfileUserId(null);
        }}
        onLoadError={(message) => {
          Alert.alert("Error", message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F8" },
  listContent: { padding: 16, paddingBottom: 24 },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
  },
  filterInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
    color: "#111827",
  },
  suggestionsContainer: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  suggestionRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    color: "#111827",
    fontSize: 14,
  },
  clearFilterBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
  },
  clearFilterBtnText: {
    color: "#2E57A2",
    fontSize: 12,
    fontWeight: "600",
  },
  filterHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#4B5563",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F8",
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, color: "#59627A", fontSize: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1B2D50" },
  emptyBody: { marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rank: { fontSize: 15, fontWeight: "700", color: "#1B2D50" },
  score: { fontSize: 15, fontWeight: "700", color: "#2E57A2" },
  name: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 6 },
  meta: { fontSize: 13, color: "#6B7280", marginBottom: 2 },
  filteredClassMeta: {
    fontSize: 13,
    color: "#1D4ED8",
    marginTop: 2,
    marginBottom: 2,
    fontWeight: "600",
  },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  matchBtn: { backgroundColor: "#1F7A4C" },
  viewProfileBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2E57A2",
  },
  viewProfileBtnText: {
    color: "#2E57A2",
  },
  matchBtnMatched: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#9CA3AF",
  },
  actionBtnTextMatched: {
    color: "#6B7280",
  },
  refreshButton: {
    marginTop: 4,
    alignSelf: "center",
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  refreshButtonText: { color: "#FFFFFF", fontWeight: "600" },
});
