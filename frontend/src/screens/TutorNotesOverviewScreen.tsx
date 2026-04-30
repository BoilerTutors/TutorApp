import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

type SessionNote = {
  id: number;
  session_id: number;
  tutor_id: number;
  student_id: number;
  content: string;
  subject: string;
  created_at: string;
  updated_at: string;
};

type StudentInfo = {
  id: number;
  name: string;
};

const NAVY = "#1B2D50";
const ALL = "__all__";

export default function TutorNotesOverviewScreen() {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState<string>(ALL);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await api.get<SessionNote[]>("/session-notes/tutor/me");
      setNotes(fetched);

      const uniqueStudentIds = Array.from(new Set(fetched.map((n) => n.student_id)));
      const lookups = await Promise.all(
        uniqueStudentIds.map(async (id) => {
          try {
            const user = await api.get<{ first_name: string; last_name: string }>(
              `/users/${id}`
            );
            return { id, name: `${user.first_name} ${user.last_name}`.trim() };
          } catch {
            return { id, name: `Student #${id}` };
          }
        })
      );
      setStudents(lookups);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotes();
    }, [loadNotes])
  );

  const studentNameById = useMemo(() => {
    const m = new Map<number, string>();
    students.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [students]);

  const subjects = useMemo(() => {
    return Array.from(new Set(notes.map((n) => n.subject))).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (studentFilter !== ALL && String(n.student_id) !== studentFilter) {
        return false;
      }
      if (subjectFilter !== ALL && n.subject !== subjectFilter) {
        return false;
      }
      return true;
    });
  }, [notes, studentFilter, subjectFilter]);

  const studentLabel =
    studentFilter === ALL
      ? "All Students"
      : studentNameById.get(Number(studentFilter)) ?? `Student #${studentFilter}`;
  const subjectLabel = subjectFilter === ALL ? "All Subjects" : subjectFilter;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Notes</Text>
        <Text style={styles.subtitle}>
          {notes.length} note{notes.length !== 1 ? "s" : ""} total
        </Text>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={styles.filterPill}
          onPress={() => setStudentModalVisible(true)}
        >
          <Ionicons name="person-outline" size={14} color={NAVY} />
          <Text style={styles.filterPillText}>{studentLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={NAVY} />
        </Pressable>
        <Pressable
          style={styles.filterPill}
          onPress={() => setSubjectModalVisible(true)}
        >
          <Ionicons name="book-outline" size={14} color={NAVY} />
          <Text style={styles.filterPillText}>{subjectLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={NAVY} />
        </Pressable>
        {(studentFilter !== ALL || subjectFilter !== ALL) && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => {
              setStudentFilter(ALL);
              setSubjectFilter(ALL);
            }}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={NAVY} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>
          {notes.length === 0
            ? "You haven't added any notes yet. Tap a completed session in Past Sessions to start."
            : "No notes match your filters."}
        </Text>
      ) : (
        filtered.map((note) => (
          <View key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteStudent}>
                {studentNameById.get(note.student_id) ?? `Student #${note.student_id}`}
              </Text>
              <Text style={styles.noteSubject}>{note.subject}</Text>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
            <Text style={styles.noteTimestamp}>
              {new Date(note.updated_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        ))
      )}

      <FilterModal
        visible={studentModalVisible}
        title="Filter by Student"
        options={[
          { value: ALL, label: "All Students" },
          ...students.map((s) => ({ value: String(s.id), label: s.name })),
        ]}
        selected={studentFilter}
        onSelect={(v) => {
          setStudentFilter(v);
          setStudentModalVisible(false);
        }}
        onClose={() => setStudentModalVisible(false)}
      />

      <FilterModal
        visible={subjectModalVisible}
        title="Filter by Subject"
        options={[
          { value: ALL, label: "All Subjects" },
          ...subjects.map((s) => ({ value: s, label: s })),
        ]}
        selected={subjectFilter}
        onSelect={(v) => {
          setSubjectFilter(v);
          setSubjectModalVisible(false);
        }}
        onClose={() => setSubjectModalVisible(false)}
      />
    </ScrollView>
  );
}

type FilterOption = { value: string; label: string };

function FilterModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.modalOption,
                  selected === opt.value && styles.modalOptionActive,
                ]}
                onPress={() => onSelect(opt.value)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selected === opt.value && styles.modalOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 16,
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: NAVY,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterPillText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: "600",
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: 13,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noteStudent: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
  },
  noteSubject: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F2F4F8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noteContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
  },
  noteTimestamp: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 14,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: NAVY,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
  },
  modalOptionTextActive: {
    color: "#FFF",
  },
});