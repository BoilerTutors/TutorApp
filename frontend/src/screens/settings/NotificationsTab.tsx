import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../../api/client";
import ViewProfileModal from "../../components/ViewProfileModal";

export default function NotificationsTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null);

  const loadRows = useCallback(async () => {
    const data = await api.get<NotificationRow[]>("/notifications/me?limit=100");
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const [data, me] = await Promise.all([
          api.get<NotificationRow[]>("/notifications/me?limit=100"),
          api.get<{ id: number }>("/users/me"),
        ]);
        if (!mounted) return;
        setRows(data ?? []);
        setCurrentUserId(me.id);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [loadRows]);

  const onMarkRead = useCallback(async (id: number) => {
    await api.patch<NotificationRow>(`/notifications/${id}/read`);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const [data, me] = await Promise.all([
        api.get<NotificationRow[]>("/notifications/me?limit=100"),
        api.get<{ id: number }>("/users/me"),
      ]);
      setRows(data ?? []);
      setCurrentUserId(me.id);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const parseMatchNotificationProfileTarget = useCallback(
    (row: NotificationRow): number | null => {
      const payload = row.payload_json ?? {};
      const tutorIdRaw = payload.tutor_id;
      const studentIdRaw = payload.student_id;
      const tutorId = typeof tutorIdRaw === "number" ? tutorIdRaw : null;
      const studentId = typeof studentIdRaw === "number" ? studentIdRaw : null;
      if (tutorId == null || studentId == null || currentUserId == null) {
        return null;
      }
      if (currentUserId === tutorId) {
        return studentId;
      }
      if (currentUserId === studentId) {
        return tutorId;
      }
      return null;
    },
    [currentUserId]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void onRefresh()} disabled={refreshing}>
          <Text style={styles.refreshBtnText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
        </Pressable>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={[styles.item, !item.is_read && styles.unreadItem]}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
              <Text style={styles.itemMeta}>{new Date(item.created_at).toLocaleString()}</Text>
              <View style={styles.actionsRow}>
                {parseMatchNotificationProfileTarget(item) != null ? (
                  <Pressable
                    style={styles.viewProfileBtn}
                    onPress={() => {
                      setSelectedProfileUserId(parseMatchNotificationProfileTarget(item));
                      setProfileModalVisible(true);
                    }}
                  >
                    <Text style={styles.viewProfileBtnText}>View Profile</Text>
                  </Pressable>
                ) : null}
                {!item.is_read && (
                  <Pressable style={styles.markReadBtn} onPress={() => void onMarkRead(item.id)}>
                    <Text style={styles.markReadBtnText}>Mark as read</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.subtitle}>No notifications yet.</Text>}
        />
      </View>
      <ViewProfileModal
        visible={profileModalVisible}
        userId={selectedProfileUserId}
        onClose={() => {
          setProfileModalVisible(false);
          setSelectedProfileUserId(null);
        }}
      />
    </View>
  );
}

type NotificationRow = {
  id: number;
  title: string;
  body: string;
  payload_json?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 22,
    marginTop: 8,
  },
  refreshBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2E57A2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  refreshBtnText: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  item: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  unreadItem: {
    borderColor: "#2E57A2",
    backgroundColor: "#F6F9FF",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 14,
    color: "#3F4A63",
  },
  itemMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#6A738A",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  viewProfileBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2E57A2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  viewProfileBtnText: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  markReadBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#2E57A2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markReadBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
