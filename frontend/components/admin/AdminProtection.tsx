"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface AdminProtectionProps {
  children: React.ReactNode;
}

export function AdminProtection({ children }: AdminProtectionProps) {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // User not logged in, redirect to login
        router.push("/login");
      } else if (!isAdmin()) {
        // User is not admin, redirect to home
        router.push("/");
      } else {
        // User is admin, allow access
        setIsChecking(false);
      }
    }
  }, [user, isLoading, isAdmin, router]);

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
