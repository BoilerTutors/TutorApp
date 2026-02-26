import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { logout } from "../auth/logout";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

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
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMe();
    }, [loadMe])
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
          <Text style={styles.placeholder}>No preferences set yet.</Text>
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
  errorText: { fontSize: 16, color: "#6B7280" },
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
});
