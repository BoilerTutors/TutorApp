import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "1",
    question: "How do I find a tutor?",
    answer:
      "Go to your Student Dashboard and tap 'Find Tutors' to browse available tutors. You can also use 'Calculate Matches' to get personalized tutor recommendations based on your needs.",
  },
  {
    id: "2",
    question: "How do I schedule a session?",
    answer:
      "From the Student Dashboard, tap 'Book Session' to view tutor availability and schedule a tutoring session. Tutors can manage their availability under 'Availability' in their dashboard.",
  },
  {
    id: "3",
    question: "How does messaging work?",
    answer:
      "Tap 'Messages' or 'Messenger' from your dashboard to view and send messages to your matched tutors or students. You'll receive notifications for new messages.",
  },
  {
    id: "4",
    question: "How do I update my profile?",
    answer:
      "Tap 'My Profile' or 'Profile' from your dashboard to view and edit your profile information, including your bio, subjects, and availability.",
  },
  {
    id: "5",
    question: "Who can I contact for support?",
    answer:
      "Use the Contact an Administrator section below to send a message directly to our team. We typically respond within 1-2 business days.",
  },
];

type MeRole = "student" | "tutor" | null;

type MatchedPeer = {
  id: number;
  first_name: string;
  last_name: string;
};

type MatchRowStudent = {
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
};

type MatchRowTutor = {
  student_id: number;
  student_first_name: string;
  student_last_name: string;
};

