import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  apiGet,
  createInvite,
  type SellerStats,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

export default function DashboardScreen() {
  const { seller } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);

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

  const handleInvite = async () => {
    if (!stats?.stats.canInvite) {
      Alert.alert(
        "Invite Limit Reached",
        "You can only invite one person. Your invite has already been used or is pending."
      );
      return;
    }

    setInviting(true);
    try {
      const result = await createInvite();
      const link = result.invite.inviteLink;

      Alert.alert("Invite Created!", "Share this link with someone you trust.", [
        {
          text: "Copy Link",
          onPress: async () => {
            await Clipboard.setStringAsync(link);
            Alert.alert("Copied!", "Invite link copied to clipboard.");
          },
        },
        {
          text: "Share",
          onPress: () => {
            Share.share({
              message: `You're invited to sell on KA26! Download the app and register here: ${link}`,
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create invite"
      );
    } finally {
      setInviting(false);
    }
  };

  const trustScore = stats?.seller?.trustScore ?? 0;
  const trustStars = Math.round(trustScore / 20); // 0-100 → 0-5 stars

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

      {/* Trust Score Card */}
      {stats && (
        <View style={styles.trustCard}>
          <View style={styles.trustHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.trustTitle}>Trust Score</Text>
          </View>
          <View style={styles.trustBody}>
            <Text style={styles.trustScore}>{trustScore}</Text>
            <Text style={styles.trustMax}>/100</Text>
          </View>
          <View style={styles.trustStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= trustStars ? "star" : "star-outline"}
                size={16}
                color={i <= trustStars ? "#F59E0B" : Colors.textMuted}
              />
            ))}
          </View>
          <View style={styles.trustDetails}>
            <Text style={styles.trustDetail}>
              {stats.seller.totalSales} sales
            </Text>
            <Text style={styles.trustDot}>·</Text>
            <Text style={styles.trustDetail}>
              {stats.stats.referrals} referral{stats.stats.referrals !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}

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

      {/* Product Limit */}
      {stats && (
        <View style={styles.limitBar}>
          <Text style={styles.limitText}>
            Active listings: {stats.stats.available}/{stats.stats.maxProducts}
          </Text>
          <View style={styles.limitTrack}>
            <View
              style={[
                styles.limitFill,
                {
                  width: `${Math.min((stats.stats.available / stats.stats.maxProducts) * 100, 100)}%`,
                  backgroundColor:
                    stats.stats.available >= stats.stats.maxProducts
                      ? Colors.danger
                      : Colors.primary,
                },
              ]}
            />
          </View>
          {stats.stats.expired > 0 && (
            <Text style={styles.expiredText}>
              {stats.stats.expired} expired listing{stats.stats.expired !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}

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
          style={[styles.actionButton, inviting && { opacity: 0.6 }]}
          onPress={handleInvite}
          disabled={inviting}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="person-add" size={24} color="#6366F1" />
          </View>
          <Text style={styles.actionText}>Invite Seller</Text>
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
    marginBottom: Spacing.lg,
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
  trustCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  trustBody: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  trustScore: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.primary,
  },
  trustMax: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  trustStars: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  trustDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  trustDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  trustDot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
  limitBar: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  limitText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  limitTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  limitFill: {
    height: 6,
    borderRadius: 3,
  },
  expiredText: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: Spacing.sm,
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
