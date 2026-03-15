import React, { createContext, useContext, useEffect, useState } from "react";
import { verifyAuth, logout as apiLogout, type Seller } from "./api";

interface AuthContextType {
  seller: Seller | null;
  loading: boolean;
  setSeller: (seller: Seller | null) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  seller: null,
  loading: true,
  setSeller: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await verifyAuth();
      if (data.authenticated && data.seller) {
        setSeller(data.seller);
      } else {
        setSeller(null);
      }
    } catch {
      setSeller(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    await apiLogout();
    setSeller(null);
  };

  return (
    <AuthContext.Provider value={{ seller, loading, setSeller, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
