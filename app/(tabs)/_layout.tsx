import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../lib/theme";
import { apiGet, apiPost } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const ADMIN_EMAIL = "siddugkattimani@gmail.com";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function NotifBellHeader() {
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const fetchNotifs = async () => {
    try {
      const data = await apiGet<{
        unreadCount: number;
        notifications: Notification[];
      }>("/api/seller/notifications");
      setUnread(data.unreadCount || 0);
      setNotifs(data.notifications || []);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await apiPost("/api/seller/notifications", { all: true });
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPanel(true)}
        style={styles.bellButton}
      >
        <Ionicons name="notifications-outline" size={22} color={Colors.text} />
        {unread > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {unread > 9 ? "9+" : unread}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPanel(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPanel(false)}
        >
          <Pressable
            style={styles.notifPanel}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderTitle}>Notifications</Text>
              {unread > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.markAllRead}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.notifList}>
              {notifs.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={32}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.notifEmptyText}>
                    No notifications yet
                  </Text>
                </View>
              ) : (
                notifs.slice(0, 20).map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notifItem,
                      !n.isRead && styles.notifItemUnread,
                    ]}
                  >
                    <View style={styles.notifItemContent}>
                      <View style={styles.notifItemRow}>
                        <Text
                          style={styles.notifItemTitle}
                          numberOfLines={1}
                        >
                          {n.title}
                        </Text>
                        <Text style={styles.notifItemTime}>
                          {timeAgo(n.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.notifItemBody} numberOfLines={2}>
                        {n.body}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.notifClose}
              onPress={() => setShowPanel(false)}
            >
              <Text style={styles.notifCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function TabsLayout() {
  const { seller } = useAuth();
  const isAdmin = seller?.email === ADMIN_EMAIL;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerRight: () => <NotifBellHeader />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
          headerTitle: "KA26 Seller",
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 20,
            color: Colors.primary,
          },
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-product"
        options={{
          title: "Add",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
          ),
          headerTitle: "New Product",
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          title: "Eats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
          headerTitle: "My Restaurant",
          headerTitleStyle: { fontWeight: "800", color: "#F97316" },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          headerTitle: "Admin Panel",
          headerTitleStyle: { fontWeight: "800", color: "#7C3AED" },
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  notifPanel: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 16,
    maxHeight: "70%",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notifHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  notifList: {
    maxHeight: 400,
  },
  notifEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  notifEmptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
  notifItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  notifItemUnread: {
    backgroundColor: "#EFF6FF",
  },
  notifItemContent: {},
  notifItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  notifItemTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  notifItemBody: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  notifClose: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  notifCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
