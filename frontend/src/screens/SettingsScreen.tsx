import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { SETTINGS_TABS } from "./settings/settingsTabs";

type RootStackParamList = {
  Settings: {
    initialTab?: string;
  } | undefined;
};

export default function SettingsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Settings">>();
  const validTabIds = useMemo(() => new Set(SETTINGS_TABS.map((tab) => tab.id)), []);
  const initialTabFromRoute = route.params?.initialTab;
  const initialTab =
    initialTabFromRoute && validTabIds.has(initialTabFromRoute)
      ? initialTabFromRoute
      : SETTINGS_TABS[0].id;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTabFromRoute && validTabIds.has(initialTabFromRoute)) {
      setActiveTab(initialTabFromRoute);
    }
  }, [initialTabFromRoute, validTabIds]);

  const activeConfig = SETTINGS_TABS.find((t) => t.id === activeTab);
  const TabContent = activeConfig?.component ?? SETTINGS_TABS[0].component;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {SETTINGS_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TabContent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#E8EEF7",
    borderBottomWidth: 3,
    borderBottomColor: "#2E57A2",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5D667C",
  },
  tabTextActive: {
    color: "#2E57A2",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
