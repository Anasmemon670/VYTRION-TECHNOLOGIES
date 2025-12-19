"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { authAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  profilePicture?: string | null;
  isAdmin: boolean;
  marketingOptIn?: boolean;
  walletBalance?: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string, termsAccepted: boolean, marketingOptIn?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: () => boolean;
  updateUser: (userData: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const clearAuth = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  };

  // Check for saved user and token on mount, fetch profile if token exists
  useEffect(() => {
    const initAuth = async () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      // Prevent multiple simultaneous calls
      if (initRef.current) {
        return;
      }
      initRef.current = true;

      try {
        const token = localStorage.getItem("accessToken");
        const savedUser = localStorage.getItem("user");

        if (token && savedUser) {
          try {
            // Verify token is still valid by fetching profile
            const response = await authAPI.getProfile();
            if (response && response.user) {
              setUser(response.user);
              localStorage.setItem("user", JSON.stringify(response.user));
            } else {
              // Token invalid, clear everything
              clearAuth();
            }
          } catch (error) {
            // Token expired or invalid, clear everything silently
            // Don't clear if it's a network error - might be backend not running
            console.error("Auth initialization error:", error);
            // Only clear if it's an auth error (401/403), not network errors or rate limiting
            if (error && typeof error === 'object' && 'response' in error) {
              const axiosError = error as any;
              const status = axiosError.response?.status;
              if (status === 401 || status === 403) {
                clearAuth();
              } else if (status === 429) {
                // Rate limited - use saved user data, don't clear
                try {
                  const parsedUser = JSON.parse(savedUser);
                  setUser(parsedUser);
                } catch {
                  // Invalid saved user, clear
                  clearAuth();
                }
              } else {
                // Network error or other - keep saved user data
                try {
                  const parsedUser = JSON.parse(savedUser);
                  setUser(parsedUser);
                } catch {
                  clearAuth();
                }
              }
            } else {
              // Network error - keep saved user data
              try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
              } catch {
                clearAuth();
              }
            }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        // Fallback: if anything fails, just set loading to false
        console.error("Auth init error:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
        initRef.current = false;
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, undefined, password);
      
      if (response.user && response.token && response.refreshToken) {
        // Store tokens
        localStorage.setItem("accessToken", response.token);
        localStorage.setItem("refreshToken", response.refreshToken);
        
        // Store user data
        setUser(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    termsAccepted: boolean,
    marketingOptIn: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await authAPI.register({
        firstName,
        lastName,
        email,
        password,
        termsAccepted,
        marketingOptIn,
      });

      if (response.user && response.token && response.refreshToken) {
        // Store tokens
        localStorage.setItem("accessToken", response.token);
        localStorage.setItem("refreshToken", response.refreshToken);
        
        // Store user data
        setUser(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        setIsLoading(false);
        return { success: true };
      }
      
      setIsLoading(false);
      return { success: false, error: "Registration failed. Invalid response from server." };
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle network errors
      if (!error.response) {
        if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
          setIsLoading(false);
          return { success: false, error: "Cannot connect to server. Please make sure the backend server is running on port 5000." };
        }
        setIsLoading(false);
        return { success: false, error: "Network error. Please check your connection and try again." };
      }
      
      // Handle API errors
      const errorMessage = error.response?.data?.error || error.message || "Registration failed. Please try again.";
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
    }
  };

  const isAdmin = () => {
    return user?.isAdmin === true;
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.user) {
        setUser(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
      }
    } catch (error: any) {
      console.error("Refresh user error:", error);
      // Only clear auth if it's an authentication error (401/403), not network errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        clearAuth();
      }
      // For other errors (network, etc.), keep the user logged in
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, isAdmin, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe default during SSR when context is not available
    if (typeof window === 'undefined') {
      return {
        user: null,
        login: async () => false,
        register: async () => ({ success: false, error: 'Server-side rendering' }),
        logout: async () => {},
        isLoading: false,
        isAdmin: () => false,
        updateUser: () => {},
        refreshUser: async () => {},
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}