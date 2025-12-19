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
  X
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">

        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 mb-6 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <img
              src={images[selectedImage]}
              alt={product.title}
              className="rounded-xl w-full"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <p className="text-slate-600 mt-3">{product.description}</p>

            <p className="text-4xl font-bold mt-4">${price.toFixed(2)}</p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="bg-cyan-500 text-white px-6 py-3 rounded-lg"
              >
                <ShoppingCart className="inline w-4 h-4 mr-2" />
                Add to Cart
              </button>

              <button
                onClick={handleBuyNow}
                className="bg-green-500 text-white px-6 py-3 rounded-lg"
              >
                Buy Now
              </button>

              <button
                onClick={handleWishlistToggle}
                className="border px-4 py-3 rounded-lg"
              >
                {isInWishlist ? "♥" : "♡"}
              </button>

              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="border px-4 py-3 rounded-lg"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <div className="flex gap-2"><Truck className="w-4 h-4" /> Free Shipping</div>
              <div className="flex gap-2"><Shield className="w-4 h-4" /> 2 Year Warranty</div>
              <div className="flex gap-2"><RefreshCw className="w-4 h-4" /> 30 Day Return</div>
            </div>
          </div>
        </div>
      </div>

      {showBuyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Confirm Order</h2>

            <button
              onClick={handleSubmitBuy}
              disabled={processingBuy}
              className="bg-green-500 text-white w-full py-3 rounded-lg"
            >
              {processingBuy ? "Processing..." : "Place Order"}
            </button>

            <button
              onClick={() => setShowBuyModal(false)}
              className="mt-3 w-full py-2 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
