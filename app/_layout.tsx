import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from "../lib/pushNotifications";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "../lib/theme";

function RootLayoutNav() {
  const { seller, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Register push notifications when seller is logged in
  useEffect(() => {
    if (seller) {
      registerForPushNotifications();
    }
  }, [seller]);

  // Handle notification taps
  useEffect(() => {
    const cleanup = setupNotificationHandlers((path) => {
      if (path.includes("/restaurant")) {
        router.push("/(tabs)/restaurant");
      } else if (path.includes("/product")) {
        router.push("/(tabs)/products");
      } else {
        router.push("/(tabs)");
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";

    if (!seller && !inAuth) {
      router.replace("/(auth)/login");
    } else if (seller && inAuth) {
      router.replace("/(tabs)");
    }
  }, [seller, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            title: "Edit Product",
            headerTintColor: Colors.primary,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
