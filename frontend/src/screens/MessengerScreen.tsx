import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../config";
import { api, getAuthToken } from "../api/client";

type Conversation = {
  id: number;
  user1_id: number;
  user2_id: number;
  other_user_id: number;
};

type Message = {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
};

type UserMe = {
  id: number;
};

export default function MessengerScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    const me = await api.get<UserMe>("/users/me");
    const convs = await api.get<Conversation[]>("/messages/conversations");
    setCurrentUserId(me.id);
    setConversations(convs);
    if (!selectedConversationId && convs.length > 0) {
      setSelectedConversationId(convs[0].id);
    }
  }, [selectedConversationId]);

  const loadMessages = useCallback(async (conversationId: number) => {
    const rows = await api.get<Message[]>(`/messages/conversations/${conversationId}/messages`);
    setMessages(rows);
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadConversations();
    } finally {
      setLoading(false);
    }
  }, [loadConversations]);

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
      await loadConversations();
      if (selectedConversationId) {
        await loadMessages(selectedConversationId);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const onCreateOrOpenConversation = async () => {
    const otherUserId = Number(partnerId);
    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return;
    }
    const conv = await api.post<Conversation>("/messages/conversations", {
      other_user_id: otherUserId,
    });
    setPartnerId("");
    await loadConversations();
    setSelectedConversationId(conv.id);
    await loadMessages(conv.id);
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
      <View style={styles.header}>
        <Text style={styles.title}>Messenger</Text>
        <View style={styles.headerActions}>
          <View style={[styles.statusDot, wsConnected ? styles.statusOnline : styles.statusOffline]} />
          <Pressable style={styles.secondaryBtn} onPress={onRefresh} disabled={refreshing}>
            <Text style={styles.secondaryBtnText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.newRow}>
        <TextInput
          style={styles.partnerInput}
          value={partnerId}
          onChangeText={setPartnerId}
          placeholder="User ID to message"
          keyboardType="number-pad"
        />
        <Pressable style={styles.primaryBtn} onPress={onCreateOrOpenConversation}>
          <Text style={styles.primaryBtnText}>Open Chat</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.listPane}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const selected = item.id === selectedConversationId;
              return (
                <Pressable
                  style={[styles.conversationRow, selected && styles.conversationSelected]}
                  onPress={() => setSelectedConversationId(item.id)}
                >
                  <Text style={styles.conversationTitle}>Chat #{item.id}</Text>
                  <Text style={styles.conversationSub}>with user {item.other_user_id}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.helperText}>No conversations yet.</Text>}
          />
        </View>

        <View style={styles.chatPane}>
          <Text style={styles.sectionTitle}>
            {selectedConversation
              ? `Conversation #${selectedConversation.id}`
              : "Select a conversation"}
          </Text>
          <FlatList
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const mine = currentUserId != null && item.sender_id === currentUserId;
              return (
                <View style={[styles.messageBubble, mine ? styles.myMessage : styles.otherMessage]}>
                  <Text style={styles.messageText}>{item.content}</Text>
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
              style={[styles.primaryBtn, !selectedConversationId && styles.disabledBtn]}
              onPress={onSend}
              disabled={!selectedConversationId || sending}
            >
              <Text style={styles.primaryBtnText}>{sending ? "Sending..." : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B1F2B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    gap: 10,
  },
  listPane: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DFE4EE",
  },
  chatPane: {
    flex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DFE4EE",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B3345",
    marginBottom: 8,
  },
  conversationRow: {
    padding: 10,
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
  helperText: {
    marginTop: 8,
    color: "#6F7890",
  },
  messageListContent: {
    paddingBottom: 8,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
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
  composeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 10,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  disabledBtn: {
    backgroundColor: "#94A3C2",
  },
});
