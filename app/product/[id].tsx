import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  apiGet,
  apiPut,
  uploadImage,
  type Product,
  type Category,
} from "../../lib/api";
import { Colors, Spacing } from "../../lib/theme";

interface LocalImage {
  id?: number;
  uri: string;
  url?: string;
  publicId?: string;
  filename?: string;
  isNew?: boolean;
}

const CONDITIONS = [
  { value: "new", label: "New", icon: "✨" },
  { value: "like_new", label: "Like New", icon: "👍" },
  { value: "good", label: "Good", icon: "👌" },
  { value: "fair", label: "Fair", icon: "🤏" },
];

const STATUSES = [
  { value: "available", label: "Available", color: Colors.success },
  { value: "reserved", label: "Reserved", color: Colors.warning },
  { value: "sold", label: "Sold", color: Colors.danger },
];

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("good");
  const [status, setStatus] = useState("available");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [shippingAvailable, setShippingAvailable] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, [id]);

  const loadProduct = async () => {
    try {
      const product = await apiGet<Product>(`/api/products/${id}`);
      setTitle(product.title);
      setDescription(product.description || "");
      setPrice(product.price);
      setCondition(product.condition || "good");
      setStatus(product.status);
      setCategoryId(product.categoryId);
      setPickupAddress(product.pickupAddress || "");
      setShippingAvailable(product.shippingAvailable);
      setExpiresAt(product.expiresAt);
      setImages(
        product.images.map((img) => ({
          id: img.id,
          uri: img.url,
          url: img.url,
          publicId: img.publicId,
          isNew: false,
        }))
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to load product"
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiGet<Category[]>("/api/categories");
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const pickFromCamera = async () => {
    const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImages((prev) => [
        ...prev,
        {
          uri: asset.uri,
          filename: asset.fileName || `photo_${Date.now()}.jpg`,
          isNew: true,
        },
      ]);
    }
  };

  const pickFromGallery = async () => {
    const { status: permStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      mediaTypes: ["images"],
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImgs = result.assets.map((asset) => ({
        uri: asset.uri,
        filename: asset.fileName || `photo_${Date.now()}.jpg`,
        isNew: true,
      }));
      setImages((prev) => [...prev, ...newImgs].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const showImagePicker = () => {
    Alert.alert("Add Photo", "Choose an option", [
      { text: "Camera", onPress: pickFromCamera },
      { text: "Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRenew = async () => {
    Alert.alert(
      "Renew Listing",
      "This will extend your listing for another 30 days. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Renew",
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiPut(`/api/products/${id}`, { renew: true });
              Alert.alert("Success", "Listing renewed for 30 more days!");
              await loadProduct();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to renew"
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a product title");
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    setSubmitting(true);
    try {
      const finalImages: { id?: number; url: string; publicId: string }[] = [];

      for (const img of images) {
        if (img.isNew) {
          const uploaded = await uploadImage(
            img.uri,
            img.filename || `photo_${Date.now()}.jpg`
          );
          finalImages.push({ url: uploaded.url, publicId: uploaded.publicId });
        } else {
          finalImages.push({
            id: img.id,
            url: img.url!,
            publicId: img.publicId!,
          });
        }
      }

      await apiPut(`/api/products/${id}`, {
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        condition,
        categoryId,
        status,
        images: finalImages,
        pickupAddress: pickupAddress.trim() || null,
        shippingAvailable,
      });

      Alert.alert("Success", "Product updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update product"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Expiration Banner */}
        {expiresAt && (
          <View style={[styles.expirationBanner, isExpired && styles.expirationBannerExpired]}>
            <Ionicons
              name={isExpired ? "alert-circle" : "time-outline"}
              size={16}
              color={isExpired ? Colors.danger : Colors.warning}
            />
            <Text style={[styles.expirationText, isExpired && styles.expirationTextExpired]}>
              {isExpired
                ? "This listing has expired. Renew it to make it visible again."
                : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </Text>
            {isExpired && (
              <TouchableOpacity
                style={styles.renewButton}
                onPress={handleRenew}
                disabled={submitting}
              >
                <Text style={styles.renewButtonText}>Renew</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Image Picker */}
        <Text style={styles.label}>Photos ({images.length}/10)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageRow}
        >
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={showImagePicker}
            disabled={images.length >= 10}
          >
            <Ionicons name="camera" size={28} color={Colors.primary} />
            <Text style={styles.addImageText}>Add Photo</Text>
          </TouchableOpacity>

          {images.map((img, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.statusChip,
                status === s.value && {
                  backgroundColor: s.color + "15",
                  borderColor: s.color,
                },
              ]}
              onPress={() => setStatus(s.value)}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: status === s.value ? s.color : Colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  status === s.value && { color: s.color },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What are you selling?"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Price */}
        <Text style={styles.label}>Price (EUR) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                categoryId === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  categoryId === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Condition */}
        <Text style={styles.label}>Condition</Text>
        <View style={styles.conditionRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.conditionChip,
                condition === c.value && styles.conditionChipActive,
              ]}
              onPress={() => setCondition(c.value)}
            >
              <Text style={styles.conditionIcon}>{c.icon}</Text>
              <Text
                style={[
                  styles.conditionChipText,
                  condition === c.value && styles.conditionChipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pickup Address */}
        <Text style={styles.label}>Pickup Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Where can the buyer pick up the item?"
          placeholderTextColor={Colors.textMuted}
          value={pickupAddress}
          onChangeText={setPickupAddress}
        />

        {/* Shipping toggle */}
        <View style={styles.shippingRow}>
          <View>
            <Text style={styles.shippingLabel}>Shipping Available</Text>
            <Text style={styles.shippingHint}>Can you ship this item?</Text>
          </View>
          <Switch
            value={shippingAvailable}
            onValueChange={setShippingAvailable}
            trackColor={{ true: Colors.primary }}
          />
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your product (optional)"
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.submitContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitText}>Saving...</Text>
            </View>
          ) : (
            <View style={styles.submitContent}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Save Changes</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  expirationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFBEB",
    padding: Spacing.md,
    borderRadius: 10,
    marginBottom: Spacing.md,
  },
  expirationBannerExpired: {
    backgroundColor: "#FEF2F2",
  },
  expirationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
  },
  expirationTextExpired: {
    color: Colors.danger,
  },
  renewButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  renewButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
  },
  imageRow: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
  },
  addImageText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  mainBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  categoryRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  conditionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  conditionChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  conditionChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  conditionIcon: {
    fontSize: 18,
  },
  conditionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  conditionChipTextActive: {
    color: Colors.primary,
  },
  shippingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shippingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  shippingHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
