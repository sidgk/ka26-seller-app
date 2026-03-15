import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPut, apiDelete, type Product } from "../../lib/api";
import { Colors, Spacing } from "../../lib/theme";

type StatusFilter = "all" | "available" | "sold" | "reserved";

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);

      const data = await apiGet<{ products: Product[] }>(
        `/api/products?${params.toString()}`
      );
      setProducts(data.products);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [filter, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleMarkSold = (product: Product) => {
    Alert.alert(
      "Mark as Sold",
      `Mark "${product.title}" as sold?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Sold",
          style: "destructive",
          onPress: async () => {
            try {
              await apiPut(`/api/products/${product.id}`, { status: "sold" });
              loadProducts();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to update"
              );
            }
          },
        },
      ]
    );
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiDelete(`/api/products/${product.id}`);
              loadProducts();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete"
              );
            }
          },
        },
      ]
    );
  };

  const handleMarkAvailable = async (product: Product) => {
    try {
      await apiPut(`/api/products/${product.id}`, { status: "available" });
      loadProducts();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update"
      );
    }
  };

  const renderStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; color: string; label: string }> = {
      available: { bg: Colors.successBg, color: Colors.success, label: "Available" },
      sold: { bg: Colors.dangerBg, color: Colors.danger, label: "Sold" },
      reserved: { bg: Colors.warningBg, color: Colors.warning, label: "Reserved" },
    };
    const config = configs[status] || configs.available;

    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imageUrl = item.images?.[0]?.url;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productContent}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          {/* Thumbnail */}
          <View style={styles.thumbnail}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.thumbnailIcon}>
                  {item.category?.icon || "📦"}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            <View style={styles.productMeta}>
              {renderStatusBadge(item.status)}
              <Text style={styles.productCategory}>
                {item.category?.icon} {item.category?.name}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actions}>
          {item.status === "available" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionSold]}
              onPress={() => handleMarkSold(item)}
            >
              <Ionicons name="bag-check-outline" size={16} color={Colors.danger} />
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>
                Mark Sold
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "sold" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionAvailable]}
              onPress={() => handleMarkAvailable(item)}
            >
              <Ionicons name="refresh-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>
                Relist
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionEdit]}
            onPress={() => router.push(`/product/${item.id}`)}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "available", label: "Active" },
    { key: "sold", label: "Sold" },
    { key: "reserved", label: "Reserved" },
  ];

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={Colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f.key && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>
                {search
                  ? "Try a different search term"
                  : "Tap the + button to add your first product"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  productContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailIcon: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productCategory: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionSold: {
    backgroundColor: Colors.dangerBg,
  },
  actionAvailable: {
    backgroundColor: Colors.successBg,
  },
  actionEdit: {
    backgroundColor: Colors.primaryLight,
  },
  actionDelete: {
    backgroundColor: Colors.dangerBg,
    marginLeft: "auto",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xxl,
  },
});
