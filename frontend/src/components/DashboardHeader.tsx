import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DashboardHeaderProps = {
  role: "STUDENT" | "TUTOR";
  onLogout: () => void;
};

export type AccountType = "STUDENT" | "TUTOR" | "ADMINISTRATOR";

type ProfileHeaderProps = {
  onBack: () => void;
  role?: AccountType;
};

export function ProfileHeader({ onBack, role = "STUDENT" }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable style={styles.logoutBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Back</Text>
        </Pressable>

        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>
            Boiler<Text style={styles.logoAccent}>Tutors</Text>
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{role}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DashboardHeader({ role, onLogout }: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable style={styles.logoutBtn} onPress={onLogout} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>
            Boiler<Text style={styles.logoAccent}>Tutors</Text>
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{role}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAVY,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    paddingHorizontal: 12,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  logoAccent: {
    color: GOLD,
  },
  badgeWrap: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
