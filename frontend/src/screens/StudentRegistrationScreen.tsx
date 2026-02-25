import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { api } from "../api/client";

type RootStackParamList = {
  Login: undefined;
  "Student Dashboard": undefined;
  "Student Registration": {
    email: string;
    password: string;
    role: "tutor" | "student";
  };
};

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
  }
};

const splitFullName = (full: string): [string, string] => {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0]];
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  return [first, last];
};

export default function StudentRegistrationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Student Registration">>();
  const { email, password } = route.params;

  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      showAlert("Error", "Please enter your full name.");
      return;
    }
    if (!email?.trim() || !password) {
      showAlert("Error", "Missing email or password from the previous step.");
      return;
    }

    const [firstName, lastName] = splitFullName(trimmed);
    const gradYearNum = gradYear.trim() ? parseInt(gradYear.trim(), 10) : undefined;
    if (gradYear.trim() && (Number.isNaN(gradYearNum) || gradYearNum < 1900 || gradYearNum > 2100)) {
      showAlert("Error", "Please enter a valid graduation year (e.g. 2026).");
      return;
    }

    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      is_tutor: false,
      is_student: true,
      student_profile: {
        major: major.trim() || undefined,
        grad_year: gradYearNum,
      },
    };

    setSubmitting(true);
    try {
      await api.post("/users", payload);
      setIsSubmitted(true);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Registration failed. Please check your details and try again.";
      showAlert("Registration failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate("Login");
  };

  if (isSubmitted) {
    return (
      <View style={styles.screen}>
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={80} color="#34A853" />
            </View>
            <Text style={styles.successTitle}>Registration Complete!</Text>
            <Text style={styles.successMessage}>
              Your student account has been created. Sign in with your email and password to continue.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goToLogin}>
              <Text style={styles.primaryBtnText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#2F3850" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Registration</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.stepTitle}>Your details</Text>
          <Text style={styles.stepSubtitle}>We'll use this to match you with tutors.</Text>

          <Text style={styles.label}>Full name *</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Jane Doe"
              placeholderTextColor="#8C93A4"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Major (optional)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={major}
              onChangeText={setMajor}
              placeholder="e.g. Computer Science"
              placeholderTextColor="#8C93A4"
            />
          </View>

          <Text style={styles.label}>Expected graduation year (optional)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={gradYear}
              onChangeText={setGradYear}
              placeholder="e.g. 2026"
              placeholderTextColor="#8C93A4"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? "Creating account…" : "Complete Registration"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F3850",
  },
  form: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#5D667C",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A4357",
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#2F3850",
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: "#2E57A2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: "#5D667C",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: "#2E57A2",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
