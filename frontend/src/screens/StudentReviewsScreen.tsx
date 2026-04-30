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
import { api } from "../api/client";

type RootStackParamList = {
  "Student Dashboard": undefined;
};

type Session = {
  id: number;
  tutorName: string;
  className: string;
  classId: number | null;
  date: string;
  hasReview: boolean;
  tutorId: number;
};

type ReviewGroup = {
  key: string;
  tutorId: number;
  tutorName: string;
  className: string;
  count: number;
  latestSession: Session;
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

type TutoringSessionPublic = {
  id: number;
  tutor_id: number;
  class_id: number | null;
  subject: string;
  scheduled_start: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
};

type ReviewPublic = {
  id: number;
  session_id: number;
  class_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
};

/** Tutor → student reviews; API never returns tutor identity */
type StudentReviewReceived = {
  review_id: number;
  review_timestamp: string;
  review_text: string;
  rating: number;
};

type UserName = { first_name: string; last_name: string };
type ClassPublic = { id: number; subject: string; class_number: number };

function parseSubjectAndClassNumber(subject: string): { subjectCode: string; classNumber: number } | null {
  const match = subject.trim().match(/^([A-Za-z]+)\s+(\d{2,4})$/);
  if (!match) return null;
  return {
    subjectCode: match[1].toUpperCase(),
    classNumber: Number(match[2]),
  };
}

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
  const [receivedFromTutors, setReceivedFromTutors] = useState<StudentReviewReceived[]>([]);
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
    void fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rawSessions, rawReviews, rawReceived] = await Promise.all([
        api.get<TutoringSessionPublic[]>("/sessions/student/past"),
        api.get<ReviewPublic[]>("/reviews/student/me"),
        api.get<StudentReviewReceived[]>("/reviews/students/received/me").catch(() => []),
      ]);

      const tutorIds = Array.from(new Set(rawSessions.map((s) => s.tutor_id)));
      const tutorPairs = await Promise.all(
        tutorIds.map(async (id) => {
          try {
            const user = await api.get<UserName>(`/users/${id}`);
            return [id, `${user.first_name} ${user.last_name}`.trim()] as const;
          } catch {
            return [id, `Tutor #${id}`] as const;
          }
        })
      );
      const tutorNameById = new Map<number, string>(tutorPairs);

      const reviewedSessionIds = new Set(rawReviews.map((r) => r.session_id));
      const sessionById = new Map<number, Session>();
      const mappedSessions: Session[] = rawSessions
        .filter((s) => s.status !== "cancelled" && s.status !== "declined")
        .map((s) => {
          const mapped: Session = {
            id: s.id,
            tutorName: tutorNameById.get(s.tutor_id) ?? `Tutor #${s.tutor_id}`,
            className: s.subject,
            classId: s.class_id,
            date: s.scheduled_start,
            hasReview: reviewedSessionIds.has(s.id),
            tutorId: s.tutor_id,
          };
          sessionById.set(mapped.id, mapped);
          return mapped;
        });

      const classIdsFromReviews = Array.from(new Set(rawReviews.map((r) => r.class_id)));
      const classPairs = await Promise.all(
        classIdsFromReviews.map(async (classId) => {
          try {
            const c = await api.get<ClassPublic>(`/classes/${classId}`);
            return [classId, `${c.subject} ${c.class_number}`] as const;
          } catch {
            return [classId, `Class #${classId}`] as const;
          }
        })
      );
      const classNameById = new Map<number, string>(classPairs);

      const mappedReviews: Review[] = rawReviews.map((r) => {
        const relatedSession = sessionById.get(r.session_id);
        return {
          id: r.id,
          sessionId: r.session_id,
          tutorName: relatedSession?.tutorName ?? "Tutor",
          className: relatedSession?.className ?? classNameById.get(r.class_id) ?? `Class #${r.class_id}`,
          rating: r.rating,
          comment: r.comment ?? "",
          isAnonymous: r.is_anonymous,
          date: r.created_at,
        };
      });

      setSessions(mappedSessions);
      setMyReviews(mappedReviews);
      setReceivedFromTutors(rawReceived);
    } catch {
      showAlert("Error", "Failed to load review data");
      setSessions([]);
      setMyReviews([]);
      setReceivedFromTutors([]);
    } finally {
      setIsLoading(false);
    }
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
    const existingSession = sessions.find((s) => s.id === review.sessionId);
    setEditingReview(review);
    setSelectedSession({ 
      id: review.sessionId, 
      tutorName: review.tutorName, 
      className: review.className, 
      classId: existingSession?.classId ?? null,
      date: review.date,
      hasReview: true,
      tutorId: existingSession?.tutorId ?? 0,
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
    try {
      if (editingReview) {
        await api.patch<ReviewPublic>(`/reviews/${editingReview.id}`, {
          rating,
          comment: comment.trim() || null,
          is_anonymous: isAnonymous,
        });
        setMyReviews(
          myReviews.map((r) =>
            r.id === editingReview.id ? { ...r, rating, comment, isAnonymous } : r
          )
        );
        showAlert("Success", "Review updated!");
      } else {
        if (!selectedSession) return;
        let classId = selectedSession.classId;
        if (classId === null) {
          const parsed = parseSubjectAndClassNumber(selectedSession.className);
          if (parsed) {
            try {
              const classes = await api.get<ClassPublic[]>(
                `/classes/?subject=${encodeURIComponent(parsed.subjectCode)}`
              );
              const matched = classes.find((c) => c.class_number === parsed.classNumber);
              classId = matched?.id ?? null;
            } catch {
              classId = null;
            }
          }
        }
        if (classId === null) {
          showAlert("Cannot submit review", "Could not determine class for this session.");
          return;
        }
        const created = await api.post<ReviewPublic>("/reviews/", {
          session_id: selectedSession.id,
          class_id: classId,
          rating,
          comment: comment.trim() || null,
          is_anonymous: isAnonymous,
        });
        const newReview: Review = {
          id: created.id,
          sessionId: created.session_id,
          tutorName: selectedSession.tutorName,
          className: selectedSession.className,
          rating: created.rating,
          comment: created.comment ?? "",
          isAnonymous: created.is_anonymous,
          date: created.created_at,
        };
        setMyReviews([newReview, ...myReviews]);
        setSessions(
          sessions.map((s) =>
            s.id === selectedSession.id ? { ...s, hasReview: true } : s
          )
        );
        showAlert("Success", "Review submitted!");
      }
      setShowReviewModal(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit review";
      showAlert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteReview = async (reviewId: number) => {
    try {
      await api.delete<void>(`/reviews/${reviewId}`);
      const review = myReviews.find((r) => r.id === reviewId);
      setMyReviews(myReviews.filter((r) => r.id !== reviewId));
      if (review) {
        setSessions(
          sessions.map((s) =>
            s.id === review.sessionId ? { ...s, hasReview: false } : s
          )
        );
      }
      showAlert("Deleted", "Review has been deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete review";
      showAlert("Error", message);
    }
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
  const reviewGroupsByTutor = sessionsToReview.reduce<Record<number, ReviewGroup[]>>((acc, session) => {
    const tutorGroups = acc[session.tutorId] ?? [];
    const existing = tutorGroups.find((g) => g.className === session.className);
    if (!existing) {
      tutorGroups.push({
        key: `${session.tutorId}:${session.className}`,
        tutorId: session.tutorId,
        tutorName: session.tutorName,
        className: session.className,
        count: 1,
        latestSession: session,
      });
    } else {
      existing.count += 1;
      if (new Date(session.date).getTime() > new Date(existing.latestSession.date).getTime()) {
        existing.latestSession = session;
      }
    }
    acc[session.tutorId] = tutorGroups;
    return acc;
  }, {});
  const reviewTutorGroups = Object.values(reviewGroupsByTutor);

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
              <Text style={styles.sectionSubtitle}>Choose a tutor, then a class to review</Text>
              
              {reviewTutorGroups.map((groups) => (
                <View key={groups[0].tutorId} style={styles.sessionCard}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.tutorName}>{groups[0].tutorName}</Text>
                    <Text style={styles.sessionDate}>
                      {groups.reduce((sum, g) => sum + g.count, 0)} session
                      {groups.reduce((sum, g) => sum + g.count, 0) === 1 ? "" : "s"} to review
                    </Text>
                  </View>
                  <View style={styles.groupClassList}>
                    {groups.map((group) => (
                      <TouchableOpacity
                        key={group.key}
                        style={styles.reviewBtn}
                        onPress={() => openReviewModal(group.latestSession)}
                      >
                        <Ionicons name="create-outline" size={18} color="#2E57A2" />
                        <Text style={styles.reviewBtnText}>
                          {group.className}
                          {group.count > 1 ? ` (${group.count})` : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          <Text
            style={[styles.sectionTitle, (sessionsToReview.length > 0 || receivedFromTutors.length > 0) && { marginTop: 24 }]}
          >
            Feedback from tutors
          </Text>
          <Text style={styles.sectionSubtitle}>
            Private notes from tutors you worked with. Tutors stay anonymous here.
          </Text>
          {receivedFromTutors.length === 0 ? (
            <View style={[styles.emptyState, { paddingVertical: 24 }]}>
              <Text style={styles.emptySubtext}>No tutor feedback yet</Text>
            </View>
          ) : (
            receivedFromTutors.map((r) => (
              <View key={r.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderLeft}>
                    <View style={styles.anonymousBadge}>
                      <Ionicons name="eye-off-outline" size={12} color="#5D667C" />
                      <Text style={styles.anonymousText}>Anonymous tutor</Text>
                    </View>
                  </View>
                  {renderStars(Math.round(r.rating))}
                </View>
                <Text style={styles.comment}>{r.review_text}</Text>
                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewDate}>
                    {new Date(r.review_timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* My Reviews */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>My reviews of tutors</Text>
          <Text style={styles.sectionSubtitle}>Reviews you submitted about tutoring sessions</Text>
          
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
                {!editingReview && (
                  <Text style={styles.modalSessionHint}>
                    This review will be submitted for your most recent session in this class with this tutor.
                  </Text>
                )}
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
    marginTop: 6,
    alignSelf: "flex-start",
  },
  reviewBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#2E57A2",
  },
  groupClassList: {
    marginTop: 8,
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
  reviewHeaderLeft: {
    flex: 1,
    marginRight: 8,
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
  modalSessionHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#5D667C",
    lineHeight: 18,
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
