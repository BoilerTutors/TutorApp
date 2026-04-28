import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  "Student Dashboard": undefined;
  "Tutor Profile Reviews": { tutorUserId: number; tutorName: string };
};

type ReviewPublic = {
  id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
};

type SortOption = "recent" | "oldest" | "highest" | "lowest";

const DEMO_REVIEWS: ReviewPublic[] = [
  {
    id: 1,
    rating: 5,
    comment: "Amazing tutor! Explained recursion in a way that finally made sense. Very patient and knowledgeable.",
    is_anonymous: false,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: 2,
    rating: 4,
    comment: "Really helpful with data structures. Would definitely recommend to other students.",
    is_anonymous: true,
    created_at: "2026-03-08T14:00:00Z",
  },
  {
    id: 3,
    rating: 5,
    comment: "Best tutor I've had at Purdue. Always on time and very well prepared.",
    is_anonymous: false,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: 4,
    rating: 3,
    comment: "Decent session. Could explain concepts more clearly but overall okay.",
    is_anonymous: true,
    created_at: "2026-03-20T16:00:00Z",
  },
  {
    id: 5,
    rating: 5,
    comment: "Helped me go from failing to passing my midterm. Incredible at breaking down complex topics.",
    is_anonymous: false,
    created_at: "2026-03-28T11:00:00Z",
  },
];

export default function TutorProfileReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RootStackParamList, "Tutor Profile Reviews">["route"]>();
  const { tutorName } = route.params;

  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortModal, setShowSortModal] = useState(false);

  const reviews = DEMO_REVIEWS;

  const averageRating = useMemo(() => {
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }, []);

  const ratingCounts = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter((r) => Math.round(r.rating) === rating).length,
        percentage: (reviews.filter((r) => Math.round(r.rating) === rating).length / reviews.length) * 100,
      })),
    []
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
  }, [sortBy]);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tutorName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.avgSection}>
              <Text style={styles.avgNumber}>{averageRating}</Text>
              {renderStars(parseFloat(averageRating), 22)}
              <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
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

        {/* Sort bar */}
        <View style={styles.sortBar}>
          <Text style={styles.sectionTitle}>All Reviews</Text>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
            <Ionicons name="funnel-outline" size={16} color={BLUE} />
            <Text style={styles.sortBtnText}>{getSortLabel(sortBy)}</Text>
            <Ionicons name="chevron-down" size={14} color={BLUE} />
          </TouchableOpacity>
        </View>

        {sortedReviews.map((review) => (
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
        ))}
      </ScrollView>

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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E8EBF0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2F3850", flex: 1, textAlign: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: "#E1E5EE",
  },
  summaryTop: { flexDirection: "row" },
  avgSection: { alignItems: "center", flex: 1 },
  avgNumber: { fontSize: 44, fontWeight: "700", color: NAVY },
  totalReviews: { fontSize: 13, color: "#5D667C", marginTop: 4 },
  breakdown: { flex: 1.5, paddingLeft: 16 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  ratingLabel: { width: 14, fontSize: 12, color: "#5D667C", textAlign: "right" },
  barBg: {
    flex: 1, height: 7, backgroundColor: "#E8EBF0",
    borderRadius: 4, marginHorizontal: 6, overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: GOLD, borderRadius: 4 },
  ratingCount: { width: 20, fontSize: 11, color: "#8C93A4", textAlign: "right" },
  sortBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: NAVY },
  sortBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F4FF", paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, gap: 4,
  },
  sortBtnText: { fontSize: 13, fontWeight: "600", color: BLUE },
  reviewCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#E1E5EE",
  },
  reviewTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  reviewerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#F0F2F5", alignItems: "center", justifyContent: "center",
  },
  reviewerName: { fontSize: 14, fontWeight: "600", color: NAVY },
  starsRow: { flexDirection: "row" },
  comment: { fontSize: 14, color: "#3A4357", lineHeight: 20, marginBottom: 8 },
  noComment: { fontSize: 13, color: "#8C93A4", fontStyle: "italic", marginBottom: 8 },
  reviewDate: { fontSize: 12, color: "#8C93A4" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center",
  },
  sortModal: { backgroundColor: "#FFF", borderRadius: 12, padding: 20, width: "80%" },
  sortModalTitle: { fontSize: 17, fontWeight: "700", color: NAVY, marginBottom: 14, textAlign: "center" },
  sortOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 10, borderRadius: 8, marginBottom: 2,
  },
  sortOptionActive: { backgroundColor: "#F0F4FF" },
  sortOptionText: { fontSize: 15, color: "#3A4357" },
  sortOptionTextActive: { color: BLUE, fontWeight: "600" },
});