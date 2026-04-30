import { Pressable, StyleSheet, Text, View } from "react-native";

type AdminUserLike = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_tutor: boolean;
  is_student: boolean;
  status: number; // 0=active, 1=disabled, 2=banned (legacy)
};

function formatRole(user: AdminUserLike): string {
  if (user.is_tutor && user.is_student) return "Tutor & Student";
  if (user.is_tutor) return "Tutor";
  if (user.is_student) return "Student";
  return "User";
}

function formatStatus(status: number): string {
  if (status === 1) return "Disabled";
  if (status === 2) return "Banned";
  return "Active";
}

export default function UserCard({
  user,
  updating,
  onToggleStatus,
}: {
  user: AdminUserLike;
  updating: boolean;
  onToggleStatus: (userId: number) => void;
}) {
  const isActive = user.status === 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.name}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.status}>{formatStatus(user.status)}</Text>
        </View>
        <Pressable
          style={[
            styles.statusActionBtn,
            styles.statusActionBtnInline,
            isActive ? styles.deactivateBtn : styles.activateBtn,
            updating && styles.statusActionBtnDisabled,
          ]}
          onPress={() => onToggleStatus(user.id)}
          disabled={updating}
        >
          <Text style={styles.statusActionBtnText}>
            {updating ? "Updating..." : isActive ? "Deactivate" : "Activate"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.detail}>
        <Text style={styles.label}>Email:</Text> {user.email}
      </Text>
      <Text style={styles.detail}>
        <Text style={styles.label}>Role:</Text> {formatRole(user)}
      </Text>
      <Text style={styles.detail}>
        <Text style={styles.label}>User ID:</Text> {user.id}
      </Text>
    </View>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: NAVY,
  },
  status: {
    color: BLUE,
    fontWeight: "700",
    marginTop: 2,
  },
  label: {
    fontWeight: "700",
    color: NAVY,
  },
  detail: {
    fontSize: 14,
    color: "#475467",
    marginBottom: 6,
    lineHeight: 20,
  },
  statusActionBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  statusActionBtnInline: {
    marginTop: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  deactivateBtn: {
    backgroundColor: "#B42318",
  },
  activateBtn: {
    backgroundColor: "#027A48",
  },
  statusActionBtnDisabled: {
    opacity: 0.7,
  },
  statusActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

