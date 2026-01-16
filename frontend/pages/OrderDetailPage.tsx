"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ordersAPI } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, Package, MapPin, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  product: {
    id: string;
    title: string;
    images?: string[] | null;
    slug: string;
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
  currency: string;
  shippingAddress: any;
  billingAddress: any;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  subOrders: SubOrder[];
}

export function OrderDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>("");

  // Handle async params (Next.js 16+)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolved = params instanceof Promise ? await params : params;
        setOrderId(resolved.id);
      } catch (err) {
        console.error("Error resolving params:", err);
        setError("Invalid order ID");
        setLoading(false);
      }
    };
    resolveParams();
  }, [params]);

  // REMOVED: No longer trust URL query params for payment success
  // Payment success is determined by backend order.status === "PROCESSED"

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("[OrderDetail] Fetching order:", orderId);
        
        // Add timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error("[OrderDetail] Request timeout after 15 seconds");
            setError("Request timeout. Please try again.");
            setLoading(false);
          }
        }, 15000);

        const response = await ordersAPI.getById(orderId);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!isMounted) return;
        
        console.log("[OrderDetail] Order response received:", response);
        
        if (response && response.order) {
          const orderData = response.order;
          setOrder(orderData);
          
          // If order is PENDING and has a PaymentIntent, auto-check payment status every 3 seconds
          if (orderData.status === 'PENDING' && orderData.stripePaymentIntentId) {
            console.log("[OrderDetail] Order is PENDING with PaymentIntent. Auto-checking payment status...");
            
            // Auto-check payment status every 3 seconds (max 20 times = 60 seconds)
            let checkCount = 0;
            const maxChecks = 20;
            
            pollInterval = setInterval(async () => {
              if (!isMounted || checkCount >= maxChecks) {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                return;
              }
              
              checkCount++;
              console.log(`[OrderDetail] Auto-checking payment status (${checkCount}/${maxChecks})...`);
              
              try {
                // Manually check payment status
                await ordersAPI.updateStatus(orderId);
                
                // Refresh order data
                const updatedResponse = await ordersAPI.getById(orderId);
                if (updatedResponse && updatedResponse.order) {
                  const updatedOrder = updatedResponse.order;
                  setOrder(updatedOrder);
                  
                  // If status changed to PROCESSED, stop polling
                  if (updatedOrder.status === 'PROCESSED') {
                    console.log("[OrderDetail] ✅ Order status updated to PROCESSED!");
                    if (pollInterval) {
                      clearInterval(pollInterval);
                      pollInterval = null;
                    }
                    toast.success("Payment confirmed! Order status updated.");
                  }
                }
              } catch (err: any) {
                console.error("[OrderDetail] Error checking payment status:", err);
                // Don't show error to user, just log it
              }
            }, 3000); // Check every 3 seconds
          }
        } else {
          console.error("[OrderDetail] Invalid response format:", response);
          setError("Invalid order data received");
        }
      } catch (err: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!isMounted) return;
        
        console.error("[OrderDetail] Error fetching order:", err);
        console.error("[OrderDetail] Error details:", {
          message: err.message,
          response: err.response,
          status: err.response?.status,
          data: err.response?.data,
        });
        
        if (err.response?.status === 401) {
          console.log("[OrderDetail] Unauthorized, redirecting to login");
          router.push("/login");
          return;
        } else if (err.response?.status === 404) {
          setError("Order not found");
        } else if (err.response?.status === 403) {
          setError("You don't have permission to view this order");
        } else if (err.response?.status === 500) {
          setError(err.response?.data?.error || "Server error. Please try again later.");
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setError("Request timeout. Please check your connection and try again.");
        } else {
          setError(err.response?.data?.error || err.message || "Failed to load order");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [orderId, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "delivered") return "bg-green-100 text-green-700";
    if (statusLower === "shipped") return "bg-blue-100 text-blue-700";
    if (statusLower === "processed") return "bg-purple-100 text-purple-700";
    if (statusLower === "cancelled") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "delivered") return <CheckCircle2 className="w-5 h-5" />;
    if (statusLower === "cancelled") return <XCircle className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-red-900 text-xl font-semibold mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error || "Order not found"}</p>
            <button
              onClick={() => router.push("/orders")}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/orders")}
            className="text-cyan-600 hover:text-cyan-700 mb-4 flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-slate-900 font-bold text-2xl sm:text-3xl">
                Order {order.orderNumber}
              </h1>
              <p className="text-slate-600 text-sm mt-1">Placed on {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(order.status)}
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Success Message - Only show when backend confirms order is PROCESSED */}
        {order && order.status === "PROCESSED" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-900 font-medium">Payment Successful!</p>
              <p className="text-green-700 text-sm">
                Your order has been confirmed and is being processed.
              </p>
            </div>
          </div>
        )}

        {/* Pending Payment Message - Show when order is PENDING */}
        {order && order.status === "PENDING" && order.stripePaymentIntentId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-spin" />
              <div className="flex-1">
                <p className="text-yellow-900 font-medium">Payment Processing</p>
                <p className="text-yellow-700 text-sm">
                  Your payment is being processed. Please wait for confirmation.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  // Manually check payment status
                  await ordersAPI.updateStatus(order.id);
                  // Refresh order data
                  const response = await ordersAPI.getById(order.id);
                  if (response && response.order) {
                    setOrder(response.order);
                    if (response.order.status === "PROCESSED") {
                      toast.success("Payment confirmed! Order status updated.");
                    } else {
                      toast.info("Payment still processing. Please wait.");
                    }
                  }
                } catch (err: any) {
                  console.error("Error checking payment status:", err);
                  toast.error(err.response?.data?.error || "Failed to check payment status");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Check Payment Status
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-slate-900 font-semibold text-xl mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.subOrders.map((subOrder) => (
                  <div key={subOrder.id} className="space-y-3">
                    {subOrder.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex gap-4 pb-4 border-b border-slate-200 last:border-0"
                      >
                        {item.product.images && Array.isArray(item.product.images) && item.product.images.length > 0 && (
                          <img
                            src={item.product.images[0] as string}
                            alt={item.product.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-slate-900 font-medium mb-1">{item.product.title}</h3>
                          <p className="text-slate-600 text-sm">Quantity: {item.quantity}</p>
                          <p className="text-slate-600 text-sm">
                            Unit Price: ${parseFloat(item.unitPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-900 font-semibold">
                            ${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {subOrder.trackingNumber && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <p className="text-blue-900 text-sm font-medium">Tracking Number:</p>
                        <p className="text-blue-700 text-sm">{subOrder.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-slate-900 font-semibold text-xl mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${parseFloat(order.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping:</span>
                  <span>Included</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between text-slate-900 font-semibold text-lg">
                  <span>Total:</span>
                  <span>
                    {order.currency || "USD"} ${parseFloat(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-slate-900 font-semibold text-xl">Shipping Address</h2>
                </div>
                <div className="text-slate-700 text-sm space-y-1">
                  <p className="font-medium">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
                </div>
              </div>
            )}

            {/* Payment Info */}
            {order.stripePaymentIntentId && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-slate-900 font-semibold text-xl">Payment</h2>
                </div>
                <div className="text-slate-700 text-sm">
                  <p className="mb-2">
                    <span className="font-medium">Status:</span>{" "}
                    {order.status === "PROCESSED" || order.status === "SHIPPED" || order.status === "DELIVERED"
                      ? "Paid"
                      : "Pending"}
                  </p>
                  {order.stripePaymentIntentId && (
                    <p className="text-xs text-slate-500">
                      Payment ID: {order.stripePaymentIntentId.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
