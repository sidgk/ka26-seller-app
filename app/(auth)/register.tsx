import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { register } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Colors, Spacing } from "../../lib/theme";

export default function RegisterScreen() {
  const { setSeller } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!inviteCode) {
      Alert.alert("Invite Required", "You need an invite code from an existing seller to register.");
      return;
    }
    if (!name || !email || !password || !whatsapp) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await register(name.trim(), email.trim(), password, whatsapp, inviteCode.trim());
      setSeller(data.seller);
    } catch (err) {
      Alert.alert(
        "Registration Failed",
        err instanceof Error ? err.message : "Please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>Join KA26</Text>
          <Text style={styles.subtitle}>
            Invite-only seller registration
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <TextInput
              style={styles.inviteInput}
              placeholder="Paste your invite code here"
              placeholderTextColor={Colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
            />
            <Text style={styles.inviteHint}>
              Ask an existing KA26 seller for an invite.
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="WhatsApp number (e.g., +91 81973 63421)"
            placeholderTextColor={Colors.textMuted}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.hint}>
            Buyers will contact you on your WhatsApp number.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  logoContainer: { alignItems: "center", marginBottom: Spacing.xxxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "900" },
  title: { fontSize: 26, fontWeight: "700", color: Colors.text },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.md },
  inviteBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 12,
    padding: Spacing.lg,
  },
  inviteLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  inviteInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  inviteHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
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
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -4,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkContainer: { alignItems: "center", marginTop: Spacing.xxl },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primary, fontWeight: "600" },
});
