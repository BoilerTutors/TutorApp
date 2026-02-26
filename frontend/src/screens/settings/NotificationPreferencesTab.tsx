import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

export default function NotificationPreferencesTab() {
  const [messageAlerts, setMessageAlerts] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [inAppBanners, setInAppBanners] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [emailDigest, setEmailDigest] = useState(false);

  const allEnabledCount = useMemo(
    () =>
      [messageAlerts, matchAlerts, inAppBanners, pushNotifications, emailDigest].filter(Boolean).length,
    [emailDigest, inAppBanners, matchAlerts, messageAlerts, pushNotifications]
  );

  const onSave = () => {
    // Placeholder save until backend preference endpoints are added.
    Alert.alert("Preferences updated", `Enabled ${allEnabledCount} notification options.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Choose which alerts you want to receive. This screen controls preferences only.
        </Text>

        <PreferenceRow
          label="Message notifications"
          helper="Get alerted when you receive a new message."
          enabled={messageAlerts}
          onToggle={() => setMessageAlerts((v) => !v)}
        />
        <PreferenceRow
          label="New match notifications"
          helper="Get alerted when a student matches with you."
          enabled={matchAlerts}
          onToggle={() => setMatchAlerts((v) => !v)}
        />
        <PreferenceRow
          label="In-app banners"
          helper="Show banners while using the app."
          enabled={inAppBanners}
          onToggle={() => setInAppBanners((v) => !v)}
        />
        <PreferenceRow
          label="Push notifications"
          helper="Receive phone push notifications in the background."
          enabled={pushNotifications}
          onToggle={() => setPushNotifications((v) => !v)}
        />
        <PreferenceRow
          label="Email digest"
          helper="Get a daily summary of unread activity."
          enabled={emailDigest}
          onToggle={() => setEmailDigest((v) => !v)}
        />

        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>Save preferences</Text>
        </Pressable>
      </View>
    </View>
  );
}

type PreferenceRowProps = {
  label: string;
  helper: string;
  enabled: boolean;
  onToggle: () => void;
};

function PreferenceRow({ label, helper, enabled, onToggle }: PreferenceRowProps) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceHelper}>{helper}</Text>
      </View>
      <Pressable
        style={[styles.togglePill, enabled ? styles.togglePillOn : styles.togglePillOff]}
        onPress={onToggle}
      >
        <View style={[styles.toggleKnob, enabled ? styles.toggleKnobOn : styles.toggleKnobOff]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2F3850",
  },
  preferenceHelper: {
    marginTop: 4,
    fontSize: 13,
    color: "#5D667C",
    lineHeight: 18,
  },
  togglePill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  togglePillOn: {
    backgroundColor: "#2E57A2",
  },
  togglePillOff: {
    backgroundColor: "#CDD6E6",
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  toggleKnobOff: {
    alignSelf: "flex-start",
  },
  saveBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
