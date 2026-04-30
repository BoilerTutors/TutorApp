import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import type { Session } from "./SessionCard";

type SessionNote = {
  id: number;
  session_id: number;
  tutor_id: number;
  student_id: number;
  content: string;
  subject: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  visible: boolean;
  session: Session | null;
  onClose: () => void;
  onSaved?: () => void;
};

const NAVY = "#1B2D50";

export default function SessionNotesModal({
  visible,
  session,
  onClose,
  onSaved,
}: Props) {
  const [note, setNote] = useState<SessionNote | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCompleted = session?.status === "completed";

  useEffect(() => {
    if (!visible || !session) return;
    let cancelled = false;
    const loadNote = async () => {
      setLoading(true);
      try {
        const existing = await api.get<SessionNote | null>(
          `/session-notes/${session.id}`
        );
        if (cancelled) return;
        setNote(existing);
        setContent(existing?.content ?? "");
      } catch {
        if (!cancelled) {
          setNote(null);
          setContent("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadNote();
    return () => {
      cancelled = true;
    };
  }, [visible, session]);

  const handleSave = async () => {
    if (!session) return;
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert("Empty note", "Please enter some content before saving.");
      return;
    }
    setSaving(true);
    try {
      const saved = note
        ? await api.put<SessionNote>(`/session-notes/${session.id}`, {
            content: trimmed,
          })
        : await api.post<SessionNote>(`/session-notes/${session.id}`, {
            content: trimmed,
          });
      setNote(saved);
      setContent(saved.content);
      onSaved?.();
      Alert.alert("Saved", "Your note has been saved.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save note.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!session || !note) return;
    Alert.alert("Delete note?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await api.delete(`/session-notes/${session.id}`);
            setNote(null);
            setContent("");
            onSaved?.();
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Failed to delete note.";
            Alert.alert("Error", message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Session Notes</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={NAVY} />
            </Pressable>
          </View>

          {session && (
            <View style={styles.sessionInfo}>
              <Text style={styles.studentName}>{session.studentName}</Text>
              <Text style={styles.detail}>
                {session.subject} · {session.date}
              </Text>
              <Text style={styles.detail}>
                {session.startTime} – {session.endTime}
              </Text>
            </View>
          )}

          {!isCompleted ? (
            <View style={styles.banner}>
              <Ionicons name="information-circle" size={16} color="#92400E" />
              <Text style={styles.bannerText}>
                Notes can only be added to completed sessions.
              </Text>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                style={[styles.textarea, !isCompleted && styles.textareaDisabled]}
                placeholder="Write notes about this session..."
                placeholderTextColor="#A0A7B8"
                value={content}
                onChangeText={setContent}
                multiline
                editable={isCompleted && !saving}
                textAlignVertical="top"
              />
              {note ? (
                <Text style={styles.timestamp}>
                  Last updated{" "}
                  {new Date(note.updated_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              ) : null}
            </ScrollView>
          )}

          {isCompleted ? (
            <View style={styles.actions}>
              <Pressable
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : note ? "Update" : "Save"}
                </Text>
              </Pressable>
              {note ? (
                <Pressable
                  style={[styles.deleteBtn, saving && styles.btnDisabled]}
                  onPress={handleDelete}
                  disabled={saving}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
  },
  sessionInfo: {
    backgroundColor: "#F2F4F8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
  },
  detail: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bannerText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: NAVY,
    backgroundColor: "#FFF",
  },
  textareaDisabled: {
    backgroundColor: "#F2F4F8",
    color: "#6B7280",
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: NAVY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  deleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});