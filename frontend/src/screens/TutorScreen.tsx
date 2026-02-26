import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  Login: undefined;
  Messenger: undefined;
  Profile: { role: "STUDENT" | "TUTOR" | "ADMINISTRATOR" };
  Settings: undefined;
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back, <Text style={styles.welcomeName}>Gavin</Text></Text>
        <Text style={styles.dashboardLabel}>Tutor Dashboard</Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionButton}
            onPress={() => {
              if (action.label === "Messages") {
                navigation.navigate("Messenger");
              } else if (action.label === "My Profile") {
                navigation.navigate("Profile", { role: "TUTOR" });
              }
            }}
          >
            <Ionicons name={action.icon} size={16} color="#FFFFFF" style={styles.actionIcon} />
            <Text style={styles.actionText}>{action.label}</Text>
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
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});