import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://ka26-marketplace-4374945524.us-central1.run.app";

const TOKEN_KEY = "ka26_seller_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const headers = await authHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const headers = await authHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
}

export async function uploadImage(
  uri: string,
  filename: string
): Promise<{ url: string; publicId: string }> {
  const headers = await authHeaders();
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: filename,
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: { ...headers },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }

  return res.json();
}

// Auth
export async function login(
  email: string,
  password: string
): Promise<{ token: string; seller: Seller }> {
  const data = await apiPost<{
    success: boolean;
    token: string;
    seller: Seller;
  }>("/api/auth/login", { email, password });
  await setToken(data.token);
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  whatsappNumber: string,
  inviteToken: string
): Promise<{ token: string; seller: Seller }> {
  const data = await apiPost<{
    success: boolean;
    token: string;
    seller: Seller;
  }>("/api/auth/register", { name, email, password, whatsappNumber, inviteToken });
  await setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await removeToken();
}

export async function verifyAuth(): Promise<{
  authenticated: boolean;
  seller?: Seller;
}> {
  try {
    return await apiGet("/api/auth/verify");
  } catch {
    return { authenticated: false };
  }
}

// Invite
export async function createInvite(name?: string, email?: string): Promise<{
  success: boolean;
  invite: { token: string; inviteLink: string; expiresAt: string };
}> {
  return apiPost("/api/invite", { name: name || null, email: email || null });
}

export async function getMyInvites(): Promise<Invite[]> {
  return apiGet("/api/invite");
}

// Types
export interface Seller {
  id: number;
  name: string;
  email: string;
  whatsappNumber?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

export interface ProductImage {
  id?: number;
  url: string;
  publicId: string;
  order: number;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  condition: string | null;
  status: string;
  pickupAddress: string | null;
  shippingAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
  expiresAt: string | null;
  categoryId: number;
  category: Category;
  sellerId: number;
  seller: Seller;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface SellerStats {
  seller: Seller & {
    whatsappNumber: string;
    createdAt: string;
    trustScore: number;
    totalSales: number;
    maxProducts: number;
  };
  stats: {
    total: number;
    available: number;
    sold: number;
    reserved: number;
    expired: number;
    maxProducts: number;
    referrals: number;
    canInvite: boolean;
  };
}

export interface Invite {
  id: number;
  token: string;
  refereeName: string | null;
  refereeEmail: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}
