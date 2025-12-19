"use client";

import { motion } from "motion/react";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ordersAPI, checkoutAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, getSubtotal } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    phone: ''
  });

  const [billingInfo, setBillingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    phone: ''
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingCost = 10.00;
  const subtotal = getSubtotal();
  const total = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Validate shipping info
    if (!shippingInfo.fullName || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode || !shippingInfo.country) {
      setError('Please fill in all shipping information');
      return;
    }

    // Use shipping info for billing if billing not filled
    const finalBillingInfo = billingInfo.fullName ? billingInfo : shippingInfo;

    try {
      setProcessing(true);
      setError(null);

      // Create order
      const orderResponse = await ordersAPI.create({
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          fullName: shippingInfo.fullName,
          address: shippingInfo.address,
          city: shippingInfo.city,
          zipCode: shippingInfo.zipCode,
          country: shippingInfo.country,
          phone: shippingInfo.phone || undefined
        },
        billingAddress: {
          fullName: finalBillingInfo.fullName,
          address: finalBillingInfo.address,
          city: finalBillingInfo.city,
          zipCode: finalBillingInfo.zipCode,
          country: finalBillingInfo.country,
          phone: finalBillingInfo.phone || undefined
        }
      });

      const orderId = orderResponse.order.id;

      // Create Stripe checkout session
      const checkoutResponse = await checkoutAPI.createSession(orderId);

      // Redirect to Stripe checkout
      if (checkoutResponse.url) {
        window.location.href = checkoutResponse.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.error || 'Failed to process checkout. Please try again.');
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 sm:py-20 px-4">
        <div className="text-center">
          <h2 className="text-slate-900 text-2xl sm:text-3xl mb-3 sm:mb-4">Your Cart is Empty</h2>
          <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">Add some products to get started!</p>
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg transition-all text-sm sm:text-base"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Side - Cart Items */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h1 className="text-slate-900 text-2xl sm:text-3xl">Shopping Cart</h1>
              <button
                onClick={clearCart}
                className="bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg transition-all flex items-center gap-2 text-sm sm:text-base"
              >
                Clear Cart
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {cartItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-xl p-3 sm:p-4 shadow-md"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 sm:w-24 h-20 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-900 text-base sm:text-lg mb-1 truncate">{item.name}</h3>
                      <p className="text-cyan-600 mb-2 sm:mb-3 text-sm sm:text-base">${item.price.toFixed(2)}</p>

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 sm:gap-3 bg-slate-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <span className="text-slate-900 min-w-[20px] text-center text-sm sm:text-base">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-600 transition-colors text-sm sm:text-base"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-slate-900 text-base sm:text-lg font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side - Shipping & Summary */}
          <div>
            {/* Shipping Information */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md mb-4 sm:mb-6">
              <h2 className="text-slate-900 text-xl sm:text-2xl mb-4 sm:mb-6">Shipping Information</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={shippingInfo.fullName}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Address *"
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="City *"
                  value={shippingInfo.city}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="ZIP Code *"
                  value={shippingInfo.zipCode}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Country *"
                  value={shippingInfo.country}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={shippingInfo.phone}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Billing Information (Optional - use shipping if not filled) */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md mb-4 sm:mb-6">
              <h2 className="text-slate-900 text-xl sm:text-2xl mb-4 sm:mb-6">Billing Information (Optional)</h2>
              <p className="text-slate-600 text-sm mb-4">Leave empty to use shipping address</p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={billingInfo.fullName}
                  onChange={(e) => setBillingInfo({ ...billingInfo, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={billingInfo.address}
                  onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={billingInfo.city}
                  onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="ZIP Code"
                  value={billingInfo.zipCode}
                  onChange={(e) => setBillingInfo({ ...billingInfo, zipCode: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={billingInfo.country}
                  onChange={(e) => setBillingInfo({ ...billingInfo, country: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
              <h2 className="text-slate-900 text-xl sm:text-2xl mb-4 sm:mb-6">Order Summary</h2>

              <div className="space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-slate-600 text-sm sm:text-base">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm sm:text-base">
                  <span>Shipping:</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between text-slate-900 text-lg sm:text-xl">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={processing || cartItems.length === 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 sm:py-4 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
