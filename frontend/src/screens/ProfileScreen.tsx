import React, { useCallback, useEffect, useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, setAuthToken } from "../api/client";
import { loadToken } from "../auth/storage";
import { logout } from "../auth/logout";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import {
  AVAILABLE_CLASSES_FALLBACK,
  GRADE_OPTIONS,
  SEMESTER_OPTIONS,
  PURDUE_LOCATIONS,
  HELP_TYPE_OPTIONS,
} from "../constants/classes";

type TutorClassWithClass = {
  id: number;
  tutor_id: number;
  class_id: number;
  semester: string;
  year_taken: number;
  grade_received: string;
  has_taed: boolean;
  course_code: string;
  professor?: string | null;
};

type SelectedClassEdit = {
  id?: number;
  class_id: number;
  courseCode: string;
  title?: string;
  semesterTaken: string;
  gradeReceived: string;
  hasTAed: boolean;
};

type MeResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_tutor: boolean;
  is_student: boolean;
  tutor?: {
    id: number;
    user_id: number;
    bio: string | null;
    major: string | null;
    grad_year: number | null;
    preferred_locations?: string[] | null;
    help_provided?: string[] | null;
    session_mode?: string | null;
    classes_tutoring?: TutorClassWithClass[];
  } | null;
  student?: {
    id: number;
    user_id: number;
    bio: string | null;
    major: string | null;
    grad_year: number | null;
  } | null;
};

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
};

const DELETE_CONFIRM_TEXT = "DELETE";

/** Map backend semester (F/S) + year to display string */
function formatSemester(semester: string, year: number): string {
  const season = semester === "F" ? "Fall" : "Spring";
  return `${season} ${year}`;
}

