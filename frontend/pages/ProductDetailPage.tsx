"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Share2,
  Truck,
  Shield,
  RefreshCw,
  ArrowLeft,
  Loader2,
  X,
  Heart,
  Plus,
  Minus
} from "lucide-react";
import { productsAPI, ordersAPI, wishlistAPI } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description?: string;
  price: string;
  discount?: number;
  category?: string;
  stock: number;
  images?: string[] | null;
  isInWishlist?: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [processingBuy, setProcessingBuy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const [isInWishlist, setIsInWishlist] = useState(false);

  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
    phone: ""
  });

  const [billingInfo, setBillingInfo] = useState({
    fullName: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
    phone: ""
  });

  // 🔹 Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await productsAPI.getById(productId);
        setProduct(res.product);
        setIsInWishlist(!!res.product?.isInWishlist);
      } catch (err: any) {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "Product not found"}</p>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : ["/images/products/headphones.png"];

  const price = parseFloat(product.price);
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.title,
        price,
        image: images[0]
      });
    }
    toast.success("Added to cart");
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error("Login required");
      router.push("/login");
      return;
    }

    try {
      if (isInWishlist) {
        await wishlistAPI.remove(product.id);
        setIsInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await wishlistAPI.add(product.id);
        setIsInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Wishlist action failed");
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowBuyModal(true);
  };

  const handleSubmitBuy = async () => {
    try {
      setProcessingBuy(true);
      await ordersAPI.create({
        items: [{ productId: product.id, quantity }],
        shippingAddress: shippingInfo,
        billingAddress: billingInfo.fullName ? billingInfo : shippingInfo
      });
      toast.success("Order placed successfully");
      setShowBuyModal(false);
      router.push("/orders");
    } catch {
      toast.error("Order failed");
    } finally {
      setProcessingBuy(false);
    }
  };

  const originalPrice = product.discount 
    ? price / (1 - product.discount / 100) 
    : price;
  const discountPercent = product.discount || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Navigation */}
      <div className="bg-slate-100 border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => router.push("/products")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Left Section - Product Images */}
            <div>
              {/* Main Product Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <div className="bg-slate-100 rounded-xl p-4 sm:p-8 flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
                  <img
                    src={images[selectedImage]}
                    alt={product.title}
                    className="rounded-lg w-full h-auto object-contain max-h-[500px]"
                  />
                </div>
              </motion.div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index
                          ? "border-cyan-500 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.title} view ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Section - Product Information */}
            <div className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex-1"
              >
                {/* Category */}
                {product.category && (
                  <p className="text-cyan-600 text-sm font-medium mb-2 uppercase tracking-wide">
                    {product.category}
                  </p>
                )}

                {/* Product Name */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                  {product.title}
                </h1>

                {/* Pricing */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-baseline gap-2">
                    {discountPercent > 0 && (
                      <span className="text-lg sm:text-xl text-slate-400 line-through">
                        ${originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-3xl sm:text-4xl font-bold text-slate-900">
                      ${price.toFixed(2)}
                    </span>
                  </div>
                  {discountPercent > 0 && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-6">
                  {inStock ? (
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                      In Stock
                    </p>
                  ) : (
                    <p className="text-red-600 font-medium">Out of Stock</p>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mb-6">
                    <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-0 border border-slate-300 rounded-lg w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="px-4 py-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.max(1, Math.min(val, product.stock)));
                      }}
                      className="w-16 text-center border-x border-slate-300 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="px-4 py-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mb-8">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-all font-medium flex-1"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-all font-medium"
                  >
                    Buy Now
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied to clipboard");
                    }}
                    className="w-12 h-12 flex items-center justify-center border border-slate-300 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-all"
                    title="Share product"
                  >
                    <Share2 className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Product Benefits */}
                <div className="space-y-3 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-50 rounded-lg">
                      <Truck className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium">Free shipping on orders over $50</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-50 rounded-lg">
                      <Shield className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium">2-year warranty included</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-50 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium">30-day return policy</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {showBuyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Confirm Order</h2>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex gap-4">
                  <img
                    src={images[0]}
                    alt={product.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{product.title}</h3>
                    <p className="text-slate-600 text-sm mb-2">Quantity: {quantity}</p>
                    <p className="text-lg font-bold text-slate-900">
                      ${(price * quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Shipping Information</h3>
                <div className="space-y-3">
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
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
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

              {/* Billing Information (Optional) */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Billing Information (Optional)</h3>
                <p className="text-slate-600 text-sm mb-4">Leave empty to use shipping address</p>
                <div className="space-y-3">
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
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
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
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${(price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping:</span>
                    <span>$10.00</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total:</span>
                    <span>${(price * quantity + 10).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {buyError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{buyError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSubmitBuy}
                  disabled={processingBuy || !shippingInfo.fullName || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode || !shippingInfo.country}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                >
                  {processingBuy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
                <button
                  onClick={() => setShowBuyModal(false)}
                  disabled={processingBuy}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
