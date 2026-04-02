import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import SessionCard, { type Session } from "../components/SessionCard";
import type { TutoringSession } from "../types/models";

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
  "Tutor Reviews": undefined;
  "Tutor Past Sessions": undefined;
  "Tutor Schedule": undefined;
  Matches: undefined;
};

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

const MAX_RECENT_PAST = 3;

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

export default function TutorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [firstName, setFirstName] = useState("Tutor");
  const [searchQuery, setSearchQuery] = useState("");
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [cancellingSessionId, setCancellingSessionId] = useState<number | null>(null);

  const showErrorMessage = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(`${title}: ${message}`);
      }
      return;
    }
    Alert.alert(title, message);
  }, []);

  const filterSessions = useCallback(
    (sessions: Session[]) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        return sessions;
      }
      return sessions.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.subject.toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const filteredUpcoming = useMemo(
    () => filterSessions(upcomingSessions),
    [filterSessions, upcomingSessions]
  );
  const filteredPast = useMemo(
    () => filterSessions(pastSessions),
    [filterSessions, pastSessions]
  );

  const loadDashboardData = useCallback(async () => {
    try {
      const [me, futureRaw, pastRaw] = await Promise.all([
        api.get<{ first_name: string }>("/users/me"),
        api.get<TutoringSession[]>("/sessions/tutor/future"),
        api.get<TutoringSession[]>("/sessions/tutor/past"),
      ]);

      const uniqueStudentIds = Array.from(
        new Set([...futureRaw, ...pastRaw].map((s) => s.student_id))
      );
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

      const mapSession = (s: TutoringSession): Session => {
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
      };

      if (me.first_name?.trim()) {
        setFirstName(me.first_name.trim());
      }
      setUpcomingSessions(futureRaw.map(mapSession));
      setPastSessions(pastRaw.map(mapSession));
    } catch {
      // Keep empty arrays if API calls fail.
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        await loadDashboardData();
      } catch {
        // no-op
      }
    };
    void run();
  }, [loadDashboardData]);

  const onCancelSession = (sessionId: number) => {
    if (cancellingSessionId != null) {
      return;
    }
    const performCancel = async () => {
      try {
        setCancellingSessionId(sessionId);
        await api.patch<TutoringSession>(`/sessions/${sessionId}`, {
          status: "cancelled",
        });
        await loadDashboardData();
      } catch (e) {
        showErrorMessage(
          "Error",
          e instanceof Error ? e.message : "Failed to cancel session."
        );
      } finally {
        setCancellingSessionId(null);
      }
    };

    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm("Are you sure you want to cancel this session?")
          : false;
      if (confirmed) {
        void performCancel();
      }
      return;
    }

    Alert.alert("Cancel session", "Are you sure you want to cancel this session?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          void performCancel();
        },
      },
    ]);
  };

  const QUICK_ACTIONS: QuickAction[] = [
    {
      label: "My Profile",
      icon: "person",
      onPress: () => navigation.navigate("Profile", { role: "TUTOR" }),
    },
    {
      label: "Sessions Calendar",
      icon: "calendar",
      onPress: () => navigation.navigate("Tutor Schedule"),
    },
    { label: "Payouts", icon: "cash" },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Card */}
      <View style={styles.card}>
        <Text style={styles.welcomeTitle}>Welcome, {firstName}</Text>
        <Text style={styles.welcomeSub}>
          Manage tutoring sessions and reviews.
        </Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Tutor Reviews")}
        >
          <Ionicons name="star" size={18} color={GOLD} />
          <Text style={styles.primaryBtnText}>View My Reviews</Text>
        </Pressable>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Messenger")}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color={GOLD} />
          <Text style={styles.primaryBtnText}>Open Messenger</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, styles.darkBtn]}
          onPress={() => navigation.navigate("Profile", { role: "TUTOR" })}
        >
          <Ionicons name="person" size={18} color={GOLD} />
          <Text style={styles.primaryBtnText}>Account & Availability</Text>
        </Pressable>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionChip}
            onPress={action.onPress}
          >
            <Ionicons name={action.icon} size={20} color="#FFF" />
            <Text style={styles.chipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Service History */}
      <Text style={styles.sectionTitle}>Service History</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#8C93A4" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name..."
          placeholderTextColor="#A0A7B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#8C93A4" />
          </Pressable>
        )}
      </View>

      {/* Upcoming Sessions */}
      <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
      {filteredUpcoming.length > 0 ? (
        filteredUpcoming.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            showCancelAction
            cancelling={cancellingSessionId === session.id}
            onCancelPress={onCancelSession}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>
          {searchQuery ? "No upcoming sessions match your search." : "No upcoming sessions."}
        </Text>
      )}

      {/* Past Sessions */}
      <Text style={styles.sectionTitle}>Past Sessions</Text>
      {filteredPast.length > 0 ? (
        <>
          {filteredPast.slice(0, MAX_RECENT_PAST).map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
          {filteredPast.length > MAX_RECENT_PAST && (
            <Pressable
              style={styles.showMoreBtn}
              onPress={() => navigation.navigate("Tutor Past Sessions")}
            >
              <Text style={styles.showMoreText}>Show More</Text>
              <Ionicons name="chevron-forward" size={16} color={BLUE} />
            </Pressable>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>
          {searchQuery ? "No past sessions match your search." : "No past sessions."}
        </Text>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 16,
  },

  // Welcome Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 10,
    gap: 8,
  },
  darkBtn: {
    backgroundColor: NAVY,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 10,
    marginTop: 4,
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 5,
    marginBottom: 20,
  },
  actionChip: {
    width: "31.5%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 14,
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1B2D50",
  },

  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 2,
    marginBottom: 4,
    gap: 4,
  },
  showMoreText: {
    color: BLUE,
    fontWeight: "700",
    fontSize: 15,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 16,
  },
  bottomSpacer: {
    height: 30,
  },
});
