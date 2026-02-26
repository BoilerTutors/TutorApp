import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
  onSettingsPress?: () => void;
};

export type AccountType = "STUDENT" | "TUTOR" | "ADMINISTRATOR";

type ProfileHeaderProps = {
  onBack: () => void;
  role?: AccountType;
};

type SettingsHeaderProps = {
  onBack: () => void;
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

export function SettingsHeader({ onBack }: SettingsHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable style={styles.logoutBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Back</Text>
        </Pressable>

        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>Settings</Text>
        </View>

        <View style={styles.badgeWrap} />
      </View>
    </View>
  );
}

export default function DashboardHeader({ role, onLogout, onSettingsPress }: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: menuOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [menuAnimation, menuOpen]);

  const menuItems = useMemo(
    () => [
      {
        key: "settings",
        label: "Settings",
        icon: "settings-outline" as const,
        onPress: onSettingsPress,
      },
      {
        key: "logout",
        label: "Logout",
        icon: "arrow-back" as const,
        onPress: onLogout,
      },
    ].filter((item) => typeof item.onPress === "function"),
    [onLogout, onSettingsPress]
  );

  const handleMenuItemPress = (action?: () => void) => {
    setMenuOpen(false);
    if (action) action();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable
          style={styles.menuTriggerBtn}
          onPress={() => setMenuOpen((prev) => !prev)}
          hitSlop={8}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
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

      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[
          styles.dropdownMenu,
          {
            opacity: menuAnimation,
            transform: [
              {
                translateY: menuAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        {menuItems.map((item) => (
          <Pressable
            key={item.key}
            style={styles.dropdownItem}
            onPress={() => handleMenuItemPress(item.onPress)}
          >
            <Ionicons name={item.icon} size={18} color="#1B2D50" />
            <Text style={styles.dropdownItemText}>{item.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
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
  menuTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 32,
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
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
    justifyContent: "flex-end",
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
  dropdownMenu: {
    position: "absolute",
    top: 52,
    left: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    minWidth: 170,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    zIndex: 50,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    color: "#1B2D50",
    fontSize: 15,
    fontWeight: "600",
  },
});
