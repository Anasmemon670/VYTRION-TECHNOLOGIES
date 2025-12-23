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
    
    // Check for failed attempts tracking
    const failedAttemptsKey = `failedLoginAttempts_${email}`;
    const failedAttemptsData = typeof window !== 'undefined' 
      ? localStorage.getItem(failedAttemptsKey) 
      : null;
    
    let failedAttempts = 0;
    let lastAttemptTime = 0;
    
    if (failedAttemptsData) {
      try {
        const data = JSON.parse(failedAttemptsData);
        failedAttempts = data.count || 0;
        lastAttemptTime = data.lastAttempt || 0;
      } catch {
        // Invalid data, reset
      }
    }
    
    // Check if user has exceeded max failed attempts
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - lastAttemptTime;
      
      if (timeSinceLastAttempt < LOCKOUT_DURATION) {
        const remainingMinutes = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
        setIsLoading(false);
        throw new Error(`Too many failed login attempts. Please try again after ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`);
      } else {
        // Lockout period expired, reset attempts
        if (typeof window !== 'undefined') {
          localStorage.removeItem(failedAttemptsKey);
        }
        failedAttempts = 0;
      }
    }
    
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.user && response.token && response.refreshToken) {
        // Success - clear failed attempts
        if (typeof window !== 'undefined') {
          localStorage.removeItem(failedAttemptsKey);
        }
        
        // Store tokens
        localStorage.setItem("accessToken", response.token);
        localStorage.setItem("refreshToken", response.refreshToken);
        
        // Store user data
        setUser(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        setIsLoading(false);
        return true;
      }
      
      // Invalid response - increment failed attempts
      if (typeof window !== 'undefined') {
        localStorage.setItem(failedAttemptsKey, JSON.stringify({
          count: failedAttempts + 1,
          lastAttempt: Date.now()
        }));
      }
      
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      
      // Handle rate limiting (429) errors
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        let errorMessage = "Too many login attempts. Please wait a moment and try again.";
        
        if (resetTime) {
          try {
            const resetDate = new Date(resetTime);
            const now = new Date();
            const secondsUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);
            
            if (secondsUntilReset > 0) {
              errorMessage = `Too many login attempts. Please try again in ${secondsUntilReset} second${secondsUntilReset !== 1 ? 's' : ''}.`;
            }
          } catch {
            // If date parsing fails, use default message
          }
        }
        
        // Increment failed attempts for rate limit too
        if (typeof window !== 'undefined') {
          localStorage.setItem(failedAttemptsKey, JSON.stringify({
            count: failedAttempts + 1,
            lastAttempt: Date.now()
          }));
        }
        
        // Throw error with message so LoginPage can catch and display it
        throw new Error(errorMessage);
      }
      
      // Handle invalid credentials (401) - increment failed attempts
      if (error.response?.status === 401) {
        const newFailedAttempts = failedAttempts + 1;
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(failedAttemptsKey, JSON.stringify({
            count: newFailedAttempts,
            lastAttempt: Date.now()
          }));
        }
        
        // Check if we should lock the account
        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          throw new Error(`Too many failed login attempts. Please try again after 15 minutes.`);
        } else {
          const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
          throw new Error(`Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before temporary lockout.`);
        }
      }
      
      // Re-throw other errors so LoginPage can handle them
      throw error;
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
    } catch (error: any) {
      // Handle rate limiting (429) errors gracefully - still logout locally
      if (error.response?.status === 429) {
        console.warn("Logout rate limited, clearing auth locally");
      } else {
        console.error("Logout error:", error);
      }
    } finally {
      // Always clear auth locally, even if API call fails
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