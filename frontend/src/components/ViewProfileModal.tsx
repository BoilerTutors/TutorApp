import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";

export type UserProfileDetails = {
  id: number;
  first_name: string;
  last_name: string;
  is_tutor: boolean;
  is_student: boolean;
  student_average_help_level: number | null;
  tutor?: {
    bio: string | null;
    major: string | null;
    grad_year: number | null;
    preferred_locations: string[] | null;
    help_provided: string[] | null;
  } | null;
  student?: {
    bio: string | null;
    major: string | null;
    grad_year: number | null;
    preferred_locations: string[] | null;
    help_needed: string[] | null;
  } | null;
};

type ViewProfileModalProps = {
  visible: boolean;
  userId: number | null;
  onClose: () => void;
  onLoadError?: (message: string) => void;
};

export default function ViewProfileModal({ visible, userId, onClose, onLoadError }: ViewProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileDetails | null>(null);

  useEffect(() => {
    if (!visible || userId == null) {
      setLoading(false);
      setProfileData(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const details = await api.get<UserProfileDetails>(`/users/${userId}/profile`);
        if (!cancelled) {
          setProfileData(details);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load profile";
          onLoadError?.(message);
          onClose();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, onClose, onLoadError]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {loading ? (
            <ActivityIndicator size="small" color="#2E57A2" />
          ) : profileData ? (
            <>
              <Text style={styles.modalTitle}>
                {profileData.first_name} {profileData.last_name}
              </Text>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Bio</Text>
                <Text style={styles.modalValue}>
                  {profileData.tutor?.bio ?? profileData.student?.bio ?? "—"}
                </Text>
                <Text style={styles.modalLabel}>Major</Text>
                <Text style={styles.modalValue}>
                  {profileData.tutor?.major ?? profileData.student?.major ?? "—"}
                </Text>
                <Text style={styles.modalLabel}>Grad year</Text>
                <Text style={styles.modalValue}>
                  {profileData.tutor?.grad_year ?? profileData.student?.grad_year ?? "—"}
                </Text>
                <Text style={styles.modalLabel}>Location</Text>
                <Text style={styles.modalValue}>
                  {(
                    profileData.tutor?.preferred_locations ??
                    profileData.student?.preferred_locations ??
                    []
                  ).join(", ") || "—"}
                </Text>
                {profileData.is_student ? (
                  <>
                    <Text style={styles.modalLabel}>Amount of help needed</Text>
                    <Text style={styles.modalValue}>
                      {profileData.student_average_help_level != null
                        ? `${profileData.student_average_help_level.toFixed(1)} / 10`
                        : "—"}
                    </Text>
                  </>
                ) : null}
                {profileData.is_student ? (
                  <>
                    <Text style={styles.modalLabel}>Type of help needed</Text>
                    <Text style={styles.modalValue}>
                      {(profileData.student?.help_needed ?? []).join(", ") || "—"}
                    </Text>
                  </>
                ) : null}
                {profileData.is_tutor ? (
                  <>
                    <Text style={styles.modalLabel}>Type of help provided</Text>
                    <Text style={styles.modalValue}>
                      {(profileData.tutor?.help_provided ?? []).join(", ") || "—"}
                    </Text>
                  </>
                ) : null}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.modalEmpty}>No profile data found.</Text>
          )}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2D50",
    marginBottom: 12,
  },
  modalBody: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
  },
  modalValue: {
    fontSize: 14,
    color: "#1F2937",
    marginTop: 2,
  },
  modalEmpty: {
    color: "#6F7890",
    marginBottom: 10,
  },
  closeBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
