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
  Switch,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPut, getToken } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cuisine: string | null;
  address: string;
  phone: string | null;
  isActive: boolean;
  openingTime: string | null;
  closingTime: string | null;
  deliveryFee: string;
  minOrder: string;
  avgRating: number;
  totalOrders: number;
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  instructions: string | null;
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  items: { id: number; quantity: number; price: string; menuItem: { name: string } }[];
}

type Tab = "overview" | "menu" | "orders";

export default function RestaurantScreen() {
  const { seller } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Setup form
  const [setupForm, setSetupForm] = useState({
    name: "",
    cuisine: "",
    address: "",
    phone: "",
    openingTime: "09:00",
    closingTime: "22:00",
    deliveryFee: "20",
    minOrder: "100",
  });

  // Menu form
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main Course",
    isVeg: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiGet<{
        restaurant: Restaurant;
        menuItems: MenuItem[];
        orders: Order[];
        error?: string;
      }>("/api/seller/restaurant");
      if (data.restaurant) {
        setRestaurant(data.restaurant);
        setMenuItems(data.menuItems || []);
        setOrders(data.orders || []);
        setHasRestaurant(true);
      } else {
        setHasRestaurant(false);
      }
    } catch (err) {
      // 404 means no restaurant - that's expected for new sellers
      setHasRestaurant(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateRestaurant = async () => {
    if (!setupForm.name.trim() || !setupForm.address.trim()) {
      Alert.alert("Error", "Restaurant name and address are required");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/restaurants", {
        name: setupForm.name,
        cuisine: setupForm.cuisine || undefined,
        address: setupForm.address,
        phone: setupForm.phone || undefined,
        openingTime: setupForm.openingTime,
        closingTime: setupForm.closingTime,
        deliveryFee: parseFloat(setupForm.deliveryFee) || 0,
        minOrder: parseFloat(setupForm.minOrder) || 0,
      });
      Alert.alert("Success", "Restaurant created!");
      await fetchData();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create restaurant"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!menuForm.name.trim() || !menuForm.price.trim()) {
      Alert.alert("Error", "Item name and price are required");
      return;
    }
    if (!restaurant) return;
    setSaving(true);
    try {
      const item = await apiPost<MenuItem>(
        `/api/restaurants/${restaurant.id}/menu`,
        {
          name: menuForm.name,
          description: menuForm.description || undefined,
          price: parseFloat(menuForm.price),
          category: menuForm.category,
          isVeg: menuForm.isVeg,
        }
      );
      setMenuItems((prev) => [...prev, item]);
      setMenuForm({
        name: "",
        description: "",
        price: "",
        category: "Main Course",
        isVeg: true,
      });
      setShowMenuForm(false);
      Alert.alert("Success", "Menu item added!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add menu item"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (itemId: number, isAvailable: boolean) => {
    if (!restaurant) return;
    try {
      const token = await getToken();
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://ka26.shop";
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurant.id}/menu/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAvailable: !isAvailable }),
        }
      );
      if (res.ok) {
        setMenuItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isAvailable: !isAvailable } : item
          )
        );
      }
    } catch {}
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = await getToken();
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://ka26.shop";
      const res = await fetch(
        `${API_BASE}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        Alert.alert("Error", "Failed to update order status");
      }
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return { bg: "#FEF9C3", text: "#A16207" };
      case "accepted": return { bg: "#DBEAFE", text: "#1D4ED8" };
      case "preparing": return { bg: "#F3E8FF", text: "#7C3AED" };
      case "ready": return { bg: "#DCFCE7", text: "#16A34A" };
      case "delivered": return { bg: "#F3F4F6", text: "#6B7280" };
      case "cancelled": return { bg: "#FEE2E2", text: "#DC2626" };
      default: return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const formatOrderTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  // No restaurant — show setup form
  if (!hasRestaurant) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.setupContent}
      >
        <View style={styles.setupHeader}>
          <Text style={{ fontSize: 48 }}>🍔</Text>
          <Text style={styles.setupTitle}>Set Up Your Restaurant</Text>
          <Text style={styles.setupSubtitle}>
            Start receiving food orders on KA26 Eats
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Restaurant Name *</Text>
          <TextInput
            style={styles.input}
            value={setupForm.name}
            onChangeText={(v) => setSetupForm((p) => ({ ...p, name: v }))}
            placeholder="e.g. Hotel Kamat"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Cuisine</Text>
          <TextInput
            style={styles.input}
            value={setupForm.cuisine}
            onChangeText={(v) => setSetupForm((p) => ({ ...p, cuisine: v }))}
            placeholder="e.g. South Indian"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={styles.input}
            value={setupForm.address}
            onChangeText={(v) => setSetupForm((p) => ({ ...p, address: v }))}
            placeholder="Full restaurant address"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={setupForm.phone}
            onChangeText={(v) => setSetupForm((p) => ({ ...p, phone: v }))}
            placeholder="+91..."
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Delivery Fee (₹)</Text>
              <TextInput
                style={styles.input}
                value={setupForm.deliveryFee}
                onChangeText={(v) =>
                  setSetupForm((p) => ({ ...p, deliveryFee: v }))
                }
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Min Order (₹)</Text>
              <TextInput
                style={styles.input}
                value={setupForm.minOrder}
                onChangeText={(v) =>
                  setSetupForm((p) => ({ ...p, minOrder: v }))
                }
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, saving && { opacity: 0.6 }]}
            onPress={handleCreateRestaurant}
            disabled={saving}
          >
            <Text style={styles.createButtonText}>
              {saving ? "Creating..." : "Create Restaurant"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  // Restaurant dashboard
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Restaurant Header */}
      <View style={styles.restaurantHeader}>
        <View style={styles.restaurantHeaderContent}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <Text style={styles.restaurantMeta}>
            {restaurant?.cuisine || "Restaurant"} •{" "}
            {restaurant?.address?.split(",")[0]}
          </Text>
        </View>
        <View style={styles.restaurantStats}>
          <Text style={styles.ordersCount}>
            {restaurant?.totalOrders || 0}
          </Text>
          <Text style={styles.ordersLabel}>Orders</Text>
        </View>
      </View>

      <View style={styles.restaurantInfo}>
        {restaurant?.openingTime && restaurant?.closingTime && (
          <Text style={styles.infoText}>
            🕐 {restaurant.openingTime} – {restaurant.closingTime}
          </Text>
        )}
        <Text style={styles.infoText}>🚚 ₹{restaurant?.deliveryFee} delivery</Text>
        <Text style={styles.infoText}>📦 ₹{restaurant?.minOrder} min</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["overview", "menu", "orders"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[styles.tabText, tab === t && styles.tabTextActive]}
            >
              {t === "overview"
                ? "📊 Overview"
                : t === "menu"
                ? `🍽️ Menu (${menuItems.length})`
                : `📋 Orders (${orders.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Tab */}
      {tab === "overview" && (
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[styles.statCardValue, { color: "#2563EB" }]}>
                {menuItems.length}
              </Text>
              <Text style={styles.statCardLabel}>Menu Items</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[styles.statCardValue, { color: "#16A34A" }]}>
                {menuItems.filter((m) => m.isAvailable).length}
              </Text>
              <Text style={styles.statCardLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFFBEB" }]}>
              <Text style={[styles.statCardValue, { color: "#D97706" }]}>
                {restaurant?.avgRating
                  ? restaurant.avgRating.toFixed(1)
                  : "—"}
              </Text>
              <Text style={styles.statCardLabel}>Rating</Text>
            </View>
          </View>

          <View style={[styles.statsGrid, { marginBottom: 16 }]}>
            <View style={[styles.statCard, { backgroundColor: "#FEF9C3" }]}>
              <Text style={[styles.statCardValue, { color: "#A16207" }]}>
                {pendingOrdersCount}
              </Text>
              <Text style={styles.statCardLabel}>Pending Orders</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#F3E8FF" }]}>
              <Text style={[styles.statCardValue, { color: "#7C3AED" }]}>
                {orders.filter((o) => o.status === "preparing").length}
              </Text>
              <Text style={styles.statCardLabel}>Preparing</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[styles.statCardValue, { color: "#16A34A" }]}>
                {orders.filter((o) => o.status === "ready").length}
              </Text>
              <Text style={styles.statCardLabel}>Ready</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              setTab("menu");
              setShowMenuForm(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#F97316" />
            <Text style={styles.quickActionText}>Add Menu Item</Text>
          </TouchableOpacity>

          {pendingOrdersCount > 0 && (
            <TouchableOpacity
              style={[styles.quickAction, { marginTop: 10, borderColor: "#FDE68A" }]}
              onPress={() => setTab("orders")}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
              <Text style={[styles.quickActionText, { color: "#D97706" }]}>
                {pendingOrdersCount} pending order{pendingOrdersCount > 1 ? "s" : ""} — tap to view
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Menu Tab */}
      {tab === "menu" && (
        <View style={styles.section}>
          {/* Add button */}
          <TouchableOpacity
            style={styles.addMenuButton}
            onPress={() => setShowMenuForm(!showMenuForm)}
          >
            <Ionicons
              name={showMenuForm ? "close-circle" : "add-circle"}
              size={20}
              color="#fff"
            />
            <Text style={styles.addMenuButtonText}>
              {showMenuForm ? "Cancel" : "Add Item"}
            </Text>
          </TouchableOpacity>

          {/* Add Menu Item Form */}
          {showMenuForm && (
            <View style={styles.menuFormCard}>
              <TextInput
                style={styles.input}
                value={menuForm.name}
                onChangeText={(v) =>
                  setMenuForm((p) => ({ ...p, name: v }))
                }
                placeholder="Item name *"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={menuForm.price}
                onChangeText={(v) =>
                  setMenuForm((p) => ({ ...p, price: v }))
                }
                placeholder="Price (₹) *"
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={menuForm.description}
                onChangeText={(v) =>
                  setMenuForm((p) => ({ ...p, description: v }))
                }
                placeholder="Description (optional)"
                placeholderTextColor={Colors.textMuted}
              />

              <View style={styles.vegToggle}>
                <Text style={styles.vegLabel}>
                  {menuForm.isVeg ? "🟢 Veg" : "🔴 Non-Veg"}
                </Text>
                <Switch
                  value={menuForm.isVeg}
                  onValueChange={(v) =>
                    setMenuForm((p) => ({ ...p, isVeg: v }))
                  }
                  trackColor={{ false: "#EF4444", true: "#22C55E" }}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitMenuButton, saving && { opacity: 0.6 }]}
                onPress={handleAddMenuItem}
                disabled={saving}
              >
                <Text style={styles.submitMenuButtonText}>
                  {saving ? "Adding..." : "Add to Menu"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Menu Items List */}
          {menuItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>🍽️</Text>
              <Text style={styles.emptyTitle}>No menu items yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first dish to start receiving orders
              </Text>
            </View>
          ) : (
            menuItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.menuItemCard,
                  !item.isAvailable && { opacity: 0.5 },
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.vegDot,
                      {
                        borderColor: item.isVeg ? "#22C55E" : "#EF4444",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.vegDotInner,
                        {
                          backgroundColor: item.isVeg
                            ? "#22C55E"
                            : "#EF4444",
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemMeta}>
                      {item.category} • ₹{item.price}
                    </Text>
                    {item.description && (
                      <Text style={styles.menuItemDesc}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.availBadge,
                    {
                      backgroundColor: item.isAvailable
                        ? "#DCFCE7"
                        : "#F3F4F6",
                    },
                  ]}
                  onPress={() =>
                    toggleAvailability(item.id, item.isAvailable)
                  }
                >
                  <Text
                    style={[
                      styles.availBadgeText,
                      {
                        color: item.isAvailable ? "#16A34A" : "#6B7280",
                      },
                    ]}
                  >
                    {item.isAvailable ? "Available" : "Unavailable"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <View style={styles.section}>
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                Orders will appear here when customers place them
              </Text>
            </View>
          ) : (
            orders.map((order) => {
              const statusColor = getStatusColor(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Order header */}
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                      <Text style={styles.orderTime}>{formatOrderTime(order.createdAt)}</Text>
                    </View>
                    <View style={[styles.orderStatusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.orderStatusText, { color: statusColor.text }]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Customer info */}
                  <View style={styles.orderCustomer}>
                    <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.orderCustomerText}>{order.customerName}</Text>
                    <Ionicons name="call-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: 10 }} />
                    <Text style={styles.orderCustomerText}>{order.customerPhone}</Text>
                  </View>

                  {/* Items */}
                  <View style={styles.orderItems}>
                    {order.items.map((item) => (
                      <View key={item.id} style={styles.orderItemRow}>
                        <Text style={styles.orderItemQty}>{item.quantity}x</Text>
                        <Text style={styles.orderItemName}>{item.menuItem.name}</Text>
                        <Text style={styles.orderItemPrice}>₹{item.price}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Instructions */}
                  {order.instructions && (
                    <View style={styles.orderInstructions}>
                      <Ionicons name="chatbubble-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.orderInstructionsText}>{order.instructions}</Text>
                    </View>
                  )}

                  {/* Total */}
                  <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalLabel}>Total</Text>
                    <Text style={styles.orderTotalValue}>₹{order.total}</Text>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.orderActions}>
                    {order.status === "pending" && (
                      <>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#DBEAFE" }]}
                          onPress={() => updateOrderStatus(order.id, "accepted")}
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#1D4ED8" }]}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#FEE2E2" }]}
                          onPress={() =>
                            Alert.alert("Cancel Order", "Are you sure?", [
                              { text: "No" },
                              { text: "Yes", onPress: () => updateOrderStatus(order.id, "cancelled") },
                            ])
                          }
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#DC2626" }]}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {order.status === "accepted" && (
                      <>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#F3E8FF" }]}
                          onPress={() => updateOrderStatus(order.id, "preparing")}
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#7C3AED" }]}>Preparing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#FEE2E2" }]}
                          onPress={() =>
                            Alert.alert("Cancel Order", "Are you sure?", [
                              { text: "No" },
                              { text: "Yes", onPress: () => updateOrderStatus(order.id, "cancelled") },
                            ])
                          }
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#DC2626" }]}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {order.status === "preparing" && (
                      <>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#DCFCE7" }]}
                          onPress={() => updateOrderStatus(order.id, "ready")}
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#16A34A" }]}>Ready</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, { backgroundColor: "#FEE2E2" }]}
                          onPress={() =>
                            Alert.alert("Cancel Order", "Are you sure?", [
                              { text: "No" },
                              { text: "Yes", onPress: () => updateOrderStatus(order.id, "cancelled") },
                            ])
                          }
                        >
                          <Text style={[styles.orderActionBtnText, { color: "#DC2626" }]}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {order.status === "ready" && (
                      <TouchableOpacity
                        style={[styles.orderActionBtn, { backgroundColor: "#F3F4F6", flex: 1 }]}
                        onPress={() => updateOrderStatus(order.id, "delivered")}
                      >
                        <Text style={[styles.orderActionBtnText, { color: "#6B7280" }]}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  setupContent: { padding: 20, paddingBottom: 40 },
  setupHeader: { alignItems: "center", marginBottom: 24 },
  setupTitle: { fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 8 },
  setupSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  createButton: {
    backgroundColor: "#F97316",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  restaurantHeader: {
    backgroundColor: "#F97316",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restaurantHeaderContent: { flex: 1 },
  restaurantName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  restaurantMeta: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  restaurantStats: { alignItems: "center" },
  ordersCount: { fontSize: 28, fontWeight: "800", color: "#fff" },
  ordersLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  restaurantInfo: {
    backgroundColor: "#EA580C",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  infoText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabItemActive: { backgroundColor: "#fff", elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.text },
  section: { paddingHorizontal: 16 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statCardValue: { fontSize: 24, fontWeight: "800" },
  statCardLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: "600" },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#FDBA74",
    borderStyle: "dashed",
  },
  quickActionText: { fontSize: 15, fontWeight: "600", color: "#F97316" },
  addMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F97316",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  addMenuButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  menuFormCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 10,
  },
  vegToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  vegLabel: { fontSize: 15, fontWeight: "600", color: Colors.text },
  submitMenuButton: {
    backgroundColor: "#F97316",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  submitMenuButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  menuItemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  vegDot: { width: 16, height: 16, borderRadius: 3, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  vegDotInner: { width: 8, height: 8, borderRadius: 4 },
  menuItemName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  menuItemMeta: { fontSize: 12, color: Colors.textSecondary },
  menuItemDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  availBadgeText: { fontSize: 11, fontWeight: "700" },
  // Orders styles
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderNumber: { fontSize: 16, fontWeight: "800", color: Colors.text },
  orderTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  orderStatusText: { fontSize: 12, fontWeight: "700" },
  orderCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderCustomerText: { fontSize: 13, color: Colors.textSecondary },
  orderItems: { marginBottom: 8 },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  orderItemQty: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F97316",
    width: 30,
  },
  orderItemName: { fontSize: 13, color: Colors.text, flex: 1 },
  orderItemPrice: { fontSize: 13, color: Colors.textSecondary },
  orderInstructions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderInstructionsText: { fontSize: 12, color: "#92400E", flex: 1 },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 10,
  },
  orderTotalLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  orderTotalValue: { fontSize: 16, fontWeight: "800", color: "#F97316" },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  orderActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  orderActionBtnText: { fontSize: 14, fontWeight: "700" },
});
