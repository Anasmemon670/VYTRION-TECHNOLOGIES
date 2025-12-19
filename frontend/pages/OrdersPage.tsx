"use client";

import { useState, useEffect } from "react";
import { ordersAPI } from "@/lib/api";
import { Loader2, X, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OrderItem {
  product: {
    id: string;
    title: string;
    images?: string[] | null;
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
  totalAmount: string;
  status: string;
  createdAt: string;
  subOrders: SubOrder[];
}

export function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ordersAPI.getAll({ limit: 50 });
      setOrders(response.orders || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load orders');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [router]);

  const handleCancelOrder = async (orderId: string) => {
    // Use toast for confirmation instead of browser confirm to avoid page reload
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      await ordersAPI.update(orderId, { status: 'CANCELLED' });
      toast.success('Order cancelled successfully');
      
      // Update local state instead of full page reload
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'CANCELLED' }
            : order
        )
      );
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      const errorMessage = err.response?.data?.error || 'Failed to cancel order';
      toast.error(errorMessage);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') return 'bg-green-100 text-green-700';
    if (statusLower === 'shipped') return 'bg-blue-100 text-blue-700';
    if (statusLower === 'processed') return 'bg-purple-100 text-purple-700';
    if (statusLower === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-slate-900 font-bold text-3xl sm:text-4xl">My Orders</h1>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">You haven't placed any orders yet.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg"
            >
              Browse Products
            </button>
          </div>
        )}

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-slate-900 font-semibold text-lg sm:text-xl">
                    Order {order.orderNumber}
                  </h2>
                  <p className="text-slate-600 text-sm mt-1">Date: {formatDate(order.createdAt)}</p>
                  <p className="text-slate-600 text-sm">Total: ${parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium self-start sm:self-center ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancelOrder(order.id);
                      }}
                      disabled={cancellingOrderId === order.id}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      {cancellingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Cancel Order
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-slate-700 font-medium mb-3 text-sm sm:text-base">Items:</p>
                <div className="space-y-4">
                  {order.subOrders.map((subOrder) => (
                    <div key={subOrder.id} className="space-y-2">
                      {subOrder.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 text-sm sm:text-base"
                        >
                          <span className="text-slate-700">
                            {item.product.title} (x{item.quantity})
                          </span>
                          <span className="text-slate-900 font-medium">
                            ${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {subOrder.trackingNumber && (
                        <p className="text-slate-500 text-xs mt-2">
                          Tracking: {subOrder.trackingNumber}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;