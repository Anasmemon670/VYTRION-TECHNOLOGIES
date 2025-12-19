"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "sonner";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  return (
    <AuthProvider>
      <CartProvider>
        <ScrollToTop />
        <Toaster position="top-right" richColors />
        <div className="min-h-screen bg-slate-50">
          {!isAdminRoute && !isAuthRoute && <Header />}
          {children}
          {!isAdminRoute && !isAuthRoute && <Footer />}
          {!isAdminRoute && !isAuthRoute && <BackToTop />}
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
