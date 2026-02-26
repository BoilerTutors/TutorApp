import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../api/client";

type NotificationPreferences = {
  user_id: number;
  email_digest_enabled: boolean;
  email_digest_frequency: "12h" | "daily" | "weekly";
  updated_at: string;
};

export default function NotificationPreferencesTab({ showAlert }: { showAlert: (title: string, message: string) => void }) {
  const [emailDigest, setEmailDigest] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<"12h" | "daily" | "weekly">("daily");
  const [saving, setSaving] = useState(false);

  const allEnabledCount = useMemo(
    () => [emailDigest].filter(Boolean).length,
    [emailDigest]
  );

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const prefs = await api.get<NotificationPreferences>("/notifications/preferences/me");
        if (!mounted) return;
        setEmailDigest(!!prefs.email_digest_enabled);
        setEmailDigestFrequency(prefs.email_digest_frequency ?? "daily");
      } catch {
        // Keep default UI state if preferences are unavailable.
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      await api.put<NotificationPreferences>("/notifications/preferences/me", {
        email_digest_enabled: emailDigest,
        email_digest_frequency: emailDigestFrequency,
      });
      showAlert("Preferences updated", "Notification preferences saved successfully.");
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Choose which alerts you want to receive. This screen controls preferences only.
        </Text>

        <PreferenceRow
          label="Email digest"
          helper="Get recurring summaries of unread activity."
          enabled={emailDigest}
          onToggle={() => setEmailDigest((v) => !v)}
        />
        {emailDigest ? (
          <View style={styles.frequencyRow}>
            <Text style={styles.frequencyLabel}>Digest frequency</Text>
            <View style={styles.frequencyOptions}>
              <FrequencyOption
                label="12 hours"
                selected={emailDigestFrequency === "12h"}
                onPress={() => setEmailDigestFrequency("12h")}
              />
              <FrequencyOption
                label="Daily"
                selected={emailDigestFrequency === "daily"}
                onPress={() => setEmailDigestFrequency("daily")}
              />
              <FrequencyOption
                label="Weekly"
                selected={emailDigestFrequency === "weekly"}
                onPress={() => setEmailDigestFrequency("weekly")}
              />
            </View>
          </View>
        ) : null}

        <Pressable style={styles.saveBtn} onPress={() => void onSave()} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save preferences"}</Text>
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

type FrequencyOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FrequencyOption({ label, selected, onPress }: FrequencyOptionProps) {
  return (
    <Pressable
      style={[styles.frequencyOption, selected && styles.frequencyOptionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.frequencyOptionText, selected && styles.frequencyOptionTextSelected]}>
        {label}
      </Text>
    </Pressable>
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
  frequencyRow: {
    marginTop: 2,
    marginBottom: 10,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2F3850",
    marginBottom: 8,
  },
  frequencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  frequencyOption: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  frequencyOptionSelected: {
    borderColor: "#2E57A2",
    backgroundColor: "#EEF3FF",
  },
  frequencyOptionText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13,
  },
  frequencyOptionTextSelected: {
    color: "#2E57A2",
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
