import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubmitted(true);
    setContactMessage("");
  };

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
        <Text style={styles.contactLabel}>
          Describe your question or issue below. An administrator will respond as
          soon as possible.
        </Text>
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
        <Pressable
          style={[styles.submitButton, !contactMessage.trim() && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!contactMessage.trim()}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </Pressable>
        {submitted && (
          <Text style={styles.submitSuccess}>
            Thank you! Your message has been submitted. We will get back to you
            shortly.
          </Text>
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
});
