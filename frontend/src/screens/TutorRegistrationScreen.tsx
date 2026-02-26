// src/screens/TutorRegistrationScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { 
  classesApi, 
  ClassPublic, 
  TutorClassCreate,
  UserCreate,
} from "../services/api";

type RootStackParamList = {
  Login: undefined;
  "Tutor Dashboard": undefined;
  "Tutor Registration": undefined;
};

const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

type SelectedClass = ClassPublic & {
  semester: "F" | "S";
  year_taken: number;
  grade_received: string;
};

// Helper to show alerts cross-platform
const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    // React Native Alert would go here
    console.log(title, message);
  }
};

export default function TutorRegistrationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register, login, token } = useAuth();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Step 1: Account Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Tutor Profile
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Step 3: Class Selection
  const [availableClasses, setAvailableClasses] = useState<ClassPublic[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Success state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch available classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    
    // Use mock data for demo - replace with API call when backend has classes
    const mockClasses = [
      { id: 1, subject: "CS", class_number: 180, professor: "Dunsmore" },
      { id: 2, subject: "CS", class_number: 182, professor: "Adams" },
      { id: 3, subject: "CS", class_number: 240, professor: "Turkstra" },
      { id: 4, subject: "CS", class_number: 251, professor: "Turkstra" },
      { id: 5, subject: "CS", class_number: 307, professor: "Hashemi" },
      { id: 6, subject: "CS", class_number: 354, professor: "Gustafson" },
      { id: 7, subject: "MA", class_number: 161, professor: "Chen" },
      { id: 8, subject: "MA", class_number: 162, professor: "Chen" },
      { id: 9, subject: "MA", class_number: 265, professor: "Dey" },
      { id: 10, subject: "PHYS", class_number: 172, professor: "Bhatt" },
    ];
  
    setAvailableClasses(mockClasses);
    setIsLoadingClasses(false);
  };

  // Filter classes based on search
  const filteredClasses = availableClasses.filter(
    (c) =>
      !selectedClasses.find((sc) => sc.id === c.id) &&
      (`${c.subject} ${c.class_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.professor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add a class to selection
  const addClass = (classItem: ClassPublic) => {
    const currentYear = new Date().getFullYear();
    setSelectedClasses([
      ...selectedClasses,
      {
        ...classItem,
        semester: "F",
        year_taken: currentYear - 1,
        grade_received: "",
      },
    ]);
    setShowClassPicker(false);
    setSearchQuery("");
  };

  // Remove a class from selection
  const removeClass = (classId: number) => {
    setSelectedClasses(selectedClasses.filter((c) => c.id !== classId));
  };

  // Update class details
  const updateClassDetails = (
    classId: number,
    field: "semester" | "year_taken" | "grade_received",
    value: string | number
  ) => {
    setSelectedClasses(
      selectedClasses.map((c) =>
        c.id === classId ? { ...c, [field]: value } : c
      )
    );
  };

  // Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!firstName.trim()) {
          showAlert("Required", "Please enter your first name");
          return false;
        }
        if (!lastName.trim()) {
          showAlert("Required", "Please enter your last name");
          return false;
        }
        if (!email.trim() || !email.includes("@purdue.edu")) {
          showAlert("Required", "Please enter a valid Purdue email (@purdue.edu)");
          return false;
        }
        if (password.length < 8) {
          showAlert("Required", "Password must be at least 8 characters");
          return false;
        }
        if (password !== confirmPassword) {
          showAlert("Error", "Passwords do not match");
          return false;
        }
        return true;
      case 2:
        // Bio and other fields are optional
        return true;
      case 3:
        if (selectedClasses.length === 0) {
          showAlert("Required", "Please select at least one class to tutor");
          return false;
        }
        for (const c of selectedClasses) {
          if (!c.grade_received) {
            showAlert("Required", `Please select a grade for ${c.subject} ${c.class_number}`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      console.log("Starting registration...");
      
      // For demo: Skip API call and show success
      // TODO: Re-enable when backend is ready
      /*
      const userData: UserCreate = {
        email: email.toLowerCase().trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password: password,
        is_tutor: true,
        is_student: true,
        tutor_profile: {
          bio: bio.trim() || undefined,
          major: major.trim() || undefined,
          grad_year: gradYear ? parseInt(gradYear) : undefined,
          hourly_rate_cents: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : undefined,
        },
      };
  
      await register(userData);
      await login({ email: userData.email, password: password });
      */
      
      // Simulate success for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsSubmitted(true);
      
    } catch (err) {
      console.error("Registration error:", err);
      const message = err instanceof Error ? err.message : "Registration failed";
      showAlert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepRow}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Step 1: Account Info
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Enter your Purdue credentials</Text>

      <Text style={styles.label}>First Name *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="person" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#B0B6C3"
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>

      <Text style={styles.label}>Last Name *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="person" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#B0B6C3"
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

      <Text style={styles.label}>Purdue Email *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="mail" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="you@purdue.edu"
          placeholderTextColor="#B0B6C3"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <Text style={styles.label}>Password *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          placeholderTextColor="#B0B6C3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Text style={styles.label}>Confirm Password *</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor="#B0B6C3"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>
    </View>
  );

  // Step 2: Tutor Profile
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tutor Profile</Text>
      <Text style={styles.stepSubtitle}>Tell students about yourself (optional)</Text>

      <Text style={styles.label}>Bio</Text>
      <View style={[styles.inputWrap, styles.textAreaWrap]}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell students about yourself, your teaching style..."
          placeholderTextColor="#B0B6C3"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />
      </View>

      <Text style={styles.label}>Major</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="school" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="e.g., Computer Science"
          placeholderTextColor="#B0B6C3"
          value={major}
          onChangeText={setMajor}
        />
      </View>

      <Text style={styles.label}>Expected Graduation Year</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="calendar" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="e.g., 2026"
          placeholderTextColor="#B0B6C3"
          value={gradYear}
          onChangeText={setGradYear}
          keyboardType="number-pad"
        />
      </View>

      <Text style={styles.label}>Hourly Rate ($)</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="cash" size={18} color="#8C93A4" />
        <TextInput
          style={styles.input}
          placeholder="e.g., 25.00"
          placeholderTextColor="#B0B6C3"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );

  // Step 3: Class Selection
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Classes You'll Tutor</Text>
      <Text style={styles.stepSubtitle}>Select classes and provide your credentials</Text>

      {/* Add Class Button */}
      <TouchableOpacity
        style={styles.addClassBtn}
        onPress={() => setShowClassPicker(true)}
      >
        <Ionicons name="add-circle" size={20} color="#2E57A2" />
        <Text style={styles.addClassText}>Add a Class</Text>
      </TouchableOpacity>

      {/* Class Picker */}
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
            {isLoadingClasses ? (
              <ActivityIndicator style={{ padding: 20 }} />
            ) : filteredClasses.length === 0 ? (
              <Text style={styles.noResultsText}>No classes found</Text>
            ) : (
              filteredClasses.map((classItem) => (
                <TouchableOpacity
                  key={classItem.id}
                  style={styles.classOption}
                  onPress={() => addClass(classItem)}
                >
                  <Text style={styles.classOptionCode}>
                    {classItem.subject} {classItem.class_number}
                  </Text>
                  <Text style={styles.classOptionTitle}>
                    Prof. {classItem.professor}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Selected Classes */}
      {selectedClasses.map((classItem) => (
        <View key={classItem.id} style={styles.selectedClassCard}>
          <View style={styles.selectedClassHeader}>
            <View>
              <Text style={styles.selectedClassCode}>
                {classItem.subject} {classItem.class_number}
              </Text>
              <Text style={styles.selectedClassTitle}>
                Prof. {classItem.professor}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeClass(classItem.id)}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
          </View>

          {/* Grade Selection */}
          <Text style={styles.fieldLabel}>Grade Received *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {GRADE_OPTIONS.map((grade) => (
                <Pressable
                  key={grade}
                  style={[
                    styles.optionChip,
                    classItem.grade_received === grade && styles.optionChipActive,
                  ]}
                  onPress={() => updateClassDetails(classItem.id, "grade_received", grade)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      classItem.grade_received === grade && styles.optionChipTextActive,
                    ]}
                  >
                    {grade}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Semester Selection */}
          <Text style={styles.fieldLabel}>Semester Taken *</Text>
          <View style={styles.semesterRow}>
            <Pressable
              style={[
                styles.semesterBtn,
                classItem.semester === "F" && styles.semesterBtnActive,
              ]}
              onPress={() => updateClassDetails(classItem.id, "semester", "F")}
            >
              <Text
                style={[
                  styles.semesterBtnText,
                  classItem.semester === "F" && styles.semesterBtnTextActive,
                ]}
              >
                Fall
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.semesterBtn,
                classItem.semester === "S" && styles.semesterBtnActive,
              ]}
              onPress={() => updateClassDetails(classItem.id, "semester", "S")}
            >
              <Text
                style={[
                  styles.semesterBtnText,
                  classItem.semester === "S" && styles.semesterBtnTextActive,
                ]}
              >
                Spring
              </Text>
            </Pressable>
            <View style={styles.yearInputWrap}>
              <TextInput
                style={styles.yearInput}
                value={classItem.year_taken.toString()}
                onChangeText={(text) => {
                  const year = parseInt(text) || new Date().getFullYear();
                  updateClassDetails(classItem.id, "year_taken", year);
                }}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>
      ))}

      {selectedClasses.length === 0 && !showClassPicker && (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color="#CCD1DC" />
          <Text style={styles.emptyStateText}>No classes selected yet</Text>
        </View>
      )}
    </View>
  );

  // Step 4: Overview
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Profile</Text>
      <Text style={styles.stepSubtitle}>Make sure everything looks good</Text>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>Account</Text>
        <Text style={styles.overviewValue}>{firstName} {lastName}</Text>
        <Text style={styles.overviewValueSmall}>{email}</Text>

        {(bio || major || gradYear) && (
          <>
            <Text style={styles.overviewLabel}>Profile</Text>
            {bio && <Text style={styles.overviewValue}>{bio}</Text>}
            {major && <Text style={styles.overviewValueSmall}>Major: {major}</Text>}
            {gradYear && <Text style={styles.overviewValueSmall}>Graduation: {gradYear}</Text>}
            {hourlyRate && <Text style={styles.overviewValueSmall}>Rate: ${hourlyRate}/hr</Text>}
          </>
        )}

        <Text style={styles.overviewLabel}>Classes ({selectedClasses.length})</Text>
        {selectedClasses.map((c) => (
          <View key={c.id} style={styles.overviewClassItem}>
            <Text style={styles.overviewClassCode}>
              {c.subject} {c.class_number}
            </Text>
            <Text style={styles.overviewClassDetails}>
              Grade: {c.grade_received} • {c.semester === "F" ? "Fall" : "Spring"} {c.year_taken}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Success screen
  const renderSuccessScreen = () => (
    <View style={styles.successContainer}>
      <View style={styles.successCard}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={80} color="#34A853" />
        </View>
        <Text style={styles.successTitle}>Registration Complete!</Text>
        <Text style={styles.successMessage}>
          Your tutor profile has been created. You can now log in and start tutoring!
        </Text>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => navigation.navigate("Tutor Dashboard")}
        >
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isSubmitted) {
    return (
      <View style={styles.screen}>
        {renderSuccessScreen()}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#2F3850" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tutor Registration</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderStepIndicator()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Navigation Buttons */}
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
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Complete Registration</Text>
            )}
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
  backBtn: {
    padding: 4,
  },
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
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8EBF0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#D4AF4A",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8C93A4",
  },
  stepNumberActive: {
    color: "#2E2A1A",
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: "#E8EBF0",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#D4AF4A",
  },
  stepContent: {
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
  addClassText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#2E57A2",
  },
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#2F3850",
  },
  classListScroll: {
    maxHeight: 200,
  },
  classOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  classOptionCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E57A2",
  },
  classOptionTitle: {
    fontSize: 13,
    color: "#5D667C",
    marginTop: 2,
  },
  noResultsText: {
    padding: 20,
    textAlign: "center",
    color: "#8C93A4",
  },
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
  selectedClassCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E57A2",
  },
  selectedClassTitle: {
    fontSize: 13,
    color: "#5D667C",
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3A4357",
    marginTop: 12,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  optionChipActive: {
    backgroundColor: "#D4AF4A",
    borderColor: "#C9A23E",
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5D667C",
  },
  optionChipTextActive: {
    color: "#2E2A1A",
  },
  semesterRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  semesterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  semesterBtnActive: {
    backgroundColor: "#D4AF4A",
    borderColor: "#C9A23E",
  },
  semesterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5D667C",
  },
  semesterBtnTextActive: {
    color: "#2E2A1A",
  },
  yearInputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 8,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  yearInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2F3850",
    width: 60,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    color: "#8C93A4",
  },
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
  overviewValue: {
    fontSize: 15,
    color: "#2F3850",
  },
  overviewValueSmall: {
    fontSize: 13,
    color: "#5D667C",
    marginTop: 2,
  },
  overviewClassItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  overviewClassCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E57A2",
  },
  overviewClassDetails: {
    fontSize: 13,
    color: "#5D667C",
    marginTop: 2,
  },
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
  prevBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D667C",
  },
  nextBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#2E57A2",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#34A853",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
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
  dashboardBtn: {
    backgroundColor: "#2E57A2",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  dashboardBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});