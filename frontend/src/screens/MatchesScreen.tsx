import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "../api/client";

type MatchItem = {
  rank: number;
  tutor_id: number;
  tutor_profile_id: number | null;
  tutor_first_name: string;
  tutor_last_name: string;
  tutor_major: string | null;
  similarity_score: number;
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

  const loadLatestMatches = async () => {
    try {
      const data = await api.get<MatchItem[]>("/matches/me");
      setMatches(data);
      await loadTutorEmails(data);
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

  useEffect(() => {
    if (initialMatches.length > 0) {
      void loadTutorEmails(initialMatches);
    }
    void loadSavedMatches();
    if (initialMatches.length === 0) {
      void loadLatestMatches();
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

  if (matches.length === 0) {
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
        onRefresh={() => {
          setRefreshing(true);
          void loadLatestMatches();
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
            <View style={styles.actionsRow}>
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
              void loadLatestMatches();
            }}
          >
            <Text style={styles.refreshButtonText}>Refresh list</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F8" },
  listContent: { padding: 16, paddingBottom: 24 },
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
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  matchBtn: { backgroundColor: "#1F7A4C" },
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
