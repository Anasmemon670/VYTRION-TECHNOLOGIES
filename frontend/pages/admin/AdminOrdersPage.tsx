"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Eye, X, Loader2, RefreshCw } from "lucide-react";
import { ordersAPI } from "@/lib/api";

interface OrderItem {
  product: {
    id: string;
    title: string;
  };
  quantity: number;
  unitPrice: string;
}

interface SubOrder {
  id: string;
  items: OrderItem[];
  status: string;
  trackingNumber?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalAmount: string;
  status: string;
  createdAt: string;
  subOrders: SubOrder[];
}


export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await ordersAPI.getAll({ limit: 100 });
      setOrders(response.orders || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.error || 'Failed to load orders');
      setOrders([]);
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    };
    loadOrders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId);
      await ordersAPI.update(orderId, { status: newStatus as any });
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (err: any) {
      console.error('Error updating order:', err);
      alert(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "processed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "shipped": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "delivered": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl mb-2">Manage Orders</h1>
            <p className="text-slate-400">{orders.length} total orders</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No orders found.</p>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                {/* Order Info */}
                <div className="md:col-span-2">
                  <h3 className="text-white text-lg mb-1">{order.orderNumber}</h3>
                  <p className="text-slate-400 text-sm">
                    {order.user.firstName} {order.user.lastName}
                  </p>
                  <p className="text-slate-500 text-sm">{order.user.email}</p>
                  <p className="text-slate-500 text-sm mt-2">Date: {formatDate(order.createdAt)}</p>
                </div>

                {/* Products */}
                <div>
                  <p className="text-slate-300 text-sm mb-1">Products:</p>
                  {order.subOrders.flatMap(subOrder => subOrder.items).map((item, idx) => (
                    <p key={idx} className="text-slate-400 text-sm">
                      {item.product.title} x{item.quantity}
                    </p>
                  ))}
                </div>

                {/* Amount */}
                <div>
                  <p className="text-slate-300 text-sm mb-1">Total Amount:</p>
                  <p className="text-cyan-400 text-lg">${parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>

                {/* Status & Actions */}
                <div className="space-y-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={updating === order.id}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-700 disabled:opacity-50 ${getStatusColor(order.status)}`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-2xl">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 mb-1 text-sm">Order Number:</p>
                  <p className="text-white text-lg">{selectedOrder.orderNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 mb-1 text-sm">Customer Name:</p>
                    <p className="text-white">{selectedOrder.user.firstName} {selectedOrder.user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1 text-sm">Email:</p>
                    <p className="text-white">{selectedOrder.user.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1 text-sm">Order Date:</p>
                  <p className="text-white">{formatDate(selectedOrder.createdAt)}</p>
                </div>

                <div>
                  <p className="text-slate-400 mb-2 text-sm">Products:</p>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2 border border-slate-600">
                    {selectedOrder.subOrders.flatMap(subOrder => subOrder.items).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-white">{item.product.title} x{item.quantity}</span>
                        <span className="text-slate-300">${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1 text-sm">Total Amount:</p>
                  <p className="text-cyan-400 text-2xl">${parseFloat(selectedOrder.totalAmount).toFixed(2)}</p>
                </div>

                <div>
                  <p className="text-slate-400 mb-1 text-sm">Status:</p>
                  <span className={`inline-block px-4 py-2 border rounded-lg ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

export default AdminOrdersPage;
