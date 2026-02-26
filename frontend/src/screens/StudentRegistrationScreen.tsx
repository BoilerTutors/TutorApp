import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
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

// Same class list as tutor registration; in production, fetch from backend
const AVAILABLE_CLASSES = [
  { id: 1, courseCode: "CS 180", title: "Problem Solving And Object-Oriented Programming" },
  { id: 2, courseCode: "CS 182", title: "Foundations of Computer Science" },
  { id: 3, courseCode: "CS 240", title: "Programming in C" },
  { id: 4, courseCode: "CS 250", title: "Computer Architecture" },
  { id: 5, courseCode: "CS 251", title: "Data Structures and Algorithms" },
  { id: 6, courseCode: "CS 307", title: "Software Engineering I" },
  { id: 7, courseCode: "CS 354", title: "Operating Systems" },
  { id: 8, courseCode: "CS 373", title: "Data Mining & Machine Learning" },
  { id: 9, courseCode: "CS 407", title: "Software Engineering II" },
  { id: 10, courseCode: "MA 161", title: "Plane Analytic Geometry And Calculus I" },
  { id: 11, courseCode: "MA 162", title: "Plane Analytic Geometry And Calculus II" },
  { id: 12, courseCode: "MA 265", title: "Linear Algebra" },
  { id: 13, courseCode: "PHYS 172", title: "Modern Mechanics" },
  { id: 14, courseCode: "PHYS 272", title: "Electric and Magnetic Interactions" },
];

const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"];
const HELP_LEVEL_LABELS: Record<number, string> = {
  1: "1 - Just started",
  2: "2",
  3: "3",
  4: "4",
  5: "5 - Some grasp",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10 - Need a lot of help",
};

const PURDUE_LOCATIONS = [
  "Lawson Computer Science Building",
  "Wilmeth Active Learning Center (WALC)",
  "Hicks Undergraduate Library",
  "Stewart Center",
  "Physics Building",
  "Mathematical Sciences Building",
  "PMU (Purdue Memorial Union)",
];

const HELP_TYPE_OPTIONS = [
  "Concept review",
  "Homework help",
  "Exam prep",
  "Assignment debugging",
  "Other",
];

type SessionMode = "online" | "in_person" | "both";

