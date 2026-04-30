import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";

export type FlaggedReviewRow = {
  id: number;
  session_id: number;
  subject: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  tutor_name: string;
  student_display: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ConfirmState = { kind: "ignore" | "delete"; row: FlaggedReviewRow };

export default function AdminFlaggedReviewsScreen() {
  const [reviews, setReviews] = useState<FlaggedReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<FlaggedReviewRow[]>("/admin/reviews/flagged");
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const runConfirmedAction = async () => {
    if (!confirm) return;
    const { kind, row } = confirm;
    setActionError(null);
    setBusyId(row.id);
    try {
      if (kind === "ignore") {
        await api.post(`/admin/reviews/${row.id}/ignore`);
      } else {
        await api.delete(`/admin/reviews/${row.id}`);
      }
      setReviews((prev) => prev.filter((r) => r.id !== row.id));
      setConfirm(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.loadingText}>Loading flagged reviews…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Flagged Reviews</Text>
        <Text style={styles.subtitle}>
          Tutors flagged these reviews for moderation. Ignore clears the flag and keeps the review;
          delete removes it entirely.
        </Text>
      </View>

      {reviews.length === 0 ? (
        <Text style={styles.empty}>No flagged reviews right now.</Text>
      ) : (
        reviews.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.sessionLabel}>Session #{row.session_id}</Text>
              <Text style={styles.when}>{formatWhen(row.created_at)}</Text>
            </View>
            <Text style={styles.subject}>{row.subject}</Text>
            <View style={styles.metaBlock}>
              <Text style={styles.meta}>
                Tutor: {row.tutor_name} · Student: {row.student_display}
              </Text>
              {row.is_anonymous ? (
                <Text style={styles.anonAdminNote}>
                  Review submitted anonymously; student name is shown here for moderation only.
                </Text>
              ) : null}
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <Text style={styles.ratingValue}>{row.rating.toFixed(1)} / 5</Text>
            </View>
            {row.comment ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Review</Text>
                <Text style={styles.bodyText}>{row.comment}</Text>
              </View>
            ) : (
              <Text style={styles.muted}>No written comment.</Text>
            )}
            <View style={[styles.block, styles.flagBlock]}>
              <Text style={styles.blockTitle}>Flag reason</Text>
              <Text style={styles.flagReason}>{row.flag_reason?.trim() || "—"}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.ignoreBtn]}
                activeOpacity={0.85}
                onPress={() => {
                  setActionError(null);
                  setConfirm({ kind: "ignore", row });
                }}
                disabled={busyId !== null}
              >
                <View style={styles.btnInner}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={NAVY} />
                  <Text style={styles.ignoreBtnText}>Ignore flag</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.deleteBtn]}
                activeOpacity={0.85}
                onPress={() => {
                  setActionError(null);
                  setConfirm({ kind: "delete", row });
                }}
                disabled={busyId !== null}
              >
                <View style={styles.btnInner}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>

    <Modal
      visible={confirm !== null}
      transparent
      animationType="fade"
      onRequestClose={() => busyId === null && setConfirm(null)}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => busyId === null && setConfirm(null)}
        />
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>
            {confirm?.kind === "ignore" ? "Ignore flag?" : "Delete review?"}
          </Text>
          <Text style={styles.modalBody}>
            {confirm?.kind === "ignore"
              ? "The review stays published and is removed from this flagged list."
              : "This permanently removes the review. This cannot be undone."}
          </Text>
          {actionError ? <Text style={styles.modalError}>{actionError}</Text> : null}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              disabled={busyId !== null}
              onPress={() => setConfirm(null)}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                confirm?.kind === "delete" ? styles.modalBtnDanger : styles.modalBtnPrimary,
              ]}
              disabled={busyId !== null}
              onPress={() => void runConfirmedAction()}
            >
              {busyId !== null ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>
                  {confirm?.kind === "ignore" ? "Ignore flag" : "Delete"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    </Modal>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F4F8" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F2F4F8" },
  loadingText: { marginTop: 10, fontSize: 14, color: "#59627A" },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: { fontSize: 22, fontWeight: "800", color: NAVY, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24, fontSize: 15 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sessionLabel: { fontWeight: "800", color: NAVY, fontSize: 15 },
  when: { fontSize: 12, color: "#6B7280" },
  subject: { fontSize: 16, fontWeight: "700", color: NAVY, marginBottom: 4 },
  metaBlock: { marginBottom: 10 },
  meta: { fontSize: 13, color: "#59627A" },
  anonAdminNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 17,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  ratingLabel: { fontSize: 13, fontWeight: "700", color: NAVY },
  ratingValue: { fontSize: 15, fontWeight: "600", color: BLUE },
  block: { marginBottom: 10 },
  blockTitle: { fontSize: 12, fontWeight: "800", color: "#6B7280", marginBottom: 4, textTransform: "uppercase" },
  bodyText: { fontSize: 14, color: "#374151", lineHeight: 21 },
  muted: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginBottom: 10 },
  flagBlock: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  flagReason: { fontSize: 14, color: "#78350F", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  ignoreBtn: { backgroundColor: "#E5E7EB", borderWidth: 1, borderColor: "#D1D5DB" },
  ignoreBtnText: { fontWeight: "700", color: NAVY, fontSize: 14 },
  deleteBtn: { backgroundColor: "#B42318" },
  deleteBtnText: { fontWeight: "700", color: "#FFF", fontSize: 14 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    zIndex: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: NAVY, marginBottom: 10 },
  modalBody: { fontSize: 14, color: "#4B5563", lineHeight: 21, marginBottom: 12 },
  modalError: { fontSize: 13, color: "#B42318", marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondary: { backgroundColor: "#E5E7EB" },
  modalBtnSecondaryText: { fontWeight: "700", color: NAVY, fontSize: 15 },
  modalBtnPrimary: { backgroundColor: BLUE },
  modalBtnDanger: { backgroundColor: "#B42318" },
  modalBtnPrimaryText: { fontWeight: "800", color: "#FFF", fontSize: 15 },
});
