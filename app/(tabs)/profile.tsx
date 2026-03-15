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
  Share,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  apiGet,
  createInvite,
  getMyInvites,
  type SellerStats,
  type Invite,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const { seller, logout } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);

  const loadProfile = async () => {
    try {
      const [data, inviteData] = await Promise.all([
        apiGet<SellerStats>("/api/seller"),
        getMyInvites(),
      ]);
      setStats(data);
      setInvites(inviteData);
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
      await loadProfile();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create invite"
      );
    } finally {
      setInviting(false);
    }
  };

  const sellerInfo = stats?.seller || seller;
  const memberSince = stats?.seller?.createdAt
    ? new Date(stats.seller.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;

  const trustScore = stats?.seller?.trustScore ?? 0;
  const trustStars = Math.round(trustScore / 20);

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

        {/* Trust Score Badge */}
        {stats && (
          <View style={styles.trustBadge}>
            <View style={styles.trustStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= trustStars ? "star" : "star-outline"}
                  size={14}
                  color={i <= trustStars ? "#F59E0B" : Colors.textMuted}
                />
              ))}
            </View>
            <Text style={styles.trustText}>Trust Score: {trustScore}/100</Text>
          </View>
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
            <Text style={styles.statValue}>{stats.seller.totalSales}</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.stats.referrals}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
        </View>
      )}

      {/* Invite Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite a Seller</Text>

        <TouchableOpacity
          style={[styles.inviteButton, inviting && { opacity: 0.6 }]}
          onPress={handleInvite}
          disabled={inviting || !stats?.stats.canInvite}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.inviteButtonText}>
            {stats?.stats.canInvite
              ? "Create Invite Link"
              : "Invite Already Sent"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.inviteHint}>
          You can invite one trusted person to sell on KA26.
        </Text>

        {/* Existing Invites */}
        {invites.length > 0 && (
          <View style={styles.inviteList}>
            {invites.map((invite) => (
              <View key={invite.id} style={styles.inviteItem}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName}>
                    {invite.refereeName || invite.refereeEmail || "Invite"}
                  </Text>
                  <Text style={styles.inviteStatus}>
                    {invite.status === "accepted"
                      ? "Accepted"
                      : invite.status === "expired"
                      ? "Expired"
                      : `Pending · Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.inviteStatusDot,
                    {
                      backgroundColor:
                        invite.status === "accepted"
                          ? Colors.success
                          : invite.status === "expired"
                          ? Colors.danger
                          : Colors.warning,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}
      </View>

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
  trustBadge: {
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
  },
  trustStars: {
    flexDirection: "row",
    gap: 2,
  },
  trustText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
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
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: "#6366F1",
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  inviteHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  inviteList: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  inviteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  inviteStatus: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  inviteStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
