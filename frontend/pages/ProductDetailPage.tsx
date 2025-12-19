"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, ShoppingCart, Share2, Truck, Shield, RefreshCw, ArrowLeft, Loader2, X } from "lucide-react";
import { productsAPI, ordersAPI } from "@/lib/api";
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
}

export function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [processingBuy, setProcessingBuy] = useState(false);
  
  // Shipping/Billing info for Buy button
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

  // Handle case when id is not available during SSR
  if (!id) {
    return null;
  }

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productsAPI.getById(id);
        setProduct(response.product);
      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.response?.data?.error || 'Failed to load product');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <button
            onClick={() => router.push("/products")}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const images = product.images && Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : ['/images/products/headphones.png'];

  const price = parseFloat(product.price);
  const originalPrice = product.discount
    ? price / (1 - product.discount / 100)
    : price;
  const discountPercent = product.discount || 0;
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.title,
        price: price,
        image: images[0] || '/images/products/headphones.png',
        originalPrice: originalPrice
      });
    }
    toast.success(`${quantity} item(s) added to cart!`);
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      router.push('/login');
      return;
    }

    try {
      if (isInWishlist) {
        await wishlistAPI.remove(product.id);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(product.id);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (err: any) {
      console.error('Wishlist error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update wishlist';
      toast.error(errorMessage);
      // If auth error, redirect to login
      if (err.response?.status === 401) {
        setTimeout(() => router.push('/login'), 2000);
      }
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description || product.title,
          url: url,
        });
        toast.success('Shared successfully!');
      } catch (err: any) {
        // User cancelled or error - don't show error if user cancelled
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        console.error('Clipboard error:', err);
        toast.error('Failed to copy link. Please copy manually.');
      }
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowBuyModal(true);
  };

  const handleSubmitBuy = async () => {
    if (!user) {
      toast.error('Please login to place an order');
      router.push('/login');
      return;
    }

    if (!shippingInfo.fullName || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode || !shippingInfo.country) {
      toast.error('Please fill in all shipping information');
      return;
    }

    const finalBillingInfo = billingInfo.fullName ? billingInfo : shippingInfo;

    try {
      setProcessingBuy(true);
      
      // Create order directly (no payment required)
      const orderResponse = await ordersAPI.create({
        items: [{
          productId: product.id,
          quantity: quantity
        }],
        shippingAddress: {
          fullName: shippingInfo.fullName.trim(),
          address: shippingInfo.address.trim(),
          city: shippingInfo.city.trim(),
          zipCode: shippingInfo.zipCode.trim(),
          country: shippingInfo.country.trim(),
          phone: shippingInfo.phone?.trim() || undefined
        },
        billingAddress: {
          fullName: finalBillingInfo.fullName.trim(),
          address: finalBillingInfo.address.trim(),
          city: finalBillingInfo.city.trim(),
          zipCode: finalBillingInfo.zipCode.trim(),
          country: finalBillingInfo.country.trim(),
          phone: finalBillingInfo.phone?.trim() || undefined
        }
      });

      // Order created successfully
      toast.success('Order placed successfully!');
      setShowBuyModal(false);
      
      // Reset form
      setShippingInfo({
        fullName: "",
        address: "",
        city: "",
        zipCode: "",
        country: "",
        phone: ""
      });
      setBillingInfo({
        fullName: "",
        address: "",
        city: "",
        zipCode: "",
        country: "",
        phone: ""
      });
      
      // Redirect to orders page after a short delay
      setTimeout(() => {
        router.push('/orders');
      }, 1500);
      
    } catch (err: any) {
      console.error('Buy now error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
      
      // If auth error, redirect to login
      if (err.response?.status === 401) {
        setTimeout(() => router.push('/login'), 2000);
      }
      
      setProcessingBuy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push("/products")}
            className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main Image */}
            <div className="bg-white rounded-2xl p-8 mb-4 border border-slate-200 overflow-hidden">
              <div className="h-96 rounded-xl overflow-hidden">
                <img
                  src={images[selectedImage] || '/images/products/headphones.png'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`bg-white rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index
                      ? "border-cyan-500"
                      : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="h-20 overflow-hidden">
                      <img
                        src={img || '/images/products/headphones.png'}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-cyan-600 text-sm">{product.category}</span>
            <h1 className="text-slate-900 text-3xl md:text-4xl mb-4 mt-2">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              {product.discount && product.discount > 0 && (
                <span className="text-slate-500 line-through text-xl">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
              <span className="text-slate-900 text-4xl">
                ${price.toFixed(2)}
              </span>
              {product.discount && product.discount > 0 && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                  Save {discountPercent}%
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <span className={`flex items-center gap-2 ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-green-600' : 'bg-red-600'}`}></span>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-600 mb-6 leading-relaxed">
              {product.description || 'No description available.'}
            </p>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="text-slate-700 mb-2 block">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-white border border-slate-200 w-10 h-10 rounded-lg hover:bg-slate-50 transition-all"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border border-slate-200 rounded-lg py-2"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-white border border-slate-200 w-10 h-10 rounded-lg hover:bg-slate-50 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Buy Now
              </button>
              <button
                onClick={handleShare}
                className="bg-white border border-slate-200 p-4 rounded-lg hover:bg-slate-50 transition-all"
              >
                <Share2 className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Features */}
            <div className="bg-slate-100 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-cyan-600" />
                <span className="text-slate-700">Free shipping on orders over $50</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-cyan-600" />
                <span className="text-slate-700">2-year warranty included</span>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-cyan-600" />
                <span className="text-slate-700">30-day return policy</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Product Details Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl p-8 mb-16"
        >
          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200 mb-8">
            {["description", "features", "specifications"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 capitalize transition-colors ${activeTab === tab
                  ? "text-cyan-600 border-b-2 border-cyan-600"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "description" && (
              <div>
                {product.description ? (
                  <p className="text-slate-600 leading-relaxed">{product.description}</p>
                ) : (
                  <p className="text-slate-600 leading-relaxed">No description available.</p>
                )}
              </div>
            )}

            {activeTab === "features" && (
              <div>
                <p className="text-slate-600">Features information coming soon.</p>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Price</span>
                  <span className="text-slate-900">${price.toFixed(2)}</span>
                </div>
                {product.discount && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Discount</span>
                    <span className="text-slate-900">{product.discount}%</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Stock</span>
                  <span className="text-slate-900">{product.stock} units</span>
                </div>
                {product.category && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Category</span>
                    <span className="text-slate-900">{product.category}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Buy Now Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900 text-2xl font-bold">Place Your Order</h2>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Shipping Address */}
              <div>
                <h3 className="text-slate-900 font-semibold mb-4">Shipping Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={shippingInfo.fullName}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Address *"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="City *"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Zip Code *"
                    value={shippingInfo.zipCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Country *"
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2"
                  />
                </div>
              </div>

              {/* Billing Address - Optional */}
              <div>
                <h3 className="text-slate-900 font-semibold mb-4">Billing Address (Optional)</h3>
                <p className="text-slate-500 text-sm mb-4">Leave blank to use shipping address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={billingInfo.fullName}
                    onChange={(e) => setBillingInfo({ ...billingInfo, fullName: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={billingInfo.phone}
                    onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={billingInfo.address}
                    onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={billingInfo.city}
                    onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    value={billingInfo.zipCode}
                    onChange={(e) => setBillingInfo({ ...billingInfo, zipCode: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={billingInfo.country}
                    onChange={(e) => setBillingInfo({ ...billingInfo, country: e.target.value })}
                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2"
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Quantity:</span>
                  <span className="text-slate-900 font-medium">{quantity}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Price:</span>
                  <span className="text-slate-900 font-medium">${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-900 font-semibold">Total:</span>
                  <span className="text-slate-900 font-bold text-xl">${(price * quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSubmitBuy}
                disabled={processingBuy}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {processingBuy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order...
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
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
