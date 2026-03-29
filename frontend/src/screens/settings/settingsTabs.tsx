
import React from "react";
import NotificationPreferencesTab from "./NotificationPreferencesTab";
import SecurityPreferencesTab from "./SecurityPreferencesTab";
import { Alert, Platform } from "react-native";

export type SettingsTabConfig = {
  id: string;
  label: string;
  component: React.ComponentType;
};

export function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
/** Add new tabs here and create a corresponding component in this folder. */
export const SETTINGS_TABS: SettingsTabConfig[] = [
  {
    id: "notification-preferences",
    label: "Notification Settings",
    component: () => <NotificationPreferencesTab showAlert={showAlert} />,
  },
  {
    id: "security-preferences",
    label: "Security Settings",
    component: () => <SecurityPreferencesTab showAlert={showAlert} />,
  },
];

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
