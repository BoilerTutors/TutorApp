import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../api/client";

type MeResponse = {
  is_tutor: boolean;
  tutor?: {
    quick_reply1?: string | null;
    quick_reply2?: string | null;
    quick_reply3?: string | null;
  } | null;
};

const DEFAULT_QUICK_REPLY_1 = "I am available for that time";
const DEFAULT_QUICK_REPLY_2 = "No, I am not available. Do you want to try a different time?";
const DEFAULT_QUICK_REPLY_3 = "Send me the lecture notes";

export default function TutorQuickRepliesTab({
  showAlert,
}: {
  showAlert: (title: string, message: string) => void;
}) {
  const [isTutor, setIsTutor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickReply1, setQuickReply1] = useState(DEFAULT_QUICK_REPLY_1);
  const [quickReply2, setQuickReply2] = useState(DEFAULT_QUICK_REPLY_2);
  const [quickReply3, setQuickReply3] = useState(DEFAULT_QUICK_REPLY_3);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const me = await api.get<MeResponse>("/users/me");
        if (!mounted) {
          return;
        }
        setIsTutor(Boolean(me.is_tutor));
        setQuickReply1(me.tutor?.quick_reply1?.trim() || DEFAULT_QUICK_REPLY_1);
        setQuickReply2(me.tutor?.quick_reply2?.trim() || DEFAULT_QUICK_REPLY_2);
        setQuickReply3(me.tutor?.quick_reply3?.trim() || DEFAULT_QUICK_REPLY_3);
      } catch (e) {
        if (!mounted) {
          return;
        }
        showAlert("Error", e instanceof Error ? e.message : "Failed to load quick replies");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [showAlert]);

  const onResetDefaults = () => {
    setQuickReply1(DEFAULT_QUICK_REPLY_1);
    setQuickReply2(DEFAULT_QUICK_REPLY_2);
    setQuickReply3(DEFAULT_QUICK_REPLY_3);
  };

  const onSave = async () => {
    const q1 = quickReply1.trim();
    const q2 = quickReply2.trim();
    const q3 = quickReply3.trim();
    if (!q1 || !q2 || !q3) {
      showAlert("Missing text", "All three quick replies are required.");
      return;
    }
    try {
      setSaving(true);
      await api.patch("/users/me", {
        tutor_profile: {
          quick_reply1: q1,
          quick_reply2: q2,
          quick_reply3: q3,
        },
      });
      showAlert("Quick replies updated", "Your quick replies were saved.");
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to save quick replies");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tutor Quick Replies</Text>
        <Text style={styles.subtitle}>
          These messages appear as one-tap responses in your Messenger screen.
        </Text>

        {loading ? (
          <Text style={styles.helper}>Loading quick replies...</Text>
        ) : !isTutor ? (
          <Text style={styles.helper}>Quick replies are available for tutor accounts only.</Text>
        ) : (
          <>
            <Text style={styles.label}>Quick reply 1</Text>
            <TextInput
              style={styles.input}
              value={quickReply1}
              onChangeText={setQuickReply1}
              placeholder={DEFAULT_QUICK_REPLY_1}
              editable={!saving}
              maxLength={280}
            />

            <Text style={styles.label}>Quick reply 2</Text>
            <TextInput
              style={styles.input}
              value={quickReply2}
              onChangeText={setQuickReply2}
              placeholder={DEFAULT_QUICK_REPLY_2}
              editable={!saving}
              maxLength={280}
            />

            <Text style={styles.label}>Quick reply 3</Text>
            <TextInput
              style={styles.input}
              value={quickReply3}
              onChangeText={setQuickReply3}
              placeholder={DEFAULT_QUICK_REPLY_3}
              editable={!saving}
              maxLength={280}
            />

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.secondaryBtn, saving && styles.disabledBtn]}
                onPress={onResetDefaults}
                disabled={saving}
              >
                <Text style={styles.secondaryBtnText}>Reset defaults</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && styles.disabledBtn]} onPress={() => void onSave()} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save quick replies"}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
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
  helper: {
    fontSize: 14,
    color: "#5D667C",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  saveBtn: {
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: "auto",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
