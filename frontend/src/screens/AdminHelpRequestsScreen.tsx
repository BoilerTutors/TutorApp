import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";

type AdminHelpRequestRow = {
  id: number;
  student_id: number;
  tutor_id: number;
  student_name: string;
  tutor_name: string;
  message: string;
  refund_requested: boolean;
  created_at: string;
  admin_response: string | null;
  responded_at: string | null;
};

type AdminMessagePublic = {
  id: number;
  student_id: number;
  tutor_id: number;
  message: string;
  refund_requested: boolean;
  created_at: string;
  admin_response: string | null;
  responded_at: string | null;
};

const DEFAULT_RESPONSES = [
  "Updating preferences can be found in the profile page of user dashboards.",
  "You can send materials to your tutor by uploading PDF files in Messenger.",
  "Please verify you are still matched with the user before booking or messaging.",
  "For payment questions, check your Session History and purchase details first.",
];

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminHelpRequestsScreen() {
  const [rows, setRows] = useState<AdminHelpRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [customResponses, setCustomResponses] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminHelpRequestRow[]>("/admin-messages/admin/all");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const sendResponse = async (row: AdminHelpRequestRow, responseText: string) => {
    const trimmed = responseText.trim();
    if (!trimmed) return;
    try {
      setBusyId(row.id);
      const updated = await api.post<AdminMessagePublic>(`/admin-messages/admin/${row.id}/respond`, {
        response_message: trimmed,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, admin_response: updated.admin_response, responded_at: updated.responded_at }
            : r
        )
      );
      setCustomResponses((prev) => ({ ...prev, [row.id]: "" }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.loadingText}>Loading help requests...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>User Help Requests</Text>
        <Text style={styles.subtitle}>
          Review all help requests, then respond using a quick template or a custom reply.
        </Text>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.empty}>No help requests have been submitted yet.</Text>
      ) : (
        rows.map((row) => {
          const customDraft = customResponses[row.id] ?? "";
          return (
            <View key={row.id} style={styles.card}>
              <Text style={styles.meta}>Submitted {formatWhen(row.created_at)}</Text>
              <Text style={styles.userLine}>Student: {row.student_name}</Text>
              <Text style={styles.userLine}>Tutor: {row.tutor_name}</Text>
              <Text style={styles.message}>{row.message}</Text>
              {row.refund_requested ? <Text style={styles.refundBadge}>Refund Requested</Text> : null}
              <Text style={styles.blockLabel}>Quick Responses</Text>
              <View style={styles.quickWrap}>
                {DEFAULT_RESPONSES.map((text) => (
                  <Pressable
                    key={`${row.id}-${text}`}
                    style={styles.quickBtn}
                    onPress={() => void sendResponse(row, text)}
                    disabled={busyId === row.id}
                  >
                    <Text style={styles.quickBtnText}>{text}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.blockLabel}>Custom Response</Text>
              <TextInput
                style={styles.input}
                multiline
                value={customDraft}
                onChangeText={(text) => setCustomResponses((prev) => ({ ...prev, [row.id]: text }))}
                placeholder="Write a custom response..."
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                style={[styles.sendBtn, (!customDraft.trim() || busyId === row.id) && styles.sendBtnDisabled]}
                disabled={!customDraft.trim() || busyId === row.id}
                onPress={() => void sendResponse(row, customDraft)}
              >
                {busyId === row.id ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Send Response</Text>
                )}
              </Pressable>
              {row.admin_response ? (
                <View style={styles.responseCard}>
                  <Text style={styles.responseLabel}>Latest response</Text>
                  <Text style={styles.responseText}>{row.admin_response}</Text>
                  {row.responded_at ? <Text style={styles.meta}>Sent {formatWhen(row.responded_at)}</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F4F8" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F2F4F8" },
  loadingText: { marginTop: 10, fontSize: 14, color: "#59627A" },
  headerCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 18, marginBottom: 16 },
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
  meta: { fontSize: 12, color: "#6B7280" },
  userLine: { marginTop: 3, color: NAVY, fontWeight: "600" },
  message: { marginTop: 10, color: "#374151", fontSize: 14, lineHeight: 20 },
  refundBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "700",
    fontSize: 12,
  },
  blockLabel: { marginTop: 12, marginBottom: 8, fontSize: 12, color: "#6B7280", fontWeight: "800" },
  quickWrap: { gap: 8 },
  quickBtn: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 10, backgroundColor: "#F8FAFC" },
  quickBtnText: { color: NAVY, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    minHeight: 90,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    color: NAVY,
  },
  sendBtn: { marginTop: 10, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", paddingVertical: 12 },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: "#FFF", fontWeight: "700" },
  responseCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
  },
  responseLabel: { fontSize: 12, fontWeight: "800", color: "#1D4ED8", marginBottom: 4 },
  responseText: { color: "#1F2937", fontSize: 14, lineHeight: 20 },
});
