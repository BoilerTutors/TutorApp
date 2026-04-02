import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";

type AdminSession = {
  id: number;
  tutor_id: number;
  student_id: number;
  tutor_name: string;
  student_name: string;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
  cost_cents: number;
  notes?: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  purchased_at: string;
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminSessionsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      setLoading(true);
      try {
        const query = searchQuery.trim();
        const path = query
          ? `/sessions/admin/recent?tutor_name=${encodeURIComponent(query)}&limit=50`
          : "/sessions/admin/recent?limit=50";
        const data = await api.get<AdminSession[]>(path);
        if (mounted) {
          setSessions(data);
        }
      } catch {
        if (mounted) {
          setSessions([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void loadSessions();
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Recent Purchases</Text>
        <Text style={styles.subtitle}>
          Review the 50 most recently created tutoring sessions and search by tutor name.
        </Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#8C93A4" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tutor name..."
          placeholderTextColor="#A0A7B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#8C93A4" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <Text style={styles.emptyText}>
          {searchQuery ? "No sessions match that tutor name." : "No recent sessions found."}
        </Text>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Session #{session.id}</Text>
              <Text style={styles.status}>{session.status}</Text>
            </View>
            <Text style={styles.detail}><Text style={styles.label}>Tutor:</Text> {session.tutor_name}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Student:</Text> {session.student_name}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Subject:</Text> {session.subject}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Created:</Text> {formatDateTime(session.purchased_at)}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Scheduled:</Text> {formatDateTime(session.scheduled_start)}</Text>
            <Text style={styles.detail}><Text style={styles.label}>Cost:</Text> {formatMoney(session.cost_cents)}</Text>
            {session.notes ? (
              <Text style={styles.detail}><Text style={styles.label}>Notes:</Text> {session.notes}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: NAVY,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#59627A",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: NAVY,
  },
  status: {
    color: BLUE,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  label: {
    fontWeight: "700",
    color: NAVY,
  },
  detail: {
    fontSize: 14,
    color: "#475467",
    marginBottom: 6,
    lineHeight: 20,
  },
});
