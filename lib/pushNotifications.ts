import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://ka26.shop";
const TOKEN_KEY = "ka26_seller_token";

/**
 * Register for push notifications and save the token to the server.
 * Call this after the seller logs in.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[Push] Not a physical device — skipping");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "KA26 Seller Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
      sound: "default",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
    const pushToken = tokenData.data;
    console.log("[Push] Expo push token:", pushToken);

    await registerTokenWithServer(pushToken);
    return pushToken;
  } catch (error) {
    console.error("[Push] Error getting token:", error);
    return null;
  }
}

async function registerTokenWithServer(pushToken: string) {
  try {
    const authToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (!authToken) return;

    const response = await fetch(`${API_BASE}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
        appType: "seller",
      }),
    });

    if (response.ok) {
      console.log("[Push] Token registered with server");
      await AsyncStorage.setItem("ka26_push_token", pushToken);
    }
  } catch (error) {
    console.error("[Push] Failed to register with server:", error);
  }
}

/**
 * Unregister push token (call on logout)
 */
export async function unregisterPushToken() {
  try {
    const pushToken = await AsyncStorage.getItem("ka26_push_token");
    if (!pushToken) return;

    await fetch(`${API_BASE}/api/push/register`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pushToken, appType: "seller" }),
    });

    await AsyncStorage.removeItem("ka26_push_token");
  } catch {
    // Ignore errors on logout
  }
}

/**
 * Configure notification handlers for the seller app
 */
export function setupNotificationHandlers(
  onNotificationTap?: (path: string) => void
) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      const path = (data?.path as string) || "/";
      onNotificationTap?.(path);
    }
  );

  return () => subscription.remove();
}
