import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
  Messenger: { openTutorUserId?: number; openTutorName?: string } | undefined;
};

type FavoriteTutor = {
  favorite_id: number;
  tutor_id: number;
  first_name: string;
  last_name: string;
  major: string | null;
  bio: string | null;
  hourly_rate_cents: number | null;
  average_rating: number | null;
  review_count: number;
  subjects: string[];
  created_at: string;
};

const NAVY = "#1B2D50";
const RED = "#E74C3C";
const BLUE = "#2E57A2";

function formatRate(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}/hr`;
}

function renderStars(rating: number | null): string {
  if (rating == null) return "No reviews yet";
  const rounded = Math.round(rating * 10) / 10;
  return `${rounded.toFixed(1)} ★`;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [favorites, setFavorites] = useState<FavoriteTutor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<FavoriteTutor[]>("/favorites/me");
      setFavorites(result);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites])
  );

  const removeFavorite = (tutor: FavoriteTutor) => {
    Alert.alert(
      "Remove from favorites?",
      `${tutor.first_name} ${tutor.last_name} will be removed from your favorites. They will still appear in your session history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/favorites/${tutor.tutor_id}`);
              setFavorites((prev) => prev.filter((f) => f.tutor_id !== tutor.tutor_id));
            } catch (e) {
              const message = e instanceof Error ? e.message : "Failed to remove favorite";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </Pressable>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color="#CCD1DC" />
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart on a tutor in your session history to save them here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.countLabel}>
            {favorites.length} favorite tutor{favorites.length !== 1 ? "s" : ""}
          </Text>

          {favorites.map((tutor) => (
            <View key={tutor.favorite_id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={26} color="#FFF" />
                </View>
                <View style={styles.tutorInfo}>
                  <Text style={styles.tutorName}>
                    {tutor.first_name} {tutor.last_name}
                  </Text>
                  {tutor.major ? (
                    <Text style={styles.major}>{tutor.major}</Text>
                  ) : null}
                  <View style={styles.ratingRow}>
                    <Text
                      style={[
                        styles.rating,
                        tutor.average_rating == null && styles.ratingMuted,
                      ]}
                    >
                      {renderStars(tutor.average_rating)}
                    </Text>
                    {tutor.review_count > 0 ? (
                      <Text style={styles.reviewCount}>
                        ({tutor.review_count} review{tutor.review_count !== 1 ? "s" : ""})
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => removeFavorite(tutor)}
                  hitSlop={8}
                  style={styles.heartBtn}
                >
                  <Ionicons name="heart" size={22} color={RED} />
                </Pressable>
              </View>

              {tutor.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {tutor.bio}
                </Text>
              ) : null}

              {tutor.subjects.length > 0 ? (
                <View style={styles.subjectRow}>
                  {tutor.subjects.slice(0, 4).map((s) => (
                    <View key={s} style={styles.subjectChip}>
                      <Text style={styles.subjectChipText}>{s}</Text>
                    </View>
                  ))}
                  {tutor.subjects.length > 4 ? (
                    <Text style={styles.moreSubjects}>+{tutor.subjects.length - 4} more</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.rate}>{formatRate(tutor.hourly_rate_cents)}</Text>
                <Pressable
                  style={styles.messageBtn}
                  onPress={() =>
                    navigation.navigate("Messenger", {
                      openTutorUserId: tutor.tutor_id,
                      openTutorName: `${tutor.first_name} ${tutor.last_name}`,
                    })
                  }
                >
                  <Ionicons name="chatbubble-outline" size={14} color="#FFF" />
                  <Text style={styles.messageBtnText}>Message</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#5D667C" },
  emptySubtext: {
    marginTop: 6,
    fontSize: 14,
    color: "#8C93A4",
    textAlign: "center",
    lineHeight: 20,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  countLabel: {
    fontSize: 13,
    color: "#5D667C",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
  },
  major: {
    fontSize: 13,
    color: BLUE,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4AF4A",
  },
  ratingMuted: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  reviewCount: {
    fontSize: 12,
    color: "#8C93A4",
  },
  heartBtn: {
    padding: 4,
  },
  bio: {
    marginTop: 12,
    fontSize: 13,
    color: "#5D667C",
    lineHeight: 18,
  },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    alignItems: "center",
  },
  subjectChip: {
    backgroundColor: "#F2F4F8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: NAVY,
  },
  moreSubjects: {
    fontSize: 12,
    color: "#8C93A4",
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  rate: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
});