type SelectedStudentClass = {
  id: number;
  courseCode: string;
  title: string;
  estimatedGrade: string;
  helpLevel: number;
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

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Basic info
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");

  // Step 2: Classes
  const [selectedClasses, setSelectedClasses] = useState<SelectedStudentClass[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Step 3: Preferences
  const [sessionMode, setSessionMode] = useState<SessionMode>("both");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [helpTypes, setHelpTypes] = useState<string[]>([]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredClasses = AVAILABLE_CLASSES.filter(
    (c) =>
      !selectedClasses.find((sc) => sc.id === c.id) &&
      (c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addClass = (classItem: (typeof AVAILABLE_CLASSES)[0]) => {
    setSelectedClasses([
      ...selectedClasses,
      {
        id: classItem.id,
        courseCode: classItem.courseCode,
        title: classItem.title,
        estimatedGrade: "",
        helpLevel: 5,
      },
    ]);
    setShowClassPicker(false);
    setSearchQuery("");
  };

  const removeClass = (classId: number) => {
    setSelectedClasses(selectedClasses.filter((c) => c.id !== classId));
  };

  const updateClassDetails = (
    classId: number,
    field: "estimatedGrade" | "helpLevel",
    value: string | number
  ) => {
    setSelectedClasses(
      selectedClasses.map((c) => (c.id === classId ? { ...c, [field]: value } : c))
    );
  };

  const toggleLocation = (location: string) => {
    if (selectedLocations.includes(location)) {
      setSelectedLocations(selectedLocations.filter((l) => l !== location));
    } else {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  const toggleHelpType = (helpType: string) => {
    if (helpTypes.includes(helpType)) {
      setHelpTypes(helpTypes.filter((h) => h !== helpType));
    } else {
      setHelpTypes([...helpTypes, helpType]);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!fullName.trim()) {
          showAlert("Required", "Please enter your full name.");
          return false;
        }
        if (gradYear.trim()) {
          const n = parseInt(gradYear.trim(), 10);
          if (Number.isNaN(n) || n < 1900 || n > 2100) {
            showAlert("Invalid", "Please enter a valid graduation year (e.g. 2026).");
            return false;
          }
        }
        return true;
      case 2:
        if (selectedClasses.length === 0) {
          showAlert("Required", "Please add at least one class you need help with.");
          return false;
        }
        for (const c of selectedClasses) {
          if (!c.estimatedGrade) {
            showAlert("Required", `Please select your current/expected grade for ${c.courseCode}.`);
            return false;
          }
        }
        return true;
      case 3:
        if (
          (sessionMode === "in_person" || sessionMode === "both") &&
          selectedLocations.length === 0
        ) {
          showAlert("Required", "Please select at least one preferred tutoring location.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!email?.trim() || !password) {
      showAlert("Error", "Missing email or password from the previous step.");
      return;
    }

    const [firstName, lastName] = splitFullName(fullName);
    const gradYearNum = gradYear.trim() ? parseInt(gradYear.trim(), 10) : undefined;

    const studentClasses = selectedClasses
      .filter((c) => c.estimatedGrade)
      .map((c) => ({
        class_id: c.id,
        help_level: c.helpLevel,
        estimated_grade: c.estimatedGrade,
      }));

    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      is_tutor: false,
      is_student: true,
      student_profile: {
        bio: bio.trim() || undefined,
        major: major.trim() || undefined,
        grad_year: gradYearNum,
        classes: studentClasses.length > 0 ? studentClasses : undefined,
        preferred_locations: selectedLocations.length > 0 ? selectedLocations : undefined,
        help_needed: helpTypes.length > 0 ? helpTypes : undefined,
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

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepRow}>
          <View
            style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}
          >
            <Text
              style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}
            >
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View
              style={[styles.stepLine, currentStep > step && styles.stepLineActive]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <Text style={styles.label}>Full name *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="person" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#B0B6C3"
          value={fullName}
          onChangeText={setFullName}
        /> 
      </View>

      <Text style={styles.label}>Bio (optional)</Text>
      <View style={[styles.inputWrap, styles.textAreaWrap]}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell tutors about your goals and what support you need..."
          placeholderTextColor="#B0B6C3"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />
      </View>

      <Text style={styles.label}>Major (optional)</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="school" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="e.g. Computer Science"
          placeholderTextColor="#B0B6C3"
          value={major}
          onChangeText={setMajor}
        />
      </View>

      <Text style={styles.label}>Expected graduation year (optional)</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="calendar-outline" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="e.g. 2026"
          placeholderTextColor="#B0B6C3"
          value={gradYear}
          onChangeText={setGradYear}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Classes You Need Help With</Text>
      <Text style={styles.stepSubtitle}>
        Add classes and your current or expected grade
      </Text>

      <TouchableOpacity
        style={styles.addClassBtn}
        onPress={() => setShowClassPicker(true)}
      >
        <Ionicons name="add-circle" size={20} color="#2E57A2" />
        <Text style={styles.addClassText}>Add a Class</Text>
      </TouchableOpacity>

      {showClassPicker && (
        <View style={styles.classPickerContainer}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#8C93A4" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search classes (e.g., CS 180)"
              placeholderTextColor="#B0B6C3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowClassPicker(false)}>
              <Ionicons name="close" size={20} color="#8C93A4" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.classListScroll} nestedScrollEnabled>
            {filteredClasses.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                style={styles.classOption}
                onPress={() => addClass(classItem)}
              >
                <Text style={styles.classOptionCode}>{classItem.courseCode}</Text>
                <Text style={styles.classOptionTitle}>{classItem.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {selectedClasses.map((classItem) => (
        <View key={classItem.id} style={styles.selectedClassCard}>
          <View style={styles.selectedClassHeader}>
            <View>
              <Text style={styles.selectedClassCode}>{classItem.courseCode}</Text>
              <Text style={styles.selectedClassTitle}>{classItem.title}</Text>
            </View>
            <TouchableOpacity onPress={() => removeClass(classItem.id)}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Current / expected grade *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {GRADE_OPTIONS.map((grade) => (
                <Pressable
                  key={grade}
                  style={[
                    styles.optionChip,
                    classItem.estimatedGrade === grade && styles.optionChipActive,
                  ]}
                  onPress={() => updateClassDetails(classItem.id, "estimatedGrade", grade)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      classItem.estimatedGrade === grade && styles.optionChipTextActive,
                    ]}
                  >
                    {grade}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>How much help do you need? (1–10) *</Text>
          <View style={styles.helpLevelRow}>
            <Text style={styles.helpLevelMin}>1</Text>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.sliderDot,
                    classItem.helpLevel === level && styles.sliderDotActive,
                  ]}
                  onPress={() => updateClassDetails(classItem.id, "helpLevel", level)}
                />
              ))}
            </View>
            <Text style={styles.helpLevelMax}>10</Text>
          </View>
          <Text style={styles.helpLevelValue}>
            {HELP_LEVEL_LABELS[classItem.helpLevel]}
          </Text>
        </View>
      ))}

      {selectedClasses.length === 0 && !showClassPicker && (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color="#CCD1DC" />
          <Text style={styles.emptyStateText}>No classes added yet</Text>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tutoring Preferences</Text>
      <Text style={styles.stepSubtitle}>
        Where and how you'd like to meet tutors
      </Text>

      <Text style={styles.label}>Session mode *</Text>
      <View style={styles.modeRow}>
        {[
          { value: "online" as SessionMode, label: "Online Only", icon: "laptop-outline" },
          { value: "in_person" as SessionMode, label: "In-Person Only", icon: "location-outline" },
          { value: "both" as SessionMode, label: "Both", icon: "git-merge-outline" },
        ].map((mode) => (
          <Pressable
            key={mode.value}
            style={[styles.modeBtn, sessionMode === mode.value && styles.modeBtnActive]}
            onPress={() => setSessionMode(mode.value)}
          >
            <Ionicons
              name={mode.icon as any}
              size={20}
              color={sessionMode === mode.value ? "#2E2A1A" : "#5D667C"}
            />
            <Text
              style={[
                styles.modeBtnText,
                sessionMode === mode.value && styles.modeBtnTextActive,
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {(sessionMode === "in_person" || sessionMode === "both") && (
        <>
          <Text style={styles.label}>Preferred in-person locations *</Text>
          <View style={styles.locationsGrid}>
            {PURDUE_LOCATIONS.map((location) => (
              <Pressable
                key={location}
                style={[
                  styles.locationChip,
                  selectedLocations.includes(location) && styles.locationChipActive,
                ]}
                onPress={() => toggleLocation(location)}
              >
                <Text
                  style={[
                    styles.locationChipText,
                    selectedLocations.includes(location) && styles.locationChipTextActive,
                  ]}
                >
                  {location}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Type of help needed (optional)</Text>
      <View style={styles.locationsGrid}>
       {HELP_TYPE_OPTIONS.map((helpType) => (
          <Pressable
            key={helpType}
            style={[
              styles.locationChip,
              helpTypes.includes(helpType) && styles.locationChipActive,
            ]}
            onPress={() => toggleHelpType(helpType)}
          >
            <Text
              style={[
                styles.locationChipText,
                helpTypes.includes(helpType) && styles.locationChipTextActive,
              ]}
            >
              {helpType}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Profile</Text>
      <Text style={styles.stepSubtitle}>Make sure everything looks good</Text>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>Name</Text>
        <Text style={styles.overviewValue}>{fullName}</Text>

        {(major || gradYear) && (
          <>
            <Text style={styles.overviewLabel}>Major / Grad year</Text>
            <Text style={styles.overviewValue}>
              {[major, gradYear].filter(Boolean).join(" • ")}
            </Text>
          </>
        )}

        {bio.trim() && (
          <>
            <Text style={styles.overviewLabel}>Bio</Text>
            <Text style={styles.overviewValue}>{bio.trim()}</Text>
          </>
        )}

        <Text style={styles.overviewLabel}>Classes ({selectedClasses.length})</Text>
        {selectedClasses.map((c) => (
          <View key={c.id} style={styles.overviewClassItem}>
            <Text style={styles.overviewClassCode}>{c.courseCode}</Text>
            <Text style={styles.overviewClassDetails}>
              Grade: {c.estimatedGrade} • Help level: {c.helpLevel}/10
            </Text>
          </View>
        ))}

        <Text style={styles.overviewLabel}>Session mode</Text>
        <Text style={styles.overviewValue}>
          {sessionMode === "both"
            ? "Online & In-Person"
            : sessionMode === "online"
              ? "Online Only"
              : "In-Person Only"}
        </Text>

        {selectedLocations.length > 0 && (
          <>
            <Text style={styles.overviewLabel}>Locations</Text>
            <Text style={styles.overviewValue}>{selectedLocations.join(", ")}</Text>
          </>
        )}

        {helpTypes.length > 0 && (
          <>
            <Text style={styles.overviewLabel}>Type of help</Text>
            <Text style={styles.overviewValue}>{helpTypes.join(", ")}</Text>
          </>
        )}
      </View>
    </View>
  );

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

        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.navButtons}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.prevBtn} onPress={prevStep}>
            <Text style={styles.prevBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 1 && { flex: 1 }]}
            onPress={nextStep}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? "Creating account…" : "Complete Registration"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  scrollContent: {
    paddingBottom: 100,
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
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F3850",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FFF",
  },
  stepRow: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8EBF0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#D4AF4A" },
  stepNumber: { fontSize: 14, fontWeight: "600", color: "#8C93A4" },
  stepNumberActive: { color: "#2E2A1A" },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: "#E8EBF0",
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: "#D4AF4A" },
  stepContent: { padding: 16 },
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
  textAreaWrap: {
    height: 100,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#2F3850",
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  addClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderWidth: 2,
    borderColor: "#2E57A2",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#F8FAFF",
  },
  addClassText: { marginLeft: 8, fontSize: 15, fontWeight: "600", color: "#2E57A2" },
  classPickerContainer: {
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    maxHeight: 280,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: "#2F3850" },
  classListScroll: { maxHeight: 200 },
  classOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  classOptionCode: { fontSize: 15, fontWeight: "600", color: "#2E57A2" },
  classOptionTitle: { fontSize: 13, color: "#5D667C", marginTop: 2 },
  selectedClassCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  selectedClassHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  selectedClassCode: { fontSize: 16, fontWeight: "700", color: "#2E57A2" },
  selectedClassTitle: { fontSize: 13, color: "#5D667C", marginTop: 2, maxWidth: 260 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#3A4357", marginTop: 12, marginBottom: 8 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  optionChipActive: { backgroundColor: "#D4AF4A", borderColor: "#C9A23E" },
  optionChipText: { fontSize: 13, fontWeight: "600", color: "#5D667C" },
  optionChipTextActive: { color: "#2E2A1A" },
  helpLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  helpLevelMin: { fontSize: 12, color: "#8C93A4", width: 12 },
  helpLevelMax: { fontSize: 12, color: "#8C93A4", width: 12 },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E1E5EE",
    borderWidth: 2,
    borderColor: "#CCD1DC",
  },
  sliderDotActive: {
    backgroundColor: "#2E57A2",
    borderColor: "#2E57A2",
  },
  helpLevelValue: {
    fontSize: 12,
    color: "#5D667C",
    marginTop: 6,
  },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateText: { marginTop: 12, fontSize: 15, color: "#8C93A4" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  modeBtnActive: { backgroundColor: "#D4AF4A", borderColor: "#C9A23E" },
  modeBtnText: { marginTop: 6, fontSize: 12, fontWeight: "600", color: "#5D667C" },
  modeBtnTextActive: { color: "#2E2A1A" },
  locationsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  locationChipActive: { backgroundColor: "#E8F4EC", borderColor: "#34A853" },
  locationChipText: { fontSize: 13, color: "#5D667C" },
  locationChipTextActive: { color: "#1E7E34", fontWeight: "600" },
  overviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8C93A4",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 4,
  },
  overviewValue: { fontSize: 15, color: "#2F3850" },
  overviewClassItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  overviewClassCode: { fontSize: 15, fontWeight: "600", color: "#2E57A2" },
  overviewClassDetails: { fontSize: 13, color: "#5D667C", marginTop: 2 },
  navButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    paddingBottom: 30,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EBF0",
    gap: 12,
  },
  prevBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  prevBtnText: { fontSize: 16, fontWeight: "600", color: "#5D667C" },
  nextBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#2E57A2",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#34A853",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
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
  successIconWrap: { marginBottom: 20 },
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
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
