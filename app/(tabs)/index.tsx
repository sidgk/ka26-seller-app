import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, type SellerStats } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

export default function DashboardScreen() {
  const { seller } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await apiGet<SellerStats>("/api/seller");
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>
          {greeting()}, {seller?.name?.split(" ")[0] || "Seller"} 👋
        </Text>
        <Text style={styles.greetingSub}>
          Here&apos;s your store overview
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statPrimary]}>
          <Ionicons name="cube" size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats?.stats.total ?? "–"}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>

        <View style={[styles.statCard, styles.statSuccess]}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.statNumber}>{stats?.stats.available ?? "–"}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>

        <View style={[styles.statCard, styles.statWarning]}>
          <Ionicons name="time" size={24} color={Colors.warning} />
          <Text style={styles.statNumber}>{stats?.stats.reserved ?? "–"}</Text>
          <Text style={styles.statLabel}>Reserved</Text>
        </View>

        <View style={[styles.statCard, styles.statDanger]}>
          <Ionicons name="bag-check" size={24} color={Colors.danger} />
          <Text style={styles.statNumber}>{stats?.stats.sold ?? "–"}</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/add-product")}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/products")}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#f0fdf4" }]}>
            <Ionicons name="list" size={24} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>My Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#fffbeb" }]}>
            <Ionicons name="settings" size={24} color={Colors.warning} />
          </View>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color={Colors.warning} />
        <Text style={styles.tipText}>
          Tip: Products with photos sell 3x faster! Take clear, well-lit photos
          of your items.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  greetingContainer: {
    marginBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  greetingSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statPrimary: {},
  statSuccess: {},
  statWarning: {},
  statDanger: {},
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tipCard: {
    backgroundColor: Colors.warningBg,
    borderRadius: 12,
    padding: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
