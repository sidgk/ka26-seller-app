import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, type SellerStats } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const { seller, logout } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await apiGet<SellerStats>("/api/seller");
      setStats(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const sellerInfo = stats?.seller || seller;
  const memberSince = stats?.seller?.createdAt
    ? new Date(stats.seller.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {sellerInfo?.name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{sellerInfo?.name || "Seller"}</Text>
        <Text style={styles.email}>{sellerInfo?.email}</Text>
        {memberSince && (
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        )}
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stats.total}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stats.available}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stats.sold}</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
        </View>
      )}

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.menuItem}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Name</Text>
            <Text style={styles.menuValue}>{sellerInfo?.name}</Text>
          </View>
        </View>

        <View style={styles.menuItem}>
          <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Email</Text>
            <Text style={styles.menuValue}>{sellerInfo?.email}</Text>
          </View>
        </View>

        {stats?.seller?.whatsappNumber && (
          <View style={styles.menuItem}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>WhatsApp</Text>
              <Text style={styles.menuValue}>
                +{stats.seller.whatsappNumber}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            Linking.openURL("https://ka26.in");
          }}
        >
          <Ionicons name="globe-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Visit Marketplace</Text>
            <Text style={styles.menuValue}>ka26.in</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.textSecondary}
          />
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Version</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>KA26 Seller App</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  menuValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.dangerBg,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.danger,
  },
  footerText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
});
