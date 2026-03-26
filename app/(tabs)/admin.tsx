import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

interface User {
  id: number;
  name: string;
  email: string;
  whatsappNumber: string;
  role: string;
  status: string;
  sellerType: string;
  maxProducts: number;
  trustScore: number;
  totalSales: number;
  createdAt: string;
  _count: { products: number };
}

interface Stats {
  pending: number;
  active: number;
  disabled: number;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://ka26.shop";

export default function AdminScreen() {
  const { seller } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, active: 0, disabled: 0 });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editLimit, setEditLimit] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      const data = await apiGet<{ users: User[]; stats: Stats }>(
        `/api/admin/users?${params}`
      );
      setUsers(data.users || []);
      setStats(data.stats || { pending: 0, active: 0, disabled: 0 });
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const updateUser = async (userId: number, data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const token = await (await import("../../lib/api")).getToken();
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchUsers();
        setEditUser(null);
        Alert.alert("Success", "User updated");
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Error", err.error || "Failed to update");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setActionLoading(false);
    }
  };

  // If not admin, show access denied
  if (seller?.role !== "admin") {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
        <Text style={styles.deniedTitle}>Admin Only</Text>
        <Text style={styles.deniedSubtitle}>
          This section is restricted to administrators
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const total = stats.pending + stats.active + stats.disabled;

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return { bg: "#DCFCE7", text: "#16A34A" };
      case "pending": return { bg: "#FEF9C3", text: "#CA8A04" };
      case "disabled": return { bg: "#FEE2E2", text: "#DC2626" };
      default: return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { key: "all", label: "Total", value: total, color: "#3B82F6" },
          { key: "pending", label: "Pending", value: stats.pending, color: "#EAB308" },
          { key: "active", label: "Active", value: stats.active, color: "#22C55E" },
          { key: "disabled", label: "Disabled", value: stats.disabled, color: "#EF4444" },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.statCard,
              filter === s.key && { borderColor: s.color, borderWidth: 2 },
            ]}
            onPress={() => setFilter(s.key)}
          >
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchUsers}
          returnKeyType="search"
        />
      </View>

      {/* Users List */}
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        users.map((user) => {
          const sc = statusColor(user.status);
          return (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {user.role === "admin" && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {user.status}
                  </Text>
                </View>
              </View>

              <View style={styles.userMeta}>
                <Text style={styles.metaText}>
                  📦 {user._count.products} products
                </Text>
                <Text style={styles.metaText}>
                  📊 Limit: {user.maxProducts}
                </Text>
                <Text style={styles.metaText}>
                  🏷️ {user.sellerType || "product"}
                </Text>
              </View>

              <View style={styles.actions}>
                {user.status === "pending" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#16A34A" }]}
                    onPress={() =>
                      Alert.alert(
                        "Approve User",
                        `Approve ${user.name}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Approve",
                            onPress: () =>
                              updateUser(user.id, { status: "active" }),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                )}
                {user.status === "active" && user.role !== "admin" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() =>
                      Alert.alert(
                        "Disable User",
                        `Disable ${user.name}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Disable",
                            style: "destructive",
                            onPress: () =>
                              updateUser(user.id, { status: "disabled" }),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.actionBtnText}>Disable</Text>
                  </TouchableOpacity>
                )}
                {user.status === "disabled" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#22C55E" }]}
                    onPress={() => updateUser(user.id, { status: "active" })}
                  >
                    <Text style={styles.actionBtnText}>Re-enable</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#6B7280" }]}
                  onPress={() => {
                    setEditUser(user);
                    setEditLimit(String(user.maxProducts));
                  }}
                >
                  <Text style={styles.actionBtnText}>Edit Limit</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Edit Modal */}
      <Modal visible={!!editUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product Limit</Text>
            <Text style={styles.modalSubtitle}>
              {editUser?.name} ({editUser?.email})
            </Text>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              value={editLimit}
              onChangeText={setEditLimit}
              keyboardType="numeric"
              placeholder="Product limit"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#7C3AED" }]}
                onPress={() => {
                  if (editUser) {
                    updateUser(editUser.id, {
                      maxProducts: parseInt(editLimit) || 10,
                    });
                  }
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalBtnText}>
                  {actionLoading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#E5E7EB" }]}
                onPress={() => setEditUser(null)}
              >
                <Text style={[styles.modalBtnText, { color: "#374151" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 40,
  },
  deniedTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginTop: 12 },
  deniedSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
  },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  userCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  userEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  adminBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: "#7C3AED" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },
  userMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
