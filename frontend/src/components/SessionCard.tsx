import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Session = {
  id: number;
  studentName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
};

const STATUS_CONFIG: Record<
  Session["status"],
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  pending: { icon: "hourglass", color: "#D97706", label: "Pending" },
  accepted: { icon: "checkmark-done", color: "#2563EB", label: "Accepted" },
  declined: { icon: "close-circle", color: "#B91C1C", label: "Declined" },
  completed: { icon: "checkmark-circle", color: "#16A34A", label: "Completed" },
  cancelled: { icon: "close-circle", color: "#DC2626", label: "Cancelled" },
};

type SessionCardProps = {
  session: Session;
  showCancelAction?: boolean;
  onCancelPress?: (sessionId: number) => void;
  cancelling?: boolean;
};

export default function SessionCard({
  session,
  showCancelAction = false,
  onCancelPress,
  cancelling = false,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { icon, color, label } = STATUS_CONFIG[session.status];
  const showEndTime = session.status === "completed" || session.status === "cancelled";

  return (
    <View style={styles.sessionCard}>
      <Pressable
        style={styles.sessionBanner}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <Text style={styles.bannerText}>
          {session.studentName} – {session.date}, {session.startTime}
          {showEndTime ? ` – ${session.endTime}` : ""}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#FFF"
        />
      </Pressable>

      {expanded && (
        <View style={styles.sessionBody}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color="#FFF" />
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionName}>{session.studentName}</Text>
            <View style={styles.statusBadge}>
              <Ionicons name={icon} size={13} color={color} />
              <Text style={[styles.statusText, { color }]}>{label}</Text>
            </View>
            <View style={styles.sessionDetail}>
              <Ionicons name="book" size={12} color="#6B7280" />
              <Text style={styles.detailText}>{session.subject}</Text>
            </View>
            <View style={styles.sessionDetail}>
              <Ionicons name="calendar" size={12} color="#6B7280" />
              <Text style={styles.detailText}>
                {session.date}, {session.startTime} – {session.endTime}
              </Text>
            </View>
            <View style={styles.sessionDetail}>
              <Ionicons name="time" size={12} color="#6B7280" />
              <Text style={styles.detailText}>{session.duration}</Text>
            </View>
          </View>

          <Pressable style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>View Details</Text>
          </Pressable>
          {showCancelAction && session.status !== "cancelled" ? (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => onCancelPress?.(session.id)}
              disabled={cancelling}
            >
              <Text style={styles.cancelBtnText}>
                {cancelling ? "Cancelling..." : "Cancel Session"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const NAVY = "#1B2D50";

const styles = StyleSheet.create({
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sessionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3B6EA5",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  sessionBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sessionDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailsBtn: {
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center",
  },
  detailsBtnText: {
    color: NAVY,
    fontWeight: "600",
    fontSize: 13,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center",
    marginTop: 8,
  },
  cancelBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },
});
