import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { logout } from "../auth/logout";
import { api } from "../api/client";

type MatchItem = {
  rank: number;
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
  tutor_major: string | null;
  similarity_score: number;
};

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
  Matches: { matches?: MatchItem[] } | undefined;
};

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Find Tutors", icon: "search" },
  { label: "Messages", icon: "mail" },
  { label: "Book Session", icon: "calendar" },
  { label: "My Schedule", icon: "time" },
  { label: "My Reviews", icon: "star" },
  { label: "Profile", icon: "person" },
];

export default function StudentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [computingMatches, setComputingMatches] = useState(false);
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    let mounted = true;
    const loadMe = async () => {
      try {
        const me = await api.get<{ first_name: string }>("/users/me");
        if (mounted && me.first_name?.trim()) {
          setFirstName(me.first_name.trim());
        }
      } catch {
        // Keep friendly fallback if profile fetch fails.
      }
    };
    void loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleComputeMatches = async () => {
    setComputingMatches(true);
    try {
      const matches = await api.post<MatchItem[]>("/matches/me/refresh");
      navigation.navigate("Matches", { matches });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to compute matches");
    } finally {
      setComputingMatches(false);
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back, <Text style={styles.welcomeName}>{firstName}</Text></Text>
        <Text style={styles.dashboardLabel}>Student Dashboard</Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionButton}
            disabled={action.label === "Find Tutors" && computingMatches}
            onPress={() => {
              if (action.label === "Find Tutors") {
                void handleComputeMatches();
              } else if (action.label === "Messages") {
                navigation.navigate("Messenger");
              } else if (action.label === "Profile") {
                navigation.navigate("Profile", { role: "STUDENT" });
              }
            }}
          >
            <Ionicons name={action.icon} size={16} color="#FFFFFF" style={styles.actionIcon} />
            <Text style={styles.buttonText}>
              {action.label === "Find Tutors" && computingMatches ? "Finding..." : action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    color: "#333",
  },
  welcomeName: {
    fontWeight: "700",
    color: NAVY,
  },
  dashboardLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "31%",
    justifyContent: "center",
  },
  actionIcon: {
    marginRight: 6,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#1B2D50",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});