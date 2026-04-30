import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";
import UserCard from "../components/UserCard";

type AdminUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_tutor: boolean;
  is_student: boolean;
  status: number;
};

type ApiMessage = {
  message: string;
};

const PAGE_SIZE = 10;

type SortOption = "recent" | "oldest" | "name";
type FilterOption = "all" | "tutors" | "students" | "active" | "deactivated";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Newest",
  oldest: "Oldest",
  name: "Name (A-Z)",
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "All Users",
  tutors: "Tutors Only",
  students: "Students Only",
  active: "Active",
  deactivated: "Deactivated",
};

function sortUsers(users: AdminUser[], sort: SortOption): AdminUser[] {
  const copy = [...users];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.id - b.id);
    case "name":
      return copy.sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    default:
      return copy.sort((a, b) => b.id - a.id);
  }
}

export default function AdminUsersScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const path = query.trim()
          ? `/users/admin/search?q=${encodeURIComponent(query.trim())}&limit=200`
          : "/users/admin/search?limit=200";
        const data = await api.get<AdminUser[]>(path);
        if (mounted) {
          setUsers(data);
        }
      } catch {
        if (mounted) {
          setUsers([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const filteredUsers = useMemo(() => {
    switch (filterBy) {
      case "tutors":
        return users.filter((user) => user.is_tutor);
      case "students":
        return users.filter((user) => user.is_student);
      case "active":
        return users.filter((user) => user.status === 0);
      case "deactivated":
        return users.filter((user) => user.status === 1);
      default:
        return users;
    }
  }, [filterBy, users]);

  const sortedUsers = useMemo(
    () => sortUsers(filteredUsers, sortBy),
    [filteredUsers, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sortedUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(nextPage, totalPages));
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(safePage));
    }
  };

  const handleSearchChange = (text: string) => {
    setQuery(text);
    setPage(1);
    setPageInput("1");
  };

  const handleSortSelect = (option: SortOption) => {
    setSortBy(option);
    setSortModalVisible(false);
    setPage(1);
    setPageInput("1");
  };

  const handleFilterSelect = (option: FilterOption) => {
    setFilterBy(option);
    setFilterModalVisible(false);
    setPage(1);
    setPageInput("1");
  };

  const handleToggleStatus = async (userId: number) => {
    setUpdatingUserId(userId);
    try {
      await api.patch<ApiMessage>(`/admin/users/${userId}/status`, {});
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? { ...user, status: user.status === 0 ? 1 : 0 }
            : user
        )
      );
    } catch {
      // Keep the current UI state if the request fails.
    } finally {
      setUpdatingUserId((currentId) => (currentId === userId ? null : currentId));
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Search Users</Text>
        <Text style={styles.subtitle}>
          Search all users by first name, last name, or email.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={16} color="#8C93A4" />
          <TextInput
            style={[
              styles.searchInput,
              Platform.OS === "web"
                ? ({ outlineStyle: "none", outlineWidth: 0 } as any)
                : null,
            ]}
            placeholder="Search..."
            placeholderTextColor="#A0A7B8"
            value={query}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleSearchChange("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#8C93A4" />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.controlBtn} onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="options" size={16} color="#FFF" />
          <Text style={styles.controlBtnText}>Filter</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setSortModalVisible(true)}>
          <Ionicons name="swap-vertical" size={16} color="#FFF" />
          <Text style={styles.controlBtnText}>Sort</Text>
        </Pressable>
      </View>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter Users</Text>
            {(Object.keys(FILTER_LABELS) as FilterOption[]).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.modalOption,
                  filterBy === option && styles.modalOptionActive,
                ]}
                onPress={() => handleFilterSelect(option)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    filterBy === option && styles.modalOptionTextActive,
                  ]}
                >
                  {FILTER_LABELS[option]}
                </Text>
                {filterBy === option && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort Users</Text>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.modalOption,
                  sortBy === option && styles.modalOptionActive,
                ]}
                onPress={() => handleSortSelect(option)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sortBy === option && styles.modalOptionTextActive,
                  ]}
                >
                  {SORT_LABELS[option]}
                </Text>
                {sortBy === option && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Text style={styles.resultsText}>
        {sortedUsers.length} user{sortedUsers.length !== 1 ? "s" : ""}
        {query ? ` matching "${query}"` : ""}
        {filterBy !== "all" ? ` • ${FILTER_LABELS[filterBy]}` : ""}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : pageItems.length === 0 ? (
        <Text style={styles.emptyText}>
          {query ? "No users match that search." : "No users found."}
        </Text>
      ) : (
        pageItems.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            updating={updatingUserId === user.id}
            onToggleStatus={handleToggleStatus}
          />
        ))
      )}

      {sortedUsers.length > PAGE_SIZE && (
        <View style={styles.paginationRow}>
          <Pressable
            style={[styles.pageArrow, safePage <= 1 && styles.pageArrowDisabled]}
            onPress={() => goToPage(safePage - 1)}
            disabled={safePage <= 1}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={safePage <= 1 ? "#C0C5D0" : NAVY}
            />
          </Pressable>

          <View style={styles.pageInputWrap}>
            <TextInput
              style={styles.pageInput}
              value={pageInput}
              onChangeText={setPageInput}
              onSubmitEditing={handlePageInputSubmit}
              onBlur={handlePageInputSubmit}
              keyboardType="number-pad"
              returnKeyType="go"
              selectTextOnFocus
            />
          </View>

          <Text style={styles.pageLabel}>of {totalPages}</Text>

          <Pressable
            style={[styles.pageArrow, safePage >= totalPages && styles.pageArrowDisabled]}
            onPress={() => goToPage(safePage + 1)}
            disabled={safePage >= totalPages}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={safePage >= totalPages ? "#C0C5D0" : NAVY}
            />
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const NAVY = "#1B2D50";
const BLUE = "#2E57A2";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    paddingHorizontal: 12,
    height: 42,
  },
  searchBarFocused: {
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: NAVY,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingVertical: 0,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    gap: 5,
    flexShrink: 0,
  },
  controlBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
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
    width: "75%",
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
  resultsText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#59627A",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 10,
  },
  pageArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  pageArrowDisabled: {
    opacity: 0.5,
  },
  pageInputWrap: {
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 8,
    backgroundColor: "#FFF",
    width: 48,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  pageInput: {
    fontSize: 14,
    fontWeight: "600",
    color: NAVY,
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },
  pageLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});
