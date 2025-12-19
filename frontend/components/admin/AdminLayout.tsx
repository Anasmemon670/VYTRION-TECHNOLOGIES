"use client";

import { ReactNode, useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminProtection } from "./AdminProtection";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slate-900">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex">
          <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </AdminProtection>
  );
}
