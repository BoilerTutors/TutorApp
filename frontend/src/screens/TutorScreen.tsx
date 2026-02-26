import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  "Tutor Reviews": undefined;
};

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "My Profile", icon: "person" },
  { label: "Messages", icon: "mail" },
  { label: "Availability", icon: "time" },
  { label: "Sessions", icon: "calendar" },
  { label: "Reviews", icon: "star" },
  { label: "Payouts", icon: "cash" },
];

export default function TutorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BoilerTutors</Text>
        <Text style={styles.subtitle}>Tutor Dashboard</Text>
        
        <Text style={styles.body}>Welcome! Manage your tutoring sessions and reviews here.</Text>

        <Pressable 
          style={styles.button} 
          onPress={() => navigation.navigate("Tutor Reviews")}
        >
          <Text style={styles.buttonText}>⭐ View My Reviews</Text>
        </Pressable>

        <Pressable 
          style={styles.button} 
          onPress={() => navigation.navigate("Messenger")}
        >
          <Text style={styles.buttonText}>💬 Open Messenger</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("Profile", { role: "TUTOR" })}
        >
          <Text style={styles.buttonText}>👤 Account & Availability</Text>
        </Pressable>
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
    marginBottom: 4,
    color: "#2F3850",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
    color: "#D4AF4A",
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
//     marginBottom: 20,
//     color: "#5D667C",
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
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    fontSize: 15,
  },
});
