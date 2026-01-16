"use client";

import { motion } from "motion/react";
import { Minus, Plus, Trash2, Loader2, XCircle } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ordersAPI, paymentIntentAPI, productsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { StripeProvider } from "@/components/StripeProvider";
import { StripePaymentForm } from "@/components/StripePaymentForm";

export function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, getSubtotal } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [success, setSuccess] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Check for canceled payment redirect
  useEffect(() => {
    const canceled = searchParams?.get("canceled");
    if (canceled === "true") {
      toast.error("Payment was canceled. You can try again when ready.");
    }
  }, [searchParams]);

  const shippingCost = 10.00;
  const subtotal = getSubtotal();
  const total = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if cart is empty
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    // Validate shipping info - check for empty strings too
    if (!shippingInfo.fullName?.trim() || !shippingInfo.address?.trim() || !shippingInfo.city?.trim() || !shippingInfo.zipCode?.trim() || !shippingInfo.country?.trim()) {
      setError('Please fill in all shipping information');
      return;
    }

    // Use shipping info for billing if billing not filled
    const finalBillingInfo = billingInfo.fullName?.trim() ? billingInfo : shippingInfo;

    // Validate billing info
    if (!finalBillingInfo.fullName?.trim() || !finalBillingInfo.address?.trim() || !finalBillingInfo.city?.trim() || !finalBillingInfo.zipCode?.trim() || !finalBillingInfo.country?.trim()) {
      setError('Please fill in all billing information');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Show loading toast
      toast.loading('Processing your order...', { id: 'checkout' });

      // Check stock availability before creating order (parallel fetch for better performance)
      const stockIssues: string[] = [];
      
      // Fetch all products in parallel
      const productPromises = cartItems.map(async (cartItem) => {
        try {
          const productResponse = await productsAPI.getById(cartItem.id);
          const product = productResponse.product || productResponse;
          return { cartItem, product };
        } catch (err) {
          console.error(`Error checking stock for ${cartItem.name}:`, err);
          return { cartItem, product: null };
        }
      });

      const productResults = await Promise.all(productPromises);

      // Check stock for each product
      for (const { cartItem, product } of productResults) {
        if (!product) {
          stockIssues.push(`${cartItem.name}: Product not found`);
          continue;
        }
        
        const availableStock = Number(product.stock) || 0;
        const requestedQuantity = cartItem.quantity;
        
        if (availableStock < requestedQuantity) {
          stockIssues.push(`${cartItem.name}: Only ${availableStock} available, but ${requestedQuantity} requested`);
        }
      }

      if (stockIssues.length > 0) {
        toast.dismiss('checkout');
        setError(`Insufficient stock: ${stockIssues.join('. ')}. Please update your cart quantities.`);
        setProcessing(false);
        return;
      }

      // Create order - ensure no empty strings are sent, trim all fields
      toast.loading('Creating your order...', { id: 'checkout' });
      
      const orderResponse = await ordersAPI.create({
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          fullName: shippingInfo.fullName.trim(),
          address: shippingInfo.address.trim(),
          city: shippingInfo.city.trim(),
          zipCode: shippingInfo.zipCode.trim(),
          country: shippingInfo.country.trim(),
          ...(shippingInfo.phone?.trim() && { phone: shippingInfo.phone.trim() })
        },
        billingAddress: {
          fullName: finalBillingInfo.fullName.trim(),
          address: finalBillingInfo.address.trim(),
          city: finalBillingInfo.city.trim(),
          zipCode: finalBillingInfo.zipCode.trim(),
          country: finalBillingInfo.country.trim(),
          ...(finalBillingInfo.phone?.trim() && { phone: finalBillingInfo.phone.trim() })
        }
      });

      const orderId = orderResponse.order.id;
      const orderNumber = orderResponse.order.orderNumber || orderId;

      // Show success message
      toast.success(`Order #${orderNumber} created successfully!`, { id: 'checkout' });
      setSuccess(true);

      // Create Stripe Payment Intent
      toast.loading('Setting up secure payment...', { id: 'checkout' });
      
      try {
        console.log('Creating Stripe payment intent for order:', orderId);
        const paymentIntentResponse = await paymentIntentAPI.create(orderId);
        console.log('Payment intent response received:', paymentIntentResponse);
        
        // Check if Stripe is not configured
        if (paymentIntentResponse.error && paymentIntentResponse.code === 'STRIPE_NOT_CONFIGURED') {
          console.error('Stripe not configured error:', paymentIntentResponse);
          toast.dismiss('checkout');
          toast.error('Payment gateway not configured. Please contact support.');
          setError('Payment gateway is not configured. Please set STRIPE_SECRET_KEY in backend environment variables.');
          setProcessing(false);
          setSuccess(false);
          return;
        }

        // Check if response has error
        if (paymentIntentResponse.error) {
          console.error('Payment intent error in response:', paymentIntentResponse);
          throw new Error(paymentIntentResponse.error || 'Failed to create payment intent');
        }

        // Show payment form
        if (paymentIntentResponse.clientSecret) {
          console.log('Payment intent created, showing payment form');
          toast.dismiss('checkout');
          setClientSecret(paymentIntentResponse.clientSecret);
          setCurrentOrderId(orderId);
          setShowPaymentForm(true);
          setProcessing(false);
          // Scroll to payment form
          setTimeout(() => {
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) {
              paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        } else {
          console.error('No client secret in response:', paymentIntentResponse);
          throw new Error('No client secret received from payment gateway');
        }
      } catch (paymentErr: any) {
        console.error('Stripe payment intent error:', paymentErr);
        console.error('Error response:', paymentErr.response?.data);
        console.error('Error status:', paymentErr.response?.status);
        
        // Handle Stripe not configured error
        if (paymentErr.response?.data?.code === 'STRIPE_NOT_CONFIGURED' || 
            paymentErr.response?.data?.error?.includes('not configured') ||
            paymentErr.response?.data?.error?.includes('Payment service not configured')) {
          toast.dismiss('checkout');
          toast.error('Payment gateway not configured');
          setError('Payment gateway is not configured. Please set STRIPE_SECRET_KEY in backend environment variables.');
        } else if (paymentErr.response?.data?.error) {
          // Show specific error from backend
          toast.dismiss('checkout');
          toast.error(paymentErr.response.data.error);
          setError(paymentErr.response.data.error + (paymentErr.response.data.details ? ': ' + paymentErr.response.data.details : ''));
        } else {
          throw paymentErr; // Re-throw to be caught by outer catch
        }
        setProcessing(false);
        setSuccess(false);
        return;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data
      });
      
      toast.dismiss('checkout');
      
      // Handle specific error cases
      let errorMessage = 'Failed to process checkout. Please try again.';
      
      if (err.response?.data?.code === 'STRIPE_NOT_CONFIGURED') {
        errorMessage = 'Payment gateway is not configured. Please set STRIPE_SECRET_KEY in backend environment variables.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        if (err.response.data.details) {
          errorMessage += `: ${err.response.data.details}`;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
      setError(errorMessage);
      setProcessing(false);
      setSuccess(false);
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
                  onChange={(e) => {
                    setShippingInfo({ ...shippingInfo, fullName: e.target.value });
                    if (error) setError(null);
                  }}
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

              {!showPaymentForm && (
                <button
                  onClick={handleCheckout}
                  disabled={processing || cartItems.length === 0 || success}
                  className={`w-full ${
                    success 
                      ? 'bg-green-600 cursor-default' 
                      : 'bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed'
                  } text-white py-3 sm:py-4 rounded-lg transition-all transform ${
                    !processing && !success ? 'hover:scale-105' : ''
                  } text-sm sm:text-base flex items-center justify-center gap-2 font-semibold`}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : success ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Order Created!
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>
              )}
            </div>

            {/* Payment Form Section */}
            {showPaymentForm && clientSecret && currentOrderId && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
              <div id="payment-section" className="bg-white rounded-xl p-4 sm:p-6 shadow-md mt-4 sm:mt-6">
                <h2 className="text-slate-900 text-xl sm:text-2xl mb-4 sm:mb-6">Payment Information</h2>
                <StripeProvider clientSecret={clientSecret}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    orderId={currentOrderId}
                    amount={total}
                    onSuccess={() => {
                      toast.success("Payment successful! Redirecting...");
                      clearCart();
                      setTimeout(() => {
                        router.push(`/orders/${currentOrderId}`);
                      }, 1500);
                    }}
                    onError={(error) => {
                      setError(error);
                    }}
                    onRetry={async () => {
                      // Create new PaymentIntent on retry
                      if (!currentOrderId) return;
                      try {
                        console.log("[CartPage] Creating new PaymentIntent for retry...");
                        const paymentIntentResponse = await paymentIntentAPI.create(currentOrderId);
                        if (paymentIntentResponse.clientSecret) {
                          setClientSecret(paymentIntentResponse.clientSecret);
                          setError(null);
                          toast.success("New payment session created. Please try again.");
                        }
                      } catch (retryError: any) {
                        console.error("[CartPage] Error creating new PaymentIntent:", retryError);
                        setError("Failed to create new payment session. Please refresh the page.");
                      }
                    }}
                  />
                </StripeProvider>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setClientSecret(null);
                    setCurrentOrderId(null);
                    setSuccess(false);
                    setError(null);
                  }}
                  className="mt-4 w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all"
                >
                  Cancel Payment
                </button>
              </div>
            ) : showPaymentForm && (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ? (
              <div id="payment-section" className="bg-white rounded-xl p-4 sm:p-6 shadow-md mt-4 sm:mt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm font-medium mb-2">
                    Stripe Configuration Missing
                  </p>
                  <p className="text-red-600 text-xs mb-3">
                    Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your frontend/.env.local file.
                  </p>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setClientSecret(null);
                      setCurrentOrderId(null);
                      setSuccess(false);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