/** Map "Fall 2025" to backend semester and year */
function parseSemester(s: string): { semester: "F" | "S"; year_taken: number } | null {
  const m = s.match(/^(Fall|Spring)\s+(\d{4})$/);
  if (!m) return null;
  return {
    semester: m[1] === "Fall" ? "F" : "S",
    year_taken: parseInt(m[2], 10),
  };
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editBio, setEditBio] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Tutoring preferences editing state
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [editClasses, setEditClasses] = useState<SelectedClassEdit[]>([]);
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [editSessionMode, setEditSessionMode] = useState<"online" | "in_person" | "both">("both");
  const [editHelpProvided, setEditHelpProvided] = useState<string[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [availableClasses, setAvailableClasses] = useState<
    { id: number; courseCode: string; title?: string }[]
  >(AVAILABLE_CLASSES_FALLBACK);

  const loadMe = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>("/users/me");
      setMe(data);
      setEditFirstName(data.first_name);
      setEditLastName(data.last_name);
      const major =
        data.tutor?.major ?? data.student?.major ?? "";
      const year =
        data.tutor?.grad_year ?? data.student?.grad_year ?? null;
      setEditMajor(major ?? "");
      setEditYear(year != null ? String(year) : "");
      setEditBio(data.tutor?.bio ?? data.student?.bio ?? "");
    } catch (e) {
      // 401/session expired: onUnauthorized handles alert + navigation to Login
      const isSessionExpired = e instanceof Error && e.message.includes("session has expired");
      if (!isSessionExpired) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const token = await loadToken();
        if (token) setAuthToken(token);
        setLoading(true);
        loadMe();
      };
      run();
    }, [loadMe])
  );

  // Fetch available classes from backend (fallback to mock)
  useEffect(() => {
    let cancelled = false;
    const loadClasses = async () => {
      try {
        const data = await api.get<{ id: number; subject: string; class_number: number; professor?: string; course_code?: string }[]>(
          "/classes/"
        );
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setAvailableClasses(
            data.map((c) => ({
              id: c.id,
              courseCode: c.course_code ?? `${c.subject} ${c.class_number}`,
              title: c.professor ?? "",
            }))
          );
        } else {
          setAvailableClasses(AVAILABLE_CLASSES_FALLBACK);
        }
      } catch {
        if (!cancelled) setAvailableClasses(AVAILABLE_CLASSES_FALLBACK);
      }
    };
    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  const startEditingPrefs = useCallback(() => {
    const t = me?.tutor;
    setEditClasses(
      (t?.classes_tutoring ?? []).map((c) => ({
        id: c.id,
        class_id: c.class_id,
        courseCode: c.course_code,
        semesterTaken: formatSemester(c.semester, c.year_taken),
        gradeReceived: c.grade_received,
        hasTAed: c.has_taed,
      }))
    );
    setEditLocations(t?.preferred_locations ?? []);
    setEditSessionMode((t?.session_mode as "online" | "in_person" | "both") ?? "both");
    setEditHelpProvided(t?.help_provided ?? []);
    setEditingPrefs(true);
  }, [me?.tutor]);

  const cancelEditingPrefs = useCallback(() => {
    setEditingPrefs(false);
    setShowClassPicker(false);
    setClassSearchQuery("");
  }, []);

  const addClass = (c: { id: number; courseCode: string; title?: string }) => {
    if (editClasses.some((x) => x.class_id === c.id)) return;
    setEditClasses([
      ...editClasses,
      {
        class_id: c.id,
        courseCode: c.courseCode,
        title: c.title,
        semesterTaken: "",
        gradeReceived: "",
        hasTAed: false,
      },
    ]);
    setShowClassPicker(false);
    setClassSearchQuery("");
  };

  const removeClass = (classId: number) => {
    setEditClasses(editClasses.filter((x) => x.class_id !== classId));
  };

  const updateClassField = (
    classId: number,
    field: "semesterTaken" | "gradeReceived" | "hasTAed",
    value: string | boolean
  ) => {
    setEditClasses(
      editClasses.map((x) =>
        x.class_id === classId ? { ...x, [field]: value } : x
      )
    );
  };

  const toggleLocation = (loc: string) => {
    setEditLocations(
      editLocations.includes(loc) ? editLocations.filter((l) => l !== loc) : [...editLocations, loc]
    );
  };

  const toggleHelp = (h: string) => {
    setEditHelpProvided(
      editHelpProvided.includes(h) ? editHelpProvided.filter((x) => x !== h) : [...editHelpProvided, h]
    );
  };

  const handleSavePrefs = async () => {
    if (!me?.tutor) return;
    const valid = editClasses.every((c) => c.gradeReceived && c.semesterTaken);
    if (!valid) {
      Alert.alert("Required", "Please complete grade and semester for each class.");
      return;
    }
    if ((editSessionMode === "in_person" || editSessionMode === "both") && editLocations.length === 0) {
      Alert.alert("Required", "Please select at least one tutoring location.");
      return;
    }
    setSavingPrefs(true);
    try {
      const classes = editClasses
        .map((c) => {
          const parsed = parseSemester(c.semesterTaken);
          if (!parsed || !c.gradeReceived) return null;
          return {
            class_id: c.class_id,
            semester: parsed.semester,
            year_taken: parsed.year_taken,
            grade_received: c.gradeReceived,
            has_taed: c.hasTAed,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const body: {
        first_name?: string;
        last_name?: string;
        tutor_profile?: {
          preferred_locations?: string[];
          help_provided?: string[];
          session_mode?: string;
          classes?: typeof classes;
        };
      } = {};
      body.tutor_profile = {
        preferred_locations: editLocations,
        help_provided: editHelpProvided.length > 0 ? editHelpProvided : undefined,
        session_mode: editSessionMode === "both" ? undefined : editSessionMode,
        classes,
      };
      const updated = await api.patch<MeResponse>("/users/me", body);
      setMe(updated);
      setEditingPrefs(false);
      setShowClassPicker(false);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const filteredAvailableClasses = availableClasses.filter(
    (c) =>
      !editClasses.some((x) => x.class_id === c.id) &&
      (c.courseCode.toLowerCase().includes(classSearchQuery.toLowerCase()) ||
        (c.title ?? "").toLowerCase().includes(classSearchQuery.toLowerCase()))
  );

  const handleSave = async () => {
    if (!me) return;
    setSaving(true);
    try {
      const body: {
        first_name?: string;
        last_name?: string;
        tutor_profile?: { bio?: string; major?: string; grad_year?: number };
        student_profile?: { bio?: string; major?: string; grad_year?: number };
      } = {
        first_name: editFirstName.trim() || undefined,
        last_name: editLastName.trim() || undefined,
      };
      const major = editMajor.trim() || undefined;
      const year = editYear.trim() ? parseInt(editYear.trim(), 10) : undefined;
      if (me.is_tutor) {
        body.tutor_profile = {
          bio: editBio.trim() || undefined,
          major,
          grad_year: year,
        };
      }
      if (me.is_student) {
        body.student_profile = {
          bio: editBio.trim() || undefined,
          major,
          grad_year: year,
        };
      }
      const updated = await api.patch<MeResponse>("/users/me", body);
      setMe(updated);
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim().toUpperCase() !== DELETE_CONFIRM_TEXT) {
      Alert.alert("Invalid confirmation", `Please type ${DELETE_CONFIRM_TEXT} to confirm.`);
      return;
    }
    setDeleting(true);
    try {
      await api.post("/users/me/delete", { confirmation: DELETE_CONFIRM_TEXT });
      await logout();
      setDeleteModalVisible(false);
      setDeleteConfirmInput("");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !me) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E57A2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!me) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load profile.</Text>
        <Pressable
          style={[styles.button, styles.retryButton]}
          onPress={() => {
            setLoading(true);
            loadMe();
          }}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const fullName = `${me.first_name} ${me.last_name}`.trim();
  const major = me.tutor?.major ?? me.student?.major ?? "";
  const year = me.tutor?.grad_year ?? me.student?.grad_year ?? null;
  const bio = me.tutor?.bio ?? me.student?.bio ?? "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        {editing ? (
          <>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="First name"
              autoCapitalize="words"
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Last name"
              autoCapitalize="words"
            />
            <Text style={styles.label}>Major</Text>
            <TextInput
              style={styles.input}
              value={editMajor}
              onChangeText={setEditMajor}
              placeholder="Major"
            />
            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={editYear}
              onChangeText={setEditYear}
              placeholder="Graduation year"
              keyboardType="number-pad"
            />
            {(me.is_tutor || me.is_student) && (
              <>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Bio"
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
            <View style={styles.row}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Full name</Text>
            <Text style={styles.value}>{fullName || "—"}</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{me.email}</Text>
            <Text style={styles.label}>Major</Text>
            <Text style={styles.value}>{major || "—"}</Text>
            <Text style={styles.label}>Year</Text>
            <Text style={styles.value}>{year != null ? String(year) : "—"}</Text>
            {(me.is_tutor || me.is_student || bio) && (
              <>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.value}>{bio || "—"}</Text>
              </>
            )}
            <Pressable style={styles.button} onPress={() => setEditing(true)}>
              <Text style={styles.buttonText}>Edit profile</Text>
            </Pressable>
          </>
        )}
      </View>

      {me.is_tutor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tutoring preferences</Text>
          {editingPrefs ? (
            <>
              {/* Classes */}
              <Text style={styles.label}>Classes you tutor</Text>
              <TouchableOpacity
                style={styles.addClassBtn}
                onPress={() => setShowClassPicker(true)}
              >
                <Ionicons name="add-circle" size={20} color="#2E57A2" />
                <Text style={styles.addClassText}>Add a class</Text>
              </TouchableOpacity>
              {showClassPicker && (
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={styles.classPickerContainer}
                >
                  <View style={styles.searchWrap}>
                    <Ionicons name="search" size={18} color="#8C93A4" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search classes (e.g., CS 180)"
                      placeholderTextColor="#B0B6C3"
                      value={classSearchQuery}
                      onChangeText={setClassSearchQuery}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowClassPicker(false)}>
                      <Ionicons name="close" size={20} color="#8C93A4" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.classListScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {filteredAvailableClasses.length === 0 ? (
                      <Text style={styles.classPickerEmpty}>
                        {classSearchQuery ? "No matching classes" : "No classes available"}
                      </Text>
                    ) : (
                      filteredAvailableClasses.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.classOption}
                          onPress={() => addClass(c)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.classOptionCode}>{c.courseCode}</Text>
                          <Text style={styles.classOptionTitle}>{c.title ?? ""}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </KeyboardAvoidingView>
              )}
              {editClasses.map((c) => (
                <View key={c.class_id} style={styles.classCard}>
                  <View style={styles.classCardHeader}>
                    <Text style={styles.classCardCode}>{c.courseCode}</Text>
                    <Pressable onPress={() => removeClass(c.class_id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.fieldLabel}>Grade</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {GRADE_OPTIONS.map((g) => (
                        <Pressable
                          key={g}
                          style={[styles.chip, c.gradeReceived === g && styles.chipActive]}
                          onPress={() => updateClassField(c.class_id, "gradeReceived", g)}
                        >
                          <Text style={[styles.chipText, c.gradeReceived === g && styles.chipTextActive]}>{g}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={styles.fieldLabel}>Semester taken</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {SEMESTER_OPTIONS.map((s) => (
                        <Pressable
                          key={s}
                          style={[styles.chip, c.semesterTaken === s && styles.chipActive]}
                          onPress={() => updateClassField(c.class_id, "semesterTaken", s)}
                        >
                          <Text style={[styles.chipText, c.semesterTaken === s && styles.chipTextActive]}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                  <Pressable
                    style={styles.checkboxRow}
                    onPress={() => updateClassField(c.class_id, "hasTAed", !c.hasTAed)}
                  >
                    <View style={[styles.checkbox, c.hasTAed && styles.checkboxActive]}>
                      {c.hasTAed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>I have TA'd for this class</Text>
                  </Pressable>
                </View>
              ))}

              {/* Session mode */}
              <Text style={styles.label}>Session mode</Text>
              <View style={styles.chipRow}>
                {(["online", "in_person", "both"] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.chip, editSessionMode === m && styles.chipActive]}
                    onPress={() => setEditSessionMode(m)}
                  >
                    <Text style={[styles.chipText, editSessionMode === m && styles.chipTextActive]}>
                      {m === "both" ? "Online & In-Person" : m === "online" ? "Online" : "In-Person"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Locations */}
              {(editSessionMode === "in_person" || editSessionMode === "both") && (
                <>
                  <Text style={styles.label}>Preferred locations</Text>
                  <View style={styles.chipRowWrap}>
                    {PURDUE_LOCATIONS.map((loc) => (
                      <Pressable
                        key={loc}
                        style={[styles.chip, editLocations.includes(loc) && styles.chipActive]}
                        onPress={() => toggleLocation(loc)}
                      >
                        <Text style={[styles.chipText, editLocations.includes(loc) && styles.chipTextActive]}>
                          {loc}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Help provided */}
              <Text style={styles.label}>Type of help you provide</Text>
              <View style={styles.chipRowWrap}>
                {HELP_TYPE_OPTIONS.map((h) => (
                  <Pressable
                    key={h}
                    style={[styles.chip, editHelpProvided.includes(h) && styles.chipActive]}
                    onPress={() => toggleHelp(h)}
                  >
                    <Text style={[styles.chipText, editHelpProvided.includes(h) && styles.chipTextActive]}>
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={cancelEditingPrefs}
                  disabled={savingPrefs}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.button} onPress={handleSavePrefs} disabled={savingPrefs}>
                  {savingPrefs ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {(me.tutor?.classes_tutoring?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.label}>Classes</Text>
                  {me.tutor!.classes_tutoring!.map((c) => (
                    <View key={c.id} style={styles.prefItem}>
                      <Text style={styles.prefValue}>
                        {c.course_code} — Grade: {c.grade_received}, {formatSemester(c.semester, c.year_taken)}
                        {c.has_taed ? " • TA'd" : ""}
                      </Text>
                    </View>
                  ))}
                </>
              )}
              <Text style={styles.label}>Session mode</Text>
              <Text style={styles.value}>
                {me.tutor?.session_mode === "both" || !me.tutor?.session_mode
                  ? "Online & In-Person"
                  : me.tutor.session_mode === "online"
                  ? "Online"
                  : "In-Person"}
              </Text>
              {(me.tutor?.preferred_locations?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.label}>Locations</Text>
                  <Text style={styles.value}>{me.tutor!.preferred_locations!.join(", ")}</Text>
                </>
              )}
              {(me.tutor?.help_provided?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.label}>Help provided</Text>
                  <Text style={styles.value}>{me.tutor!.help_provided!.join(", ")}</Text>
                </>
              )}
              {((me.tutor?.classes_tutoring?.length ?? 0) === 0 &&
                (me.tutor?.preferred_locations?.length ?? 0) === 0 &&
                (me.tutor?.help_provided?.length ?? 0) === 0 &&
                !me.tutor?.session_mode) && (
                <Text style={styles.placeholder}>No preferences set yet.</Text>
              )}
              <Pressable style={styles.button} onPress={startEditingPrefs}>
                <Text style={styles.buttonText}>Edit preferences</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {(me.is_student || me.is_tutor) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your availability</Text>
          <Text style={styles.sectionSubtitle}>
            When you're available for sessions. Add time slots for each day.
          </Text>
          <AvailabilityCalendar />
        </View>
      )}

      <View style={styles.section}>
        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={() => {
            setDeleteConfirmInput("");
            setDeleteModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>Delete account</Text>
        </Pressable>
      </View>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalBody}>
              This action is permanent. All your data will be deleted and cannot be recovered.
            </Text>
            <Text style={styles.modalBody}>
              Type <Text style={styles.deleteWord}>{DELETE_CONFIRM_TEXT}</Text> below to confirm.
            </Text>
            <TextInput
              style={styles.input}
              value={deleteConfirmInput}
              onChangeText={setDeleteConfirmInput}
              placeholder={`Type ${DELETE_CONFIRM_TEXT}`}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.dangerButton]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmInput.trim().toUpperCase() !== DELETE_CONFIRM_TEXT}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Delete my account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f8" },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f4f8",
  },
  loadingText: { marginTop: 10, fontSize: 14, color: "#59627A" },
  errorText: { fontSize: 16, color: "#6B7280", marginBottom: 16, textAlign: "center" },
  retryButton: { alignSelf: "center", paddingHorizontal: 24, flex: 0 },
  section: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1B2D50",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  value: { fontSize: 16, color: "#111827", marginBottom: 12 },
  placeholder: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: {
    flex: 1,
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: { backgroundColor: "#6B7280" },
  dangerButton: { backgroundColor: "#B91C1C" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#111827" },
  modalBody: { fontSize: 15, color: "#374151", marginBottom: 8 },
  deleteWord: { fontWeight: "700", color: "#B91C1C" },
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
    marginBottom: 12,
  },
  addClassText: { marginLeft: 8, fontSize: 15, fontWeight: "600", color: "#2E57A2" },
  classPickerContainer: {
    marginBottom: 12,
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
  classPickerEmpty: {
    padding: 16,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  classCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  classCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  classCardCode: { fontSize: 16, fontWeight: "700", color: "#2E57A2" },
  removeText: { fontSize: 14, color: "#B91C1C", fontWeight: "500" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#DBEAFE", borderColor: "#2E57A2" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#1E40AF" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: "#2E57A2", borderColor: "#2E57A2" },
  checkmark: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 14, color: "#374151" },
  prefItem: { marginBottom: 8 },
  prefValue: { fontSize: 15, color: "#111827" },
});
