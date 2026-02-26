
import React from "react";
import NotificationPreferencesTab from "./NotificationPreferencesTab";

export type SettingsTabConfig = {
  id: string;
  label: string;
  component: React.ComponentType;
};

/** Add new tabs here and create a corresponding component in this folder. */
export const SETTINGS_TABS: SettingsTabConfig[] = [
  {
    id: "notification-preferences",
    label: "Notification Settings",
    component: NotificationPreferencesTab,
  },
];

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
