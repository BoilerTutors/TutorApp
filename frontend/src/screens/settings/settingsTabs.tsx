import React from "react";
import NotificationsTab from "./NotificationsTab";

export type SettingsTabConfig = {
  id: string;
  label: string;
  component: React.ComponentType;
};

/** Add new tabs here and create a corresponding component in this folder. */
export const SETTINGS_TABS: SettingsTabConfig[] = [
  { id: "notifications", label: "Notifications", component: NotificationsTab },
];

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
