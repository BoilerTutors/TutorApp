import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
  "Tutor Profile Reviews": { tutorUserId: number; tutorName: string };
};

type ReviewPublic = {
  id: number;
  session_id: number;
  class_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
};

type SortOption = "recent" | "oldest" | "highest" | "lowest";

export default function TutorProfileReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RootStackParamList, "Tutor Profile Reviews">["route"]>();
  const { tutorUserId, tutorName } = route.params;

  const [reviews, setReviews] = useState<ReviewPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<ReviewPublic[]>(`/reviews/tutor/${tutorUserId}`);
        setReviews(data);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [tutorUserId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const ratingCounts = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter((r) => Math.round(r.rating) === rating).length,
        percentage:
          reviews.length > 0
            ? (reviews.filter((r) => Math.round(r.rating) === rating).length / reviews.length) * 100
            : 0,
      })),
    [reviews]
  );

  const sortedReviews = useMemo(() => {
    const copy = [...reviews];
    switch (sortBy) {
      case "recent":
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "highest":
        return copy.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return copy.sort((a, b) => a.rating - b.rating);
    }
  }, [reviews, sortBy]);

  const getSortLabel = (opt: SortOption) => {
    switch (opt) {
      case "recent": return "Most Recent";
      case "oldest": return "Oldest First";
      case "highest": return "Highest Rating";
      case "lowest": return "Lowest Rating";
    }
  };

  const renderStars = (rating: number, size = 16) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={s <= Math.round(rating) ? GOLD : "#CCD1DC"}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tutorName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary Card */}
          {reviews.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.avgSection}>
                  <Text style={styles.avgNumber}>{averageRating}</Text>
                  {renderStars(parseFloat(averageRating!), 22)}
                  <Text style={styles.totalReviews}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
                </View>
                <View style={styles.breakdown}>
                  {ratingCounts.map(({ rating, count, percentage }) => (
                    <View key={rating} style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>{rating}</Text>
                      <Ionicons name="star" size={11} color={GOLD} />
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${percentage}%` }]} />
                      </View>
                      <Text style={styles.ratingCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Sort bar */}
          <View style={styles.sortBar}>
            <Text style={styles.sectionTitle}>
              {reviews.length > 0 ? "All Reviews" : "No Reviews Yet"}
            </Text>
            {reviews.length > 0 && (
              <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
                <Ionicons name="funnel-outline" size={16} color={BLUE} />
                <Text style={styles.sortBtnText}>{getSortLabel(sortBy)}</Text>
                <Ionicons name="chevron-down" size={14} color={BLUE} />
              </TouchableOpacity>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#CCD1DC" />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>This tutor hasn't received any reviews</Text>
            </View>
          ) : (
            sortedReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewerRow}>
                    <View style={styles.avatar}>
                      <Ionicons
                        name={review.is_anonymous ? "person-outline" : "person"}
                        size={18}
                        color="#5D667C"
                      />
                    </View>
                    <Text style={styles.reviewerName}>
                      {review.is_anonymous ? "Anonymous Student" : "Student"}
                    </Text>
                  </View>
                  {renderStars(review.rating)}
                </View>
                {review.comment ? (
                  <Text style={styles.comment}>{review.comment}</Text>
                ) : (
                  <Text style={styles.noComment}>No comment left.</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Sort Reviews</Text>
            {(["recent", "oldest", "highest", "lowest"] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortOption, sortBy === opt && styles.sortOptionActive]}
                onPress={() => { setSortBy(opt); setShowSortModal(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === opt && styles.sortOptionTextActive]}>
                  {getSortLabel(opt)}
                </Text>
                {sortBy === opt && <Ionicons name="checkmark" size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";
const GOLD = "#D4AF4A";

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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850", flex: 1, textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  summaryTop: { flexDirection: "row" },
  avgSection: { alignItems: "center", flex: 1 },
  avgNumber: { fontSize: 44, fontWeight: "700", color: NAVY },
  totalReviews: { fontSize: 13, color: "#5D667C", marginTop: 4 },
  breakdown: { flex: 1.5, paddingLeft: 16 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  ratingLabel: { width: 14, fontSize: 12, color: "#5D667C", textAlign: "right" },
  barBg: {
    flex: 1,
    height: 7,
    backgroundColor: "#E8EBF0",
    borderRadius: 4,
    marginHorizontal: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: GOLD, borderRadius: 4 },
  ratingCount: { width: 20, fontSize: 11, color: "#8C93A4", textAlign: "right" },
  sortBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: NAVY },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  sortBtnText: { fontSize: 13, fontWeight: "600", color: BLUE },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#5D667C" },
  emptySubtext: { marginTop: 4, fontSize: 14, color: "#8C93A4" },
  reviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewerName: { fontSize: 14, fontWeight: "600", color: NAVY },
  starsRow: { flexDirection: "row" },
  comment: { fontSize: 14, color: "#3A4357", lineHeight: 20, marginBottom: 8 },
  noComment: { fontSize: 13, color: "#8C93A4", fontStyle: "italic", marginBottom: 8 },
  reviewDate: { fontSize: 12, color: "#8C93A4" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortModal: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  sortModalTitle: { fontSize: 17, fontWeight: "700", color: NAVY, marginBottom: 14, textAlign: "center" },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  sortOptionActive: { backgroundColor: "#F0F4FF" },
  sortOptionText: { fontSize: 15, color: "#3A4357" },
  sortOptionTextActive: { color: BLUE, fontWeight: "600" },
});