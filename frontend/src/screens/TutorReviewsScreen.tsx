import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  "Tutor Dashboard": undefined;
};

type Review = {
  id: number;
  studentName: string;
  className: string;
  rating: number;
  comment: string;
  date: string;
  isAnonymous: boolean;
  isFlagged: boolean;
};

type SortOption = "recent" | "oldest" | "highest" | "lowest" | "class";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    console.log(title, message);
  }
};

export default function TutorReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggingReview, setFlaggingReview] = useState<Review | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    
    // Mock data for demo
    const mockReviews: Review[] = [
      {
        id: 1,
        studentName: "Anonymous",
        className: "CS 180",
        rating: 5,
        comment: "Amazing tutor! Explained recursion in a way that finally made sense. Very patient and knowledgeable.",
        date: "2024-02-20",
        isAnonymous: true,
        isFlagged: false,
      },
      {
        id: 2,
        studentName: "Mike Johnson",
        className: "CS 251",
        rating: 4,
        comment: "Really helpful with data structures. Would recommend!",
        date: "2024-02-18",
        isAnonymous: false,
        isFlagged: false,
      },
      {
        id: 3,
        studentName: "Anonymous",
        className: "MA 265",
        rating: 5,
        comment: "Best linear algebra tutor I've had. Made matrices easy to understand.",
        date: "2024-02-15",
        isAnonymous: true,
        isFlagged: false,
      },
      {
        id: 4,
        studentName: "Sarah Williams",
        className: "CS 180",
        rating: 3,
        comment: "Decent tutoring session. Could explain things more clearly.",
        date: "2024-02-10",
        isAnonymous: false,
        isFlagged: false,
      },
      {
        id: 5,
        studentName: "Anonymous",
        className: "CS 251",
        rating: 2,
        comment: "Showed up late and seemed unprepared.",
        date: "2024-02-08",
        isAnonymous: true,
        isFlagged: false,
      },
    ];

    await new Promise(resolve => setTimeout(resolve, 500));
    setReviews(mockReviews);
    setIsLoading(false);
  };

  // Calculate statistics
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0,
  }));

  // Sort reviews
  const getSortedReviews = () => {
    const sorted = [...reviews];
    switch (sortBy) {
      case "recent":
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "highest":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return sorted.sort((a, b) => a.rating - b.rating);
      case "class":
        return sorted.sort((a, b) => a.className.localeCompare(b.className));
      default:
        return sorted;
    }
  };

  const sortedReviews = getSortedReviews();

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case "recent": return "Most Recent";
      case "oldest": return "Oldest First";
      case "highest": return "Highest Rating";
      case "lowest": return "Lowest Rating";
      case "class": return "By Class";
    }
  };

  // Flag a review
  const openFlagModal = (review: Review) => {
    setFlaggingReview(review);
    setFlagReason("");
    setShowFlagModal(true);
  };

  const submitFlag = async () => {
    if (!flagReason.trim()) {
      showAlert("Required", "Please provide a reason for flagging this review");
      return;
    }

    setIsSubmittingFlag(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark review as flagged
    setReviews(reviews.map(r => 
      r.id === flaggingReview?.id ? { ...r, isFlagged: true } : r
    ));
    
    setIsSubmittingFlag(false);
    setShowFlagModal(false);
    showAlert("Flagged", "This review has been flagged for admin review. Thank you for your feedback.");
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#D4AF4A" : "#CCD1DC"}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2F3850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E57A2" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.avgRatingSection}>
                <Text style={styles.avgRating}>{averageRating}</Text>
                <View style={styles.starsRowLarge}>
                  {renderStars(Math.round(parseFloat(averageRating)), 24)}
                </View>
                <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
              </View>
              
              {/* Rating Breakdown */}
              <View style={styles.ratingBreakdown}>
                {ratingCounts.map(({ rating, count, percentage }) => (
                  <View key={rating} style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{rating}</Text>
                    <Ionicons name="star" size={12} color="#D4AF4A" />
                    <View style={styles.ratingBarBg}>
                      <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Sort Bar */}
          <View style={styles.sortBar}>
            <Text style={styles.sectionTitle}>All Reviews</Text>
            <TouchableOpacity 
              style={styles.sortBtn}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="funnel-outline" size={18} color="#2E57A2" />
              <Text style={styles.sortBtnText}>{getSortLabel(sortBy)}</Text>
              <Ionicons name="chevron-down" size={16} color="#2E57A2" />
            </TouchableOpacity>
          </View>
          
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#CCD1DC" />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>Reviews from students will appear here</Text>
            </View>
          ) : (
            sortedReviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, review.isFlagged && styles.reviewCardFlagged]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.avatar}>
                      <Ionicons 
                        name={review.isAnonymous ? "person-outline" : "person"} 
                        size={20} 
                        color="#5D667C" 
                      />
                    </View>
                    <View>
                      <Text style={styles.reviewerName}>
                        {review.isAnonymous ? "Anonymous Student" : review.studentName}
                      </Text>
                      <Text style={styles.className}>{review.className}</Text>
                    </View>
                  </View>
                  <View style={styles.reviewHeaderRight}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                
                <Text style={styles.comment}>{review.comment}</Text>
                
                <View style={styles.reviewFooter}>
                  <Text style={styles.date}>{new Date(review.date).toLocaleDateString()}</Text>
                  
                  {review.isFlagged ? (
                    <View style={styles.flaggedBadge}>
                      <Ionicons name="flag" size={14} color="#E74C3C" />
                      <Text style={styles.flaggedText}>Flagged</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.flagBtn}
                      onPress={() => openFlagModal(review)}
                    >
                      <Ionicons name="flag-outline" size={18} color="#8C93A4" />
                      <Text style={styles.flagBtnText}>Flag</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort Reviews</Text>
            
            {(["recent", "oldest", "highest", "lowest", "class"] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy(option);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
                  {getSortLabel(option)}
                </Text>
                {sortBy === option && (
                  <Ionicons name="checkmark" size={20} color="#2E57A2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Flag Modal */}
      <Modal
        visible={showFlagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFlagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.flagModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Flag Review</Text>
              <TouchableOpacity onPress={() => setShowFlagModal(false)}>
                <Ionicons name="close" size={24} color="#5D667C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.flagDescription}>
              If you believe this review is inappropriate, unfair, or violates our community guidelines, 
              please let us know. An administrator will review your report.
            </Text>

            <Text style={styles.modalLabel}>Reason for flagging *</Text>
            <TextInput
              style={styles.flagInput}
              placeholder="Please explain why this review should be reviewed..."
              placeholderTextColor="#B0B6C3"
              value={flagReason}
              onChangeText={setFlagReason}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmittingFlag && styles.submitBtnDisabled]}
              onPress={submitFlag}
              disabled={isSubmittingFlag}
            >
              {isSubmittingFlag ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Flag</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6F8",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  avgRatingSection: {
    alignItems: "center",
    flex: 1,
  },
  avgRating: {
    fontSize: 48,
    fontWeight: "700",
    color: "#2F3850",
  },
  starsRowLarge: {
    flexDirection: "row",
    marginVertical: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: "#5D667C",
    marginTop: 4,
  },
  ratingBreakdown: {
    flex: 1.5,
    paddingLeft: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingLabel: {
    width: 16,
    fontSize: 12,
    color: "#5D667C",
    textAlign: "right",
  },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E8EBF0",
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: "#D4AF4A",
    borderRadius: 4,
  },
  ratingCount: {
    width: 24,
    fontSize: 12,
    color: "#8C93A4",
    textAlign: "right",
  },
  sortBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F3850",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortBtnText: {
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#2E57A2",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#5D667C",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#8C93A4",
  },
  reviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  reviewCardFlagged: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F3850",
  },
  className: {
    fontSize: 13,
    color: "#2E57A2",
    marginTop: 2,
  },
  reviewHeaderRight: {
    alignItems: "flex-end",
  },
  starsRow: {
    flexDirection: "row",
  },
  comment: {
    fontSize: 14,
    color: "#3A4357",
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  date: {
    fontSize: 12,
    color: "#8C93A4",
  },
  flagBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  flagBtnText: {
    marginLeft: 4,
    fontSize: 13,
    color: "#8C93A4",
  },
  flaggedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  flaggedText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#E74C3C",
    fontWeight: "600",
  },
  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 16,
    textAlign: "center",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sortOptionActive: {
    backgroundColor: "#F0F4FF",
  },
  sortOptionText: {
    fontSize: 15,
    color: "#3A4357",
  },
  sortOptionTextActive: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  // Flag Modal
  flagModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
  },
  flagDescription: {
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A4357",
    marginBottom: 8,
  },
  flagInput: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#2F3850",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
