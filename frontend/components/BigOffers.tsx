"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCart } from "../context/CartContext";
import { productsAPI } from "@/lib/api";

interface Product {
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

export function BigOffers() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getAll({ featured: true, limit: 8 });
        setProducts(response.products || []);
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("big-offers");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <section id="big-offers" className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="flex items-center justify-center gap-2 text-cyan-400 mb-3">
            <span className="text-xs sm:text-sm">★ Exclusive Deals</span>
          </div>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4">
            Big Offers
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Discover our most exclusive deals and products at competitive prices. Quality and value that you can trust.
          </p>
        </motion.div>

        {/* Offer Cards Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading offers...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No featured products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {products.map((product, index) => {
              const images = product.images && Array.isArray(product.images) ? product.images : [];
              const price = parseFloat(product.price);
              const originalPrice = product.discount
                ? price / (1 - product.discount / 100)
                : price;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl transition-all group"
                >
                  {/* Product Image with Discount Badge */}
                  <div
                    onClick={() => router.push(`/product/${product.slug || product.id}`)}
                    className="relative h-48 sm:h-56 overflow-hidden cursor-pointer"
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
                        <span className="text-cyan-400 text-xs">{product.category}</span>
                      )}
                      {product.featured && (
                        <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <h3
                      onClick={() => router.push(`/product/${product.slug || product.id}`)}
                      className="text-white text-lg mb-2 cursor-pointer hover:text-cyan-400 transition-colors"
                    >
                      {product.title}
                    </h3>

                    {product.description && (
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-white text-xl sm:text-2xl">${price.toFixed(2)}</span>
                        {product.discount && product.discount > 0 && (
                          <span className="text-slate-500 line-through text-sm">
                            ${originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {product.stock !== undefined && (
                        <span className="text-slate-400 text-xs">Stock: {product.stock}</span>
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
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center"
        >
          <button
            onClick={() => router.push('/offers')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg transition-all transform hover:scale-105 inline-flex items-center gap-2 shadow-lg"
          >
            View All Offers
            <span>→</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}