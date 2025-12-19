"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../components/admin/AdminLayout";
import {
  Package,
  FileText,
  Briefcase,
  Wrench,
  ShoppingCart,
  Mail,
  Loader2
} from "lucide-react";
import { adminAPI, productsAPI, blogAPI, ordersAPI, servicesAPI, projectsAPI, contactAPI } from "@/lib/api";

const dashboardCards = [
  {
    title: "Products",
    description: "Manage products, pricing, and inventory",
    icon: Package,
    path: "/admin/products",
    color: "from-cyan-500 to-blue-500",
    countKey: "totalProducts"
  },
  {
    title: "Blog",
    description: "Create and manage blog posts",
    icon: FileText,
    path: "/admin/blog",
    color: "from-purple-500 to-pink-500",
    countKey: "totalBlogs"
  },
  {
    title: "Projects",
    description: "Manage project portfolio",
    icon: Briefcase,
    path: "/admin/projects",
    color: "from-green-500 to-teal-500",
    countKey: "totalProjects"
  },
  {
    title: "Services",
    description: "Manage service offerings",
    icon: Wrench,
    path: "/admin/services",
    color: "from-orange-500 to-red-500",
    countKey: "totalServices"
  },
  {
    title: "Orders",
    description: "View and manage customer orders",
    icon: ShoppingCart,
    path: "/admin/orders",
    color: "from-indigo-500 to-purple-500",
    countKey: "totalOrders"
  },
  {
    title: "Contact Messages",
    description: "View customer contact messages",
    icon: Mail,
    path: "/admin/contact-messages",
    color: "from-yellow-500 to-orange-500",
    countKey: "totalMessages"
  }
];

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch admin stats
        const statsResponse = await adminAPI.getStats();
        setStats(statsResponse.stats);

        // Fetch counts for other items
        const [productsRes, blogRes, servicesRes, projectsRes, contactRes] = await Promise.all([
          productsAPI.getAll({ limit: 1 }),
          blogAPI.getAll({ limit: 1, published: false }),
          servicesAPI.getAll({ limit: 1, active: false }),
          projectsAPI.getAll({ limit: 1 }),
          contactAPI.getAll({ limit: 1, archived: false })
        ]);

        setCounts({
          totalProducts: statsResponse.stats?.totalProducts || productsRes.pagination?.total || 0,
          totalBlogs: blogRes.pagination?.total || 0,
          totalOrders: statsResponse.stats?.totalOrders || 0,
          totalProjects: projectsRes.pagination?.total || 0,
          totalServices: servicesRes.pagination?.total || 0,
          totalMessages: contactRes.pagination?.total || 0,
        });
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.response?.data?.error || 'Failed to load dashboard');
        setCounts({
          totalProducts: 0,
          totalBlogs: 0,
          totalOrders: 0,
          totalProjects: 0,
          totalServices: 0,
          totalMessages: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-white text-4xl mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome to the admin panel</p>
        </motion.div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
              <p className="text-white text-2xl font-bold">${parseFloat(stats.totalRevenue || '0').toFixed(2)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Total Users</p>
              <p className="text-white text-2xl font-bold">{stats.totalUsers || 0}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Total Orders</p>
              <p className="text-white text-2xl font-bold">{stats.totalOrders || 0}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Pending Returns</p>
              <p className="text-white text-2xl font-bold">{stats.pendingReturns || 0}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            const count = counts[card.countKey] || 0;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => router.push(card.path)}
                className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer group border border-slate-700 hover:border-cyan-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-slate-400 text-2xl">{count}</span>
                </div>
                <h3 className="text-white text-xl mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm">{card.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
