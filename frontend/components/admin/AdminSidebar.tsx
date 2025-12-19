"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Package,
  FileText,
  Briefcase,
  Wrench,
  ShoppingCart,
  Mail,
  X
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { name: "Blog", path: "/admin/blog", icon: FileText },
  { name: "Projects", path: "/admin/projects", icon: Briefcase },
  { name: "Services", path: "/admin/services", icon: Wrench },
  { name: "Messages", path: "/admin/contact-messages", icon: Mail },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 min-h-[calc(100vh-73px)] hidden lg:block">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.path) ?? false;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? "bg-cyan-500 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -100 }}
              animate={{ x: 0 }}
              exit={{ x: -100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-[73px] bottom-0 w-64 bg-slate-800 border-r border-slate-700 z-50 overflow-y-auto"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-700">
                <h2 className="text-white font-semibold">Menu</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.path === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.path) ?? false;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                        ? "bg-cyan-500 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
