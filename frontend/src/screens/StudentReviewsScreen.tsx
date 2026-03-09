import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  "Student Dashboard": undefined;
};

type Session = {
  id: number;
  tutorName: string;
  className: string;
  date: string;
  hasReview: boolean;
};

type Review = {
  id: number;
  sessionId: number;
  tutorName: string;
  className: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  date: string;
};

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    console.log(title, message);
  }
};

export default function StudentReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review form state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit mode
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Mock data for demo
    const mockSessions: Session[] = [
      { id: 1, tutorName: "Alex Chen", className: "CS 180", date: "2024-02-20", hasReview: false },
      { id: 2, tutorName: "Jordan Smith", className: "MA 265", date: "2024-02-18", hasReview: false },
      { id: 3, tutorName: "Alex Chen", className: "CS 251", date: "2024-02-15", hasReview: true },
    ];

    const mockReviews: Review[] = [
      {
        id: 1,
        sessionId: 3,
        tutorName: "Alex Chen",
        className: "CS 251",
        rating: 5,
        comment: "Great help with data structures! Very patient and clear explanations.",
        isAnonymous: false,
        date: "2024-02-15",
      },
    ];

    await new Promise(resolve => setTimeout(resolve, 500));
    setSessions(mockSessions);
    setMyReviews(mockReviews);
    setIsLoading(false);
  };

  const openReviewModal = (session: Session) => {
    setSelectedSession(session);
    setRating(0);
    setComment("");
    setIsAnonymous(false);
    setEditingReview(null);
    setShowReviewModal(true);
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setSelectedSession({ 
      id: review.sessionId, 
      tutorName: review.tutorName, 
      className: review.className, 
      date: review.date,
      hasReview: true 
    });
    setRating(review.rating);
    setComment(review.comment);
    setIsAnonymous(review.isAnonymous);
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (rating === 0) {
      showAlert("Required", "Please select a rating");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (editingReview) {
      // Update existing review
      setMyReviews(myReviews.map(r => 
        r.id === editingReview.id 
          ? { ...r, rating, comment, isAnonymous }
          : r
      ));
      showAlert("Success", "Review updated!");
    } else {
      // Create new review
      const newReview: Review = {
        id: Date.now(),
        sessionId: selectedSession!.id,
        tutorName: selectedSession!.tutorName,
        className: selectedSession!.className,
        rating,
        comment,
        isAnonymous,
        date: new Date().toISOString().split('T')[0],
      };
      setMyReviews([newReview, ...myReviews]);
      
      // Mark session as reviewed
      setSessions(sessions.map(s => 
        s.id === selectedSession!.id ? { ...s, hasReview: true } : s
      ));
      showAlert("Success", "Review submitted!");
    }

    setIsSubmitting(false);
    setShowReviewModal(false);
  };

  const deleteReview = async (reviewId: number) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const review = myReviews.find(r => r.id === reviewId);
    setMyReviews(myReviews.filter(r => r.id !== reviewId));
    
    // Mark session as not reviewed
    if (review) {
      setSessions(sessions.map(s => 
        s.id === review.sessionId ? { ...s, hasReview: false } : s
      ));
    }
    
    showAlert("Deleted", "Review has been deleted");
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && setRating(star)}
            disabled={!interactive}
          >
            <Ionicons
              name={star <= currentRating ? "star" : "star-outline"}
              size={interactive ? 32 : 16}
              color={star <= currentRating ? "#D4AF4A" : "#CCD1DC"}
              style={{ marginHorizontal: interactive ? 4 : 1 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const sessionsToReview = sessions.filter(s => !s.hasReview);

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
          {/* Sessions to Review */}
          {sessionsToReview.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Sessions to Review</Text>
              <Text style={styles.sectionSubtitle}>Leave feedback for your completed sessions</Text>
              
              {sessionsToReview.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => openReviewModal(session)}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={styles.tutorName}>{session.tutorName}</Text>
                    <Text style={styles.className}>{session.className}</Text>
                    <Text style={styles.sessionDate}>{new Date(session.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.reviewBtn}>
                    <Ionicons name="create-outline" size={20} color="#2E57A2" />
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* My Reviews */}
          <Text style={[styles.sectionTitle, sessionsToReview.length > 0 && { marginTop: 24 }]}>
            My Past Reviews
          </Text>
          
          {myReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#CCD1DC" />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>Your submitted reviews will appear here</Text>
            </View>
          ) : (
            myReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.tutorName}>{review.tutorName}</Text>
                    <Text style={styles.className}>{review.className}</Text>
                  </View>
                  {renderStars(review.rating)}
                </View>
                
                <Text style={styles.comment}>{review.comment}</Text>
                
                <View style={styles.reviewFooter}>
                  <View style={styles.reviewMeta}>
                    {review.isAnonymous && (
                      <View style={styles.anonymousBadge}>
                        <Ionicons name="eye-off-outline" size={12} color="#5D667C" />
                        <Text style={styles.anonymousText}>Anonymous</Text>
                      </View>
                    )}
                    <Text style={styles.reviewDate}>{new Date(review.date).toLocaleDateString()}</Text>
                  </View>
                  
                  <View style={styles.reviewActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openEditModal(review)}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#2E57A2" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => deleteReview(review.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReview ? "Edit Review" : "Leave a Review"}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#5D667C" />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <View style={styles.modalSessionInfo}>
                <Text style={styles.modalTutorName}>{selectedSession.tutorName}</Text>
                <Text style={styles.modalClassName}>{selectedSession.className}</Text>
              </View>
            )}

            {/* Rating */}
            <Text style={styles.modalLabel}>Rating *</Text>
            <View style={styles.ratingContainer}>
              {renderStars(rating, true)}
            </View>

            {/* Comment */}
            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              placeholderTextColor="#B0B6C3"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />

            {/* Anonymous Toggle */}
            <Pressable 
              style={styles.anonymousToggle}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons 
                name={isAnonymous ? "checkbox" : "square-outline"} 
                size={24} 
                color={isAnonymous ? "#2E57A2" : "#8C93A4"} 
              />
              <Text style={styles.anonymousToggleText}>Submit anonymously</Text>
            </Pressable>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={submitReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingReview ? "Update Review" : "Submit Review"}
                </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#5D667C",
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F3850",
  },
  className: {
    fontSize: 14,
    color: "#2E57A2",
    marginTop: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: "#8C93A4",
    marginTop: 4,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reviewBtnText: {
    marginLeft: 6,
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
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
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
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  anonymousBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  anonymousText: {
    fontSize: 12,
    color: "#5D667C",
    marginLeft: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: "#8C93A4",
  },
  reviewActions: {
    flexDirection: "row",
  },
  actionBtn: {
    padding: 8,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
  },
  modalSessionInfo: {
    backgroundColor: "#F5F6F8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalTutorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F3850",
  },
  modalClassName: {
    fontSize: 14,
    color: "#2E57A2",
    marginTop: 2,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A4357",
    marginBottom: 8,
  },
  ratingContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  commentInput: {
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
  anonymousToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  anonymousToggleText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#3A4357",
  },
  submitBtn: {
    backgroundColor: "#2E57A2",
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
