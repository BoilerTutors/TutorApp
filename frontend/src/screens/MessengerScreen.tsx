import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE_URL } from "../config";
import { api, getAuthToken } from "../api/client";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type Conversation = { id: number };

type Message = {
  id: number;
  sender_id: number;
  content: string;
  attachment?: {
    id: number;
    message_id: number;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  } | null;
  created_at: string;
};

type UserMe = {
  id: number;
  is_student: boolean;
};

type MatchListRow = {
  tutor_id: number;
  tutor_first_name: string;
  tutor_last_name: string;
  similarity_score: number;
};
type MatchRefreshRow = {
  tutor_id: number;
  similarity_score: number;
};
type AvailabilitySlot = {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type SidebarItem =
  | {
      kind: "match";
      key: string;
      tutor_id: number;
      tutor_first_name: string;
      tutor_last_name: string;
      similarity_score: number;
    }
  | {
      kind: "conversation";
      key: string;
      id: number;
      other_user_id: number;
      other_user_first_name?: string | null;
      other_user_last_name?: string | null;
    };

type RootStackParamList = {
  Messenger:
    | {
        openTutorUserId?: number;
        openTutorName?: string;
      }
    | undefined;
};

export default function MessengerScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Messenger">>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isStudentAccount, setIsStudentAccount] = useState(false);
  const [conversations, setConversations] = useState<
    Array<{
      id: number;
      other_user_id: number;
      other_user_first_name?: string | null;
      other_user_last_name?: string | null;
    }>
  >([]);
  const [matchedTutors, setMatchedTutors] = useState<MatchListRow[]>([]);
  const [selectedTutorUserId, setSelectedTutorUserId] = useState<number | null>(null);
  const [selectedTutorName, setSelectedTutorName] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityStudentName, setAvailabilityStudentName] = useState<string>("");
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const lastOpenedTutorRef = useRef<number | null>(null);
  const sidebarItems = useMemo<SidebarItem[]>(
    () =>
      isStudentAccount
        ? matchedTutors.map((m) => ({
            kind: "match" as const,
            key: String(m.tutor_id),
            tutor_id: m.tutor_id,
            tutor_first_name: m.tutor_first_name,
            tutor_last_name: m.tutor_last_name,
            similarity_score: m.similarity_score,
          }))
        : conversations.map((c) => ({
            kind: "conversation" as const,
            key: String(c.id),
            id: c.id,
            other_user_id: c.other_user_id,
            other_user_first_name: c.other_user_first_name,
            other_user_last_name: c.other_user_last_name,
          })),
    [isStudentAccount, matchedTutors, conversations]
  );

  const loadSidebarItems = useCallback(async () => {
    const me = await api.get<UserMe>("/users/me");
    setCurrentUserId(me.id);
    setIsStudentAccount(me.is_student);

    if (!me.is_student) {
      const convs = await api.get<
        Array<{
          id: number;
          other_user_id: number;
          other_user_first_name?: string | null;
          other_user_last_name?: string | null;
        }>
      >("/messages/conversations");
      setConversations(convs);
      setMatchedTutors([]);
    } else {
      const rows = await api.get<MatchListRow[]>("/matches/me");
      if (rows.length === 0) {
        setMatchedTutors([]);
      } else {
        try {
          // Keep the matched tutor set from /matches/me, but update displayed scores
          // from freshly recomputed rankings when the same tutor appears there.
          const refreshed = await api.post<MatchRefreshRow[]>("/matches/me/refresh");
          const refreshedScoreByTutorId = new Map<number, number>(
            refreshed.map((row) => [row.tutor_id, row.similarity_score])
          );
          setMatchedTutors(
            rows.map((row) => ({
              ...row,
              similarity_score: refreshedScoreByTutorId.get(row.tutor_id) ?? row.similarity_score,
            }))
          );
        } catch {
          setMatchedTutors(rows);
        }
      }
      setConversations([]);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    const rows = await api.get<Message[]>(`/messages/conversations/${conversationId}/messages`);
    setMessages(rows);
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadSidebarItems();
    } finally {
      setLoading(false);
    }
  }, [loadSidebarItems]);

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadSidebarItems();
      if (selectedConversationId) {
        await loadMessages(selectedConversationId);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const onOpenConversationForTutor = async (otherUserId: number) => {
    const conv = await api.post<Conversation>("/messages/conversations", {
      other_user_id: otherUserId,
    });
    setSelectedTutorUserId(otherUserId);
    if (route.params?.openTutorName) {
      setSelectedTutorName(route.params.openTutorName);
    }
    setSelectedConversationId(conv.id);
    await loadMessages(conv.id);
  };

  const onOpenExistingConversation = async (
    conversationId: number,
    otherUserId: number,
    otherUserName?: string | null
  ) => {
    setSelectedTutorUserId(otherUserId);
    setSelectedTutorName(otherUserName?.trim() ? otherUserName : null);
    setSelectedConversationId(conversationId);
    await loadMessages(conversationId);
  };

  const onSend = async () => {
    const content = draft.trim();
    if (!selectedConversationId || !content || sending) {
      return;
    }
    try {
      setSending(true);
      if (wsRef.current && wsConnected) {
        wsRef.current.send(JSON.stringify({ content }));
        setDraft("");
        return;
      }
      const msg = await api.post<Message>(`/messages/conversations/${selectedConversationId}/messages`, {
        content,
      });
      setDraft("");
      setMessages((prev) => [...prev, msg].sort((a, b) => a.id - b.id));
    } finally {
      setSending(false);
    }
  };

  const onAttachPdf = async () => {
    if (!selectedConversationId || sending) {
      return;
    }
    const token = getAuthToken();
    if (!token) {
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    if (!asset?.uri) {
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      formData.append("content", draft.trim());
      if (Platform.OS === "web") {
        // Web FormData requires a real Blob/File, not RN's { uri, name, type } object.
        const webResponse = await fetch(asset.uri);
        const fileBlob = await webResponse.blob();
        (formData as any).append("file", fileBlob, asset.name || "document.pdf");
      } else {
        formData.append("file", {
          uri: asset.uri,
          name: asset.name || "document.pdf",
          type: asset.mimeType || "application/pdf",
        } as any);
      }

      const res = await fetch(
        `${API_BASE_URL}/messages/conversations/${selectedConversationId}/messages/attachment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const msg = (await res.json()) as Message;
      setDraft("");
      setMessages((prev) => [...prev, msg].sort((a, b) => a.id - b.id));
    } finally {
      setSending(false);
    }
  };

  const formatDay = (dayOfWeek: number) => {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return names[dayOfWeek] ?? `Day ${dayOfWeek}`;
  };

  const formatTime = (value: string) => {
    const [rawHour = "0", rawMinute = "0"] = value.split(":");
    const hour24 = Number.parseInt(rawHour, 10);
    const minute = Number.parseInt(rawMinute, 10);
    if (Number.isNaN(hour24) || Number.isNaN(minute)) {
      return value;
    }
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = ((hour24 + 11) % 12) + 1;
    const minuteStr = String(minute).padStart(2, "0");
    return `${hour12}:${minuteStr} ${suffix}`;
  };

  const onViewStudentAvailability = async (studentUserId: number, studentName: string) => {
    setAvailabilityStudentName(studentName);
    setAvailabilitySlots([]);
    setAvailabilityLoading(true);
    setAvailabilityModalVisible(true);
    try {
      const slots = await api.get<AvailabilitySlot[]>(`/availability/users/${studentUserId}`);
      setAvailabilitySlots(slots);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const groupedAvailability = useMemo(() => {
    const groups = new Map<number, string[]>();
    for (const slot of availabilitySlots) {
      const formattedRange = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
      const existing = groups.get(slot.day_of_week) ?? [];
      existing.push(formattedRange);
      groups.set(slot.day_of_week, existing);
    }
    return Array.from(groups.entries()).map(([dayOfWeek, timeRanges]) => ({
      dayOfWeek,
      timeRanges,
    }));
  }, [availabilitySlots]);

  useEffect(() => {
    const tutorId = route.params?.openTutorUserId;
    if (!tutorId || !isStudentAccount || tutorId === lastOpenedTutorRef.current) {
      return;
    }
    lastOpenedTutorRef.current = tutorId;
    setSelectedTutorName(route.params?.openTutorName ?? null);
    void onOpenConversationForTutor(tutorId);
  }, [isStudentAccount, route.params?.openTutorName, route.params?.openTutorUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    const wsBase = API_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl = `${wsBase}/messages/ws/chat/${selectedConversationId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as Message | { error: string };
        if ("error" in payload) {
          return;
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) {
            return prev;
          }
          return [...prev, payload].sort((a, b) => a.id - b.id);
        });
      } catch {
        // Ignore malformed WebSocket payloads.
      }
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [selectedConversationId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading conversations...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#1B2D50" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.headerControls}>
            <View style={[styles.statusDot, wsConnected ? styles.statusOnline : styles.statusOffline]} />
            <Pressable style={styles.secondaryBtn} onPress={onRefresh} disabled={refreshing}>
              <Text style={styles.secondaryBtnText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Messenger</Text>
          <Text style={styles.subtitle}>
            {isStudentAccount ? "Chat with matched tutors" : "Chat with students"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.listPane}>
          <Text style={styles.sectionTitle}>{isStudentAccount ? "Matched Tutors" : "Conversations"}</Text>
          <FlatList
            data={sidebarItems}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              if (item.kind === "match") {
                const selected = item.tutor_id === selectedTutorUserId;
                return (
                  <Pressable
                    style={[styles.conversationRow, selected && styles.conversationSelected]}
                    onPress={() => {
                      void onOpenConversationForTutor(item.tutor_id);
                      setSelectedTutorName(`${item.tutor_first_name} ${item.tutor_last_name}`);
                    }}
                  >
                    <Text style={styles.conversationTitle}>
                      {item.tutor_first_name} {item.tutor_last_name}
                    </Text>
                    <Text style={styles.conversationSub}>
                      Similarity {(item.similarity_score * 100).toFixed(1)}%
                    </Text>
                  </Pressable>
                );
              }

              const selected = item.id === selectedConversationId;
              const personName = (item.other_user_first_name || item.other_user_last_name)
                ? `${item.other_user_first_name ?? ""} ${item.other_user_last_name ?? ""}`.trim()
                : `User ${item.other_user_id}`;
              return (
                <View style={[styles.conversationRow, selected && styles.conversationSelected]}>
                  <Pressable
                    onPress={() => {
                      void onOpenExistingConversation(item.id, item.other_user_id, personName);
                    }}
                  >
                    <Text style={styles.conversationTitle}>{personName}</Text>
                    <Text style={styles.conversationSub}>User ID: {item.other_user_id}</Text>
                  </Pressable>
                  {!isStudentAccount ? (
                    <Pressable
                      style={styles.availabilityBtn}
                      onPress={() => {
                        void onViewStudentAvailability(item.other_user_id, personName);
                      }}
                    >
                      <Text style={styles.availabilityBtnText}>View Availability</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.helperText}>
                {isStudentAccount ? "No matches yet." : "No conversations yet."}
              </Text>
            }
          />
        </View>

        <View style={styles.chatPane}>
          <Text style={styles.sectionTitle}>
            {selectedConversationId
              ? selectedTutorName
                ? `Chat with ${selectedTutorName}`
                : selectedTutorUserId
                  ? `Chat with tutor ${selectedTutorUserId}`
                  : `Conversation #${selectedConversationId}`
              : isStudentAccount
                ? "Select a matched tutor"
                : "Select a conversation"}
          </Text>
          <FlatList
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const mine = currentUserId != null && item.sender_id === currentUserId;
              const attachment = item.attachment ?? null;
              const hasText = item.content.trim().length > 0;
              return (
                <View style={[styles.messageBubble, mine ? styles.myMessage : styles.otherMessage]}>
                  {hasText ? (
                    <Text style={[styles.messageText, mine ? styles.sentMessageText : styles.receivedMessageText]}>
                      {item.content}
                    </Text>
                  ) : null}
                  {attachment ? (
                    <Pressable
                      style={[styles.attachmentCard, mine ? styles.attachmentCardMine : styles.attachmentCardOther]}
                      onPress={() => {
                        const token = getAuthToken();
                        if (!token) return;
                        const url = `${API_BASE_URL}/messages/attachments/${attachment.id}/download?token=${encodeURIComponent(token)}`;
                        void Linking.openURL(url);
                      }}
                    >
                      <Text style={[styles.attachmentTitle, mine ? styles.attachmentTitleMine : styles.attachmentTitleOther]}>
                        {attachment.file_name}
                      </Text>
                      <Text style={[styles.attachmentSub, mine ? styles.attachmentSubMine : styles.attachmentSubOther]}>
                        Open PDF
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.helperText}>No messages yet.</Text>}
            contentContainerStyle={styles.messageListContent}
          />
          <View style={styles.composeRow}>
            <TextInput
              style={styles.composeInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message..."
              editable={selectedConversationId != null && !sending}
            />
            <Pressable
              style={[styles.secondaryBtn, !selectedConversationId && styles.disabledSecondaryBtn]}
              onPress={() => {
                void onAttachPdf();
              }}
              disabled={!selectedConversationId || sending}
            >
              <Text style={styles.secondaryBtnText}>Attach PDF</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, !selectedConversationId && styles.disabledBtn]}
              onPress={onSend}
              disabled={!selectedConversationId || sending}
            >
              <Text style={styles.primaryBtnText}>{sending ? "Sending..." : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Modal visible={availabilityModalVisible} transparent animationType="fade" onRequestClose={() => setAvailabilityModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{availabilityStudentName || "Student"} Availability</Text>
            {availabilityLoading ? (
              <ActivityIndicator size="small" color="#2E57A2" />
            ) : availabilitySlots.length === 0 ? (
              <Text style={styles.modalEmpty}>No availability slots found.</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {groupedAvailability.map((group) => (
                  <View key={group.dayOfWeek} style={styles.modalRow}>
                    <Text style={styles.modalRowDay}>{formatDay(group.dayOfWeek)}</Text>
                    <View style={styles.modalRowTimes}>
                      {group.timeRanges.map((range, index) => (
                        <Text key={`${group.dayOfWeek}-${index}-${range}`} style={styles.modalRowTime}>
                          {range}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <Pressable style={styles.modalCloseBtn} onPress={() => setAvailabilityModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "700",
    color: "#1B2D50",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#5D667C",
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTextBlock: {
    justifyContent: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#EEF3FF",
  },
  backText: {
    marginLeft: 2,
    color: "#1B2D50",
    fontWeight: "600",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOnline: {
    backgroundColor: "#22C55E",
  },
  statusOffline: {
    backgroundColor: "#EF4444",
  },
  content: {
    flex: 1,
    gap: 12,
  },
  listPane: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  chatPane: {
    flex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E1E5EE",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1B2D50",
    marginBottom: 10,
  },
  conversationRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    marginBottom: 8,
  },
  conversationSelected: {
    borderColor: "#2E57A2",
    backgroundColor: "#EEF3FF",
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22293A",
  },
  conversationSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#606B81",
  },
  availabilityBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E57A2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  availabilityBtnText: {
    color: "#2E57A2",
    fontSize: 12,
    fontWeight: "600",
  },
  helperText: {
    marginTop: 8,
    color: "#6F7890",
  },
  messageListContent: {
    paddingBottom: 8,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "88%",
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  myMessage: {
    backgroundColor: "#2E57A2",
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: "#EEF1F7",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#111827",
  },
  sentMessageText: {
    color: "#FFFFFF",
  },
  receivedMessageText: {
    color: "#111827",
  },
  composeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 12,
  },
  composeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D5DCE8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FBFCFE",
  },
  newRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  partnerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D5DCE8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2E57A2",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  disabledSecondaryBtn: {
    borderColor: "#94A3C2",
  },
  disabledBtn: {
    backgroundColor: "#94A3C2",
  },
  attachmentCard: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachmentCardMine: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  attachmentCardOther: {
    borderColor: "#C8D0E0",
    backgroundColor: "#F9FBFF",
  },
  attachmentTitle: {
    fontWeight: "700",
    fontSize: 13,
  },
  attachmentTitleMine: {
    color: "#FFFFFF",
  },
  attachmentTitleOther: {
    color: "#1B2D50",
  },
  attachmentSub: {
    marginTop: 2,
    fontSize: 12,
  },
  attachmentSubMine: {
    color: "#E5E7EB",
  },
  attachmentSubOther: {
    color: "#4B5563",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2D50",
    marginBottom: 12,
  },
  modalEmpty: {
    color: "#6F7890",
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F7",
  },
  modalRowDay: {
    fontWeight: "600",
    color: "#1B2D50",
  },
  modalRowTime: {
    color: "#475569",
    textAlign: "right",
    marginBottom: 2,
  },
  modalRowTimes: {
    alignItems: "flex-end",
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
