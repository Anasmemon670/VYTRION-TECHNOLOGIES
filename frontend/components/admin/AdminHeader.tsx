"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { LogOut, User, Menu } from "lucide-react";
import logoImage from "@/assets/77ac9b30465e2a638fe36d43d6692e10b6bf92e1.png";

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleLogoClick = () => {
    router.push("/admin");
  };

  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Menu Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="lg:hidden text-white hover:text-cyan-400 transition-colors p-2 -ml-2"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            >
              <img src={logoImage.src} alt="Vytrion Technologies" className="h-6 sm:h-8" />
              <span className="text-cyan-400 text-xs sm:text-sm bg-cyan-400/10 px-2 sm:px-3 py-1 rounded-full border border-cyan-400/30">
                Admin Panel
              </span>
            </div>
          </div>

          {/* Admin User Info */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-xs sm:text-sm">{user?.name || "Admin"}</p>
                <p className="text-slate-400 text-xs">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 sm:px-4 py-2 rounded-lg transition-all border border-red-500/30 text-xs sm:text-sm"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
