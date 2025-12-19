"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useCart } from "../context/CartContext";
import { productsAPI } from "@/lib/api";

interface Offer {
  id: string;
  title: string;
  price: string;
  discount?: number;
  description?: string;
  category?: string;
  stock?: number;
  images?: string[] | null;
  slug?: string;
  featured?: boolean;
}

export function OffersPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedTab, setSelectedTab] = useState<"all" | "big" | "other">("all");
  const [displayedOffers, setDisplayedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getAll({ limit: 100 });
        const allProducts = response.products || [];
        
        let filtered: Offer[] = [];
        if (selectedTab === "all") {
          // All products with any discount
          filtered = allProducts.filter((p: Offer) => p.discount && p.discount > 0);
        } else if (selectedTab === "big") {
          // Products with discount >= 25%
          filtered = allProducts.filter((p: Offer) => p.discount && p.discount >= 25);
        } else {
          // Products with discount < 25%
          filtered = allProducts.filter((p: Offer) => p.discount && p.discount > 0 && p.discount < 25);
        }
        
        setDisplayedOffers(filtered);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setDisplayedOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [selectedTab]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 text-cyan-400 mb-3">
              <span className="text-sm">★ Exclusive Deals</span>
            </div>
            <h1 className="text-white text-4xl md:text-6xl mb-6">
              {selectedTab === "all" ? "All Offers" : selectedTab === "big" ? "Big Offers" : "Other Offers"}
            </h1>
            <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed">
              {selectedTab === "all" 
                ? "Discover our complete collection of exclusive deals and special offers. Quality products at unbeatable prices."
                : selectedTab === "big"
                ? "Discover our most exclusive deals and products at competitive prices. Quality and value that you can trust."
                : "Explore additional products with special pricing. Quality products at competitive rates."
              }
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 justify-center py-4">
            <button
              onClick={() => setSelectedTab("all")}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                selectedTab === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Offers ({displayedOffers.length})
            </button>
            <button
              onClick={() => setSelectedTab("big")}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                selectedTab === "big"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Big Offers
            </button>
            <button
              onClick={() => setSelectedTab("other")}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                selectedTab === "other"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Other Offers
            </button>
          </div>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
              <p className="text-slate-600">Loading offers...</p>
            </div>
          ) : displayedOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedOffers.map((product, index) => {
                const images = product.images && Array.isArray(product.images) ? product.images : [];
                const price = parseFloat(product.price);
                const originalPrice = product.discount
                  ? price / (1 - product.discount / 100)
                  : price;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                    className="bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all group border border-slate-200"
                  >
                    {/* Product Image with Discount Badge */}
                    <div
                      onClick={() => router.push(`/product/${product.slug || product.id}`)}
                      className="relative h-56 overflow-hidden cursor-pointer"
                    >
                      <ImageWithFallback
                        src={images[0] || '/images/products/headphones.png'}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {/* Discount Badge */}
                      {product.discount && product.discount > 0 && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm shadow-lg">
                          {product.discount}% OFF
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        {product.category && (
                          <span className="text-cyan-600 text-xs sm:text-sm">{product.category}</span>
                        )}
                        {product.featured && (
                          <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => router.push(`/product/${product.slug || product.id}`)}
                        className="text-slate-900 text-lg mb-2 cursor-pointer hover:text-cyan-600 transition-colors"
                      >
                        {product.title}
                      </h3>

                      {product.description && (
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Price and Stock */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-900 text-xl sm:text-2xl font-semibold">${price.toFixed(2)}</span>
                          {product.discount && product.discount > 0 && (
                            <span className="text-slate-500 line-through text-sm">
                              ${originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {product.stock !== undefined && (
                          <span className="text-slate-500 text-xs">Stock: {product.stock}</span>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            id: product.id,
                            name: product.title,
                            price: price,
                            originalPrice: originalPrice,
                            image: images[0] || '/images/products/headphones.png'
                          });
                        }}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-cyan-500/50"
                      >
                        Add to Cart
                        <span>+</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-600 text-lg">No offers available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OffersPage;

