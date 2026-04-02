import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
};

type MatchedTutor = {
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
};

export default function ContactAdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchedTutors, setMatchedTutors] = useState<MatchedTutor[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState<number | null>(null);
  const [refundRequested, setRefundRequested] = useState(false);
  const [message, setMessage] = useState("");
  const trimmedMessage = message.trim();

  useEffect(() => {
    let mounted = true;
    const loadMatchedTutors = async () => {
      try {
        setLoading(true);
        const rows = await api.get<MatchedTutor[]>("/matches/me");
        if (!mounted) return;
        setMatchedTutors(rows ?? []);
        if (rows?.length) {
          setSelectedTutorId(rows[0].tutor_id);
        }
      } catch (e) {
        if (!mounted) return;
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to load matched tutors.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void loadMatchedTutors();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedTutorLabel = useMemo(() => {
    const selected = matchedTutors.find((t) => t.tutor_id === selectedTutorId);
    if (!selected) return "No tutor selected";
    return `${selected.tutor_first_name} ${selected.tutor_last_name}`;
  }, [matchedTutors, selectedTutorId]);

  const onSubmit = async () => {
    if (selectedTutorId == null) {
      Alert.alert("Tutor required", "Please select a matched tutor.");
      return;
    }
    if (!trimmedMessage) {
      Alert.alert("Message required", "Please enter your message to admin.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/admin-messages/", {
        tutor_id: selectedTutorId,
        message: trimmedMessage,
        refund_requested: refundRequested,
      });
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert("You have successfully contacted the admin team.");
        }
        navigation.navigate("Student Dashboard");
        return;
      }
      Alert.alert(
        "Success",
        "You have successfully contacted the admin team.",
        [{ text: "OK", onPress: () => navigation.navigate("Student Dashboard") }]
      );
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit admin message.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E57A2" />
        <Text style={styles.helperText}>Loading matched tutors...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Contact Admin</Text>
      <Text style={styles.subtitle}>
        Send a message to admin and optionally request a refund for a matched tutor.
      </Text>

      <Text style={styles.sectionLabel}>Select Tutor</Text>
      {matchedTutors.length === 0 ? (
        <Text style={styles.helperText}>You need an active matched tutor to submit this form.</Text>
      ) : (
        matchedTutors.map((tutor) => {
          const selected = selectedTutorId === tutor.tutor_id;
          return (
            <Pressable
              key={tutor.tutor_id}
              style={[styles.tutorRow, selected && styles.tutorRowSelected]}
              onPress={() => setSelectedTutorId(tutor.tutor_id)}
            >
              <Text style={[styles.tutorName, selected && styles.tutorNameSelected]}>
                {tutor.tutor_first_name} {tutor.tutor_last_name}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={18} color="#2E57A2" /> : null}
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

      <Text style={styles.sectionLabel}>Message</Text>
      <TextInput
        style={styles.messageInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Describe the issue for admin..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
      <Text style={styles.selectedTutorHint}>Selected tutor: {selectedTutorLabel}</Text>

      <Pressable
        style={[
          styles.submitBtn,
          (matchedTutors.length === 0 || selectedTutorId == null || !trimmedMessage || submitting) &&
            styles.submitBtnDisabled,
        ]}
        onPress={onSubmit}
        disabled={matchedTutors.length === 0 || selectedTutorId == null || !trimmedMessage || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Send to Admin</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B2D50",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 20,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2D50",
  },
  tutorRow: {
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
  tutorRowSelected: {
    borderColor: "#2E57A2",
    backgroundColor: "#EEF3FF",
  },
  tutorName: {
    fontSize: 14,
    color: "#374151",
  },
  tutorNameSelected: {
    color: "#1B2D50",
    fontWeight: "700",
  },
  refundRow: {
    marginTop: 12,
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
  messageInput: {
    borderWidth: 1,
    borderColor: "#D5DCE8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    minHeight: 130,
    color: "#111827",
  },
  selectedTutorHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  helperText: {
    color: "#6B7280",
    fontSize: 13,
  },
});
