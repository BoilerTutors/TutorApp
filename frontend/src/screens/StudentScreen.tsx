import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
  "Student Reviews": undefined;
  Matches:
    | {
        matches?: MatchItem[];
      }
    | undefined;
};

type MatchItem = {
  rank: number;
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
  tutor_major: string | null;
  similarity_score: number;
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
  const [firstName, setFirstName] = useState("Student");

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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome, {firstName}</Text>
        <Text style={styles.subtitle}>Find tutors and manage your sessions.</Text>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("Student Reviews")}
        >
          <Text style={styles.buttonText}>⭐ Leave a Review</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("Messenger")}
        >
          <Text style={styles.buttonText}>💬 Open Messenger</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("Profile", { role: "STUDENT" })}
        >
          <Text style={styles.buttonText}>👤 My Profile</Text>
        </Pressable>
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
    </View>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F8",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B2D50",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 10,
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
  button: {
    marginTop: 10,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#1B2D50",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