type AdminMessageHistory = {
  id: number;
  student_id: number;
  tutor_id: number;
  message: string;
  refund_requested: boolean;
  created_at: string;
  admin_response: string | null;
  responded_at: string | null;
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

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<MeRole>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [peers, setPeers] = useState<MatchedPeer[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
  const [refundRequested, setRefundRequested] = useState(false);
  const [contactMessage, setContactMessage] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [myRequests, setMyRequests] = useState<AdminMessageHistory[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const trimmedMessage = contactMessage.trim();

  useEffect(() => {
    let mounted = true;
    const loadPeersForRole = async () => {
      try {
        setLoading(true);
        const me = await api.get<{ is_tutor: boolean; is_student: boolean }>("/users/me");
        if (!mounted) return;

        if (me.is_tutor) {
          setMeRole("tutor");
          const rows = await api.get<MatchRowTutor[]>("/matches/tutor/me");
          if (!mounted) return;
          const mapped: MatchedPeer[] = (rows ?? []).map((r) => ({
            id: r.student_id,
            first_name: r.student_first_name,
            last_name: r.student_last_name,
          }));
          setPeers(mapped);
          setSelectedPeerId(mapped[0]?.id ?? null);
        } else if (me.is_student) {
          setMeRole("student");
          const rows = await api.get<MatchRowStudent[]>("/matches/me");
          if (!mounted) return;
          const mapped: MatchedPeer[] = (rows ?? []).map((r) => ({
            id: r.tutor_id,
            first_name: r.tutor_first_name,
            last_name: r.tutor_last_name,
          }));
          setPeers(mapped);
          setSelectedPeerId(mapped[0]?.id ?? null);
        } else {
          setMeRole(null);
          setPeers([]);
          setSelectedPeerId(null);
        }
      } catch (e) {
        if (!mounted) return;
        Alert.alert(
          "Error",
          e instanceof Error ? e.message : "Failed to load matches for contacting admin."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void loadPeersForRole();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const rows = await api.get<AdminMessageHistory[]>("/admin-messages/me");
      setMyRequests(Array.isArray(rows) ? rows : []);
    } catch {
      setMyRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    void loadMyRequests();
  }, []);

  const selectedPeerLabel = useMemo(() => {
    const selected = peers.find((p) => p.id === selectedPeerId);
    if (!selected) return meRole === "tutor" ? "No student selected" : "No tutor selected";
    return `${selected.first_name} ${selected.last_name}`;
  }, [peers, selectedPeerId, meRole]);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = async () => {
    if (meRole !== "student" && meRole !== "tutor") {
      Alert.alert("Unavailable", "This contact form is only for student or tutor accounts.");
      return;
    }
    if (selectedPeerId == null) {
      Alert.alert(
        meRole === "tutor" ? "Student required" : "Tutor required",
        meRole === "tutor"
          ? "Please select a matched student."
          : "Please select a matched tutor."
      );
      return;
    }
    if (!trimmedMessage) {
      Alert.alert("Message required", "Please enter your message to admin.");
      return;
    }
    try {
      setSubmitting(true);
      if (meRole === "student") {
        await api.post("/admin-messages/", {
          tutor_id: selectedPeerId,
          message: trimmedMessage,
          refund_requested: refundRequested,
        });
      } else {
        await api.post("/admin-messages/", {
          student_id: selectedPeerId,
          message: trimmedMessage,
          refund_requested: refundRequested,
        });
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSubmitted(true);
      setContactMessage("");
      setRefundRequested(false);
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert("You have successfully contacted the admin team.");
      } else {
        Alert.alert("Success", "You have successfully contacted the admin team.");
      }
      await loadMyRequests();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit admin message.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectLabel = meRole === "tutor" ? "Select Student" : "Select Tutor";
  const contactIntro =
    meRole === "tutor"
      ? "Select a student, optionally request a refund, and describe your issue below."
      : "Select a tutor, optionally request a refund, and describe your issue below.";
  const loadingPeersLabel =
    meRole === "tutor" ? "Loading matched students..." : "Loading matched tutors...";
  const emptyPeersLabel =
    meRole === "tutor"
      ? "You need an active matched student to submit this form."
      : "You need an active matched tutor to submit this form.";
  const selectedHintPrefix = meRole === "tutor" ? "Selected student" : "Selected tutor";

  const formDisabled =
    meRole == null ||
    loading ||
    peers.length === 0 ||
    selectedPeerId == null ||
    !trimmedMessage ||
    submitting;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* FAQ Section */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {FAQ_ITEMS.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <Pressable
            key={item.id}
            style={styles.faqItem}
            onPress={() => toggleFaq(item.id)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={NAVY}
                style={styles.faqIcon}
              />
            </View>
            {isExpanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
          </Pressable>
        );
      })}

      {/* Contact Section */}
      <Text style={[styles.sectionTitle, styles.contactSectionTitle]}>
        Contact an Administrator
      </Text>
      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>{contactIntro}</Text>
        <Text style={styles.contactFieldLabel}>{selectLabel}</Text>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={NAVY} />
            <Text style={styles.helperText}>{loadingPeersLabel}</Text>
          </View>
        ) : meRole == null ? (
          <Text style={styles.helperText}>Contacting admin from this screen requires a student or tutor account.</Text>
        ) : peers.length === 0 ? (
          <Text style={styles.helperText}>{emptyPeersLabel}</Text>
        ) : (
          peers.map((peer) => {
            const isSelected = selectedPeerId === peer.id;
            return (
              <Pressable
                key={peer.id}
                style={[styles.peerRow, isSelected && styles.peerRowSelected]}
                onPress={() => setSelectedPeerId(peer.id)}
              >
                <Text style={[styles.peerName, isSelected && styles.peerNameSelected]}>
                  {peer.first_name} {peer.last_name}
                </Text>
                {isSelected ? <Ionicons name="checkmark-circle" size={18} color="#2E57A2" /> : null}
              </Pressable>
            );
          })
        )}
        <Pressable
          style={[styles.refundRow, refundRequested && styles.refundRowActive]}
          onPress={() => setRefundRequested((prev) => !prev)}
        >
          <View style={styles.refundTextWrap}>
            <Text style={styles.refundTitle}>Refund Option</Text>
            <Text style={styles.refundSubtitle}>
              Toggle this if this admin message is requesting a refund.
            </Text>
          </View>
          <Ionicons
            name={refundRequested ? "checkbox" : "square-outline"}
            size={22}
            color={refundRequested ? "#2E57A2" : "#6B7280"}
          />
        </Pressable>
        <Text style={styles.contactFieldLabel}>Message</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message here..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={contactMessage}
          onChangeText={(text) => {
            setContactMessage(text);
            if (submitted) setSubmitted(false);
          }}
        />
        <Text style={styles.selectedPeerHint}>
          {selectedHintPrefix}: {selectedPeerLabel}
        </Text>
        <Pressable
          style={[styles.submitButton, formDisabled && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={formDisabled}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Send to Admin</Text>
          )}
        </Pressable>
        {submitted && (
          <Text style={styles.submitSuccess}>
            Thank you! Your message has been submitted. We will get back to you
            shortly.
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, styles.contactSectionTitle]}>Your Help Requests</Text>
      <View style={styles.contactCard}>
        {loadingRequests ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={NAVY} />
            <Text style={styles.helperText}>Loading your requests...</Text>
          </View>
        ) : myRequests.length === 0 ? (
          <Text style={styles.helperText}>You have not submitted any help requests yet.</Text>
        ) : (
          myRequests.map((row) => (
            <View key={row.id} style={styles.historyCard}>
              <Text style={styles.historyMeta}>Sent {formatWhen(row.created_at)}</Text>
              <Text style={styles.historyBody}>{row.message}</Text>
              {row.refund_requested ? <Text style={styles.historyRefund}>Refund requested</Text> : null}
              {row.admin_response ? (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Admin response</Text>
                  <Text style={styles.responseBody}>{row.admin_response}</Text>
                  {row.responded_at ? (
                    <Text style={styles.historyMeta}>Replied {formatWhen(row.responded_at)}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.pendingReply}>Awaiting admin response</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const NAVY = "#1B2D50";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
  },
  faqIcon: {
    marginLeft: 8,
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  contactSectionTitle: {
    marginTop: 24,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contactLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: NAVY,
    minHeight: 120,
    backgroundColor: "#F9FAFB",
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  submitSuccess: {
    marginTop: 12,
    fontSize: 14,
    color: "#059669",
    textAlign: "center",
  },
  contactFieldLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: NAVY,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  helperText: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 4,
  },
  peerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  peerRowSelected: {
    borderColor: "#2E57A2",
    backgroundColor: "#EEF3FF",
  },
  peerName: {
    fontSize: 14,
    color: "#374151",
  },
  peerNameSelected: {
    color: "#1B2D50",
    fontWeight: "700",
  },
  refundRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  refundRowActive: {
    borderColor: "#2E57A2",
    backgroundColor: "#EEF3FF",
  },
  refundTextWrap: {
    flex: 1,
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B2D50",
  },
  refundSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  selectedPeerHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  historyCard: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  historyMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  historyBody: {
    marginTop: 6,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  historyRefund: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontWeight: "700",
    fontSize: 12,
  },
  pendingReply: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
  },
  responseBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 10,
  },
  responseLabel: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "800",
    marginBottom: 4,
  },
  responseBody: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 4,
  },
});
