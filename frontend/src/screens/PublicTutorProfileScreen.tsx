import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { api } from "../api/client";

type RootStackParamList = {
  "Public Tutor Profile": { tutorUserId: number };
};

type TutorClassWithClassPublic = {
  id: number;
  class_id: number;
  course_code: string;
  grade_received: string;
  semester: string;
  year_taken: number;
  has_taed: boolean;
  hourly_rate_cents?: number | null;
};

type PublicTutorProfile = {
  id: number;
  first_name: string;
  last_name: string;
  tutor: {
    bio?: string | null;
    major?: string | null;
    grad_year?: number | null;
    average_rating?: number | null;
    preferred_locations?: string[] | null;
    help_provided?: string[] | null;
    classes_tutoring?: TutorClassWithClassPublic[];
  };
};

export default function PublicTutorProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Public Tutor Profile">>();
  const tutorUserId = route.params?.tutorUserId;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicTutorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!tutorUserId) {
        if (mounted) {
          setError("Missing tutor id.");
          setLoading(false);
        }
        return;
      }
      try {
        const data = await api.get<PublicTutorProfile>(`/users/public/tutors/${tutorUserId}`);
        if (!mounted) return;
        setProfile(data);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load tutor profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [tutorUserId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E57A2" />
        <Text style={styles.helper}>Loading tutor profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Tutor profile not found."}</Text>
      </View>
    );
  }

  const t = profile.tutor;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}
        </Text>
        <Text style={styles.sub}>
          {t.major ? `${t.major}` : "Tutor"}
          {t.grad_year ? ` · Class of ${t.grad_year}` : ""}
        </Text>
        <Text style={styles.label}>Average rating</Text>
        <Text style={styles.value}>{t.average_rating != null ? t.average_rating.toFixed(2) : "No ratings yet"}</Text>
        <Text style={styles.label}>Bio</Text>
        <Text style={styles.value}>{t.bio?.trim() ? t.bio : "No bio yet."}</Text>
        {(t.preferred_locations?.length ?? 0) > 0 ? (
          <>
            <Text style={styles.label}>Preferred locations</Text>
            <Text style={styles.value}>{t.preferred_locations!.join(", ")}</Text>
          </>
        ) : null}
        {(t.help_provided?.length ?? 0) > 0 ? (
          <>
            <Text style={styles.label}>Help offered</Text>
            <Text style={styles.value}>{t.help_provided!.join(", ")}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Classes</Text>
        {(t.classes_tutoring?.length ?? 0) === 0 ? (
          <Text style={styles.value}>No classes listed.</Text>
        ) : (
          t.classes_tutoring!.map((c) => (
            <View key={c.id} style={styles.classRow}>
              <Text style={styles.classCode}>{c.course_code}</Text>
              <Text style={styles.classMeta}>
                Grade {c.grade_received} · {c.semester} {c.year_taken}
                {c.has_taed ? " · TA'd" : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
    padding: 16,
  },
  helper: { marginTop: 10, color: "#5D667C" },
  error: { color: "#B91C1C", fontSize: 15, textAlign: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  name: { fontSize: 24, fontWeight: "700", color: "#1B2D50" },
  sub: { marginTop: 4, color: "#5D667C", marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 8, marginBottom: 2 },
  value: { fontSize: 15, color: "#111827" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1B2D50", marginBottom: 8 },
  classRow: { marginBottom: 10 },
  classCode: { fontSize: 15, fontWeight: "700", color: "#2E57A2" },
  classMeta: { color: "#5D667C", marginTop: 2 },
});

