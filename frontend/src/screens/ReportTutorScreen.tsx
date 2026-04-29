import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
  "Report Tutor": { tutorId: number; tutorName: string; sessionId?: number };
};

const REPORT_REASONS = [
  "No show / didn't attend",
  "Misrepresented credentials",
  "Inappropriate behavior",
  "Poor quality tutoring",
  "Other",
];

export default function ReportTutorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RootStackParamList, "Report Tutor">["route"]>();
  const { tutorId, tutorName, sessionId } = route.params;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fullReason = selectedReason
    ? details.trim()
      ? `${selectedReason}: ${details.trim()}`
      : selectedReason
    : details.trim();

  const isValid = fullReason.length >= 20;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert("Required", "Please provide at least 20 characters describing the issue.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/reports/", {
        tutor_id: tutorId,
        session_id: sessionId ?? null,
        reason: fullReason,
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#2F3850" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Tutor</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#1F7A4C" />
          </View>
          <Text style={styles.confirmationTitle}>Report Submitted</Text>
          <Text style={styles.confirmationBody}>
            Thank you for your report. Our team will review it and take appropriate action.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Tutor</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tutor info */}
        <View style={styles.tutorCard}>
          <View style={styles.tutorAvatar}>
            <Ionicons name="person" size={28} color="#5D667C" />
          </View>
          <View>
            <Text style={styles.tutorName}>{tutorName}</Text>
            <Text style={styles.tutorSubtitle}>
              {sessionId ? `Session #${sessionId}` : "No session linked"}
            </Text>
          </View>
        </View>

        {/* Reason selector */}
        <Text style={styles.sectionTitle}>What's the issue?</Text>
        <Text style={styles.sectionSubtitle}>Select a category (optional)</Text>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason}
            style={[styles.reasonChip, selectedReason === reason && styles.reasonChipActive]}
            onPress={() => setSelectedReason(selectedReason === reason ? null : reason)}
          >
            <Text style={[styles.reasonChipText, selectedReason === reason && styles.reasonChipTextActive]}>
              {reason}
            </Text>
            {selectedReason === reason && (
              <Ionicons name="checkmark-circle" size={18} color={BLUE} />
            )}
          </TouchableOpacity>
        ))}

        {/* Details */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Details *</Text>
        <Text style={styles.sectionSubtitle}>
          Please describe the issue in detail (minimum 20 characters)
        </Text>
        <TextInput
          style={styles.detailsInput}
          placeholder="Describe what happened..."
          placeholderTextColor="#B0B6C3"
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, fullReason.length < 20 && { color: "#E74C3C" }]}>
          {fullReason.length} / 20 minimum characters
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="flag" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          False reports may result in account penalties. Reports are reviewed by our admin team.
        </Text>
      </ScrollView>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  tutorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    gap: 14,
  },
  tutorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  tutorName: { fontSize: 17, fontWeight: "700", color: NAVY },
  tutorSubtitle: { fontSize: 13, color: "#8C93A4", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: NAVY, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: "#5D667C", marginBottom: 12 },
  reasonChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#E1E5EE",
  },
  reasonChipActive: { borderColor: BLUE, backgroundColor: "#F0F4FF" },
  reasonChipText: { fontSize: 15, color: "#3A4357" },
  reasonChipTextActive: { color: BLUE, fontWeight: "600" },
  detailsInput: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    padding: 14,
    fontSize: 15,
    color: NAVY,
    minHeight: 120,
  },
  charCount: { fontSize: 12, color: "#8C93A4", marginTop: 6, marginBottom: 20, textAlign: "right" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  submitBtnDisabled: { backgroundColor: "#9CA3AF" },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  disclaimer: { fontSize: 12, color: "#8C93A4", textAlign: "center", lineHeight: 18 },
  // Confirmation
  confirmationContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  confirmationIcon: { marginBottom: 20 },
  confirmationTitle: { fontSize: 24, fontWeight: "700", color: NAVY, marginBottom: 12 },
  confirmationBody: {
    fontSize: 15,
    color: "#5D667C",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});