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
import { api } from "../api/client";

type DashboardHeaderProps = {
  role: "STUDENT" | "TUTOR";
  onLogout: () => void;
  onSettingsPress?: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
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

export default function DashboardHeader({
  role,
  onLogout,
  onSettingsPress,
  onNotificationsPress,
  onHelpPress,
}: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: menuOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [menuAnimation, menuOpen]);

  useEffect(() => {
    if (!menuOpen || !onNotificationsPress) {
      return;
    }
    let cancelled = false;
    const loadUnreadCount = async () => {
      try {
        const rows = await api.get<Array<{ is_read: boolean }>>("/notifications/me?limit=200");
        if (cancelled) return;
        const unread = (rows ?? []).reduce((acc, row) => acc + (row.is_read ? 0 : 1), 0);
        setUnreadCount(unread);
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };
    void loadUnreadCount();
    return () => {
      cancelled = true;
    };
  }, [menuOpen, onNotificationsPress]);

  const menuItems = useMemo(
    () => [
      {
        key: "notifications",
        label: "Notifications",
        icon: "notifications-outline" as const,
        onPress: onNotificationsPress,
      },
      {
        key: "settings",
        label: "Settings",
        icon: "settings-outline" as const,
        onPress: onSettingsPress,
      },
      {
        key: "help",
        label: "Help",
        icon: "help-circle-outline" as const,
        onPress: onHelpPress,
      },
      {
        key: "logout",
        label: "Logout",
        icon: "arrow-back" as const,
        onPress: onLogout,
      },
    ].filter((item) => typeof item.onPress === "function"),
    [onLogout, onNotificationsPress, onSettingsPress, onHelpPress]
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
            <Ionicons name={item.icon} size={20} color="#1B2D50" />
            <Text style={styles.dropdownItemText}>{item.label}</Text>
            {item.key === "notifications" && unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const NAVY = "#1B2D50";
const GOLD = "#D4AF4A";
const HEADER_ROW_HEIGHT = 56;
const HORIZONTAL_PADDING = 16;

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAVY,
    paddingBottom: 14,
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
    minHeight: HEADER_ROW_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  menuTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 88,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  logoText: {
    fontSize: 24,
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
    minWidth: 88,
    justifyContent: "flex-end",
  },
  badge: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  dropdownMenu: {
    position: "absolute",
    top: HEADER_ROW_HEIGHT + 12,
    left: HORIZONTAL_PADDING,
    right: HORIZONTAL_PADDING,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dropdownItemText: {
    color: "#1B2D50",
    fontSize: 17,
    fontWeight: "600",
  },
  unreadBadge: {
    marginLeft: "auto",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF4A",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
