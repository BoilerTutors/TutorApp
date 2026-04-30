import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";

type RootStackParamList = {
  Profile: { role: "ADMIN" };
  "Admin Sessions": undefined;
  "Admin Users": undefined;
};

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type AdminMeResponse = {
  id: number;
  email: string;
};

export default function AdminDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [adminEmail, setAdminEmail] = useState("admin");

  useEffect(() => {
    let mounted = true;
    const loadAdmin = async () => {
      try {
        const admin = await api.get<AdminMeResponse>("/admin/me");
        if (mounted) {
          setAdminEmail(admin.email);
        }
      } catch {
        // Keep fallback copy if admin lookup fails.
      }
    };
    void loadAdmin();
    return () => {
      mounted = false;
    };
  }, []);

  const showPlaceholder = (label: string) => {
    Alert.alert(label, `${label} is ready to be wired to a real admin workflow.`);
  };

  const quickActions: QuickAction[] = [
    {
      label: "View Reports",
      icon: "bar-chart",
      onPress: () => showPlaceholder("View Reports"),
    },
    {
      label: "Search Users",
      icon: "search",
      onPress: () => navigation.navigate("Admin Users"),
    },
    {
      label: "See Recent Purchases",
      icon: "card",
      onPress: () => navigation.navigate("Admin Sessions"),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
        <Text style={styles.welcomeSub}>
          Signed in as {adminEmail}. Review platform activity and jump into common
          administrative tasks.
        </Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Profile", { role: "ADMIN" })}
        >
          <Ionicons name="person-circle" size={18} color={GOLD} />
          <Text style={styles.primaryBtnText}>Admin Profile</Text>
        </Pressable>

        {/*}
        <Pressable style={[styles.primaryBtn, styles.darkBtn]} onPress={() => showPlaceholder("Platform Overview")}>
          <Ionicons name="speedometer" size={18} color={GOLD} />
          <Text style={styles.primaryBtnText}>Platform Overview</Text>
        </Pressable>
        */}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <Pressable key={action.label} style={styles.actionChip} onPress={action.onPress}>
            <Ionicons name={action.icon} size={20} color="#FFF" />
            <Text style={styles.chipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      
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
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 10,
    marginTop: 4,
  },
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
    minHeight: 78,
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E3E7EF",
  },
  infoTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  infoText: {
    color: "#59627A",
    fontSize: 14,
    lineHeight: 20,
  },
});
