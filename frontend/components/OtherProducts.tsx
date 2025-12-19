"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { productsAPI } from "@/lib/api";

interface Product {
  id: string;
  title: string;
  price: string;
  description?: string;
  category?: string;
  stock?: number;
  images?: string[] | null;
  slug?: string;
  featured?: boolean;
}

export function OtherProducts() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getAll({ limit: 12 });
        setProducts(response.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
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

    const element = document.getElementById("other-products");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  const itemsPerSlide = 3; // Show 3 products per slide on desktop
  const maxSlide = Math.max(0, Math.ceil(products.length / itemsPerSlide) - 1);
  
  // Check if we can go left or right
  const canGoLeft = currentSlide > 0;
  const canGoRight = currentSlide < maxSlide && products.length > itemsPerSlide;

  const nextSlide = () => {
    if (canGoRight) {
      setCurrentSlide((prev) => Math.min(prev + 1, maxSlide));
    }
  };

  const prevSlide = () => {
    if (canGoLeft) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  if (products.length === 0 && !loading) {
    return null; // Don't show section if no products
  }

  return (
    <section id="other-products" className="py-12 sm:py-16 md:py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-12 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <span className="text-xs sm:text-sm">★ Premium Collection</span>
            </div>
            <h2 className="text-slate-900 text-2xl sm:text-3xl md:text-4xl mb-2">
              Other Products
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-xl">
              Discover our complete range of products designed for your daily needs.
            </p>
          </div>
          <button
            onClick={() => router.push("/products")}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base"
          >
            Explore All
          </button>
        </motion.div>

        {/* Products Carousel */}
        <div className="relative">
          {/* Navigation Buttons */}
          {canGoLeft && (
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-slate-50 transition-all hidden lg:block"
            >
              <ChevronLeft className="w-6 h-6 text-slate-700" />
            </button>
          )}
          {canGoRight && (
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-slate-50 transition-all hidden lg:block"
            >
              <ChevronRight className="w-6 h-6 text-slate-700" />
            </button>
          )}

          {/* Carousel */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ 
                x: currentSlide === 0 ? '0%' : `-${currentSlide * (100 / itemsPerSlide)}%`
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {loading ? (
                <div className="text-center py-12 w-full">
                  <p className="text-slate-600">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 w-full">
                  <p className="text-slate-600">No products available.</p>
                </div>
              ) : (
                products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3"
                  >
                    <div
                      onClick={() => router.push(`/product/${product.slug || product.id}`)}
                      className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group border border-slate-200 hover:border-cyan-500 h-full"
                    >
                      {/* Image */}
                      <div className="h-48 sm:h-56 overflow-hidden">
                        <ImageWithFallback
                          src={product.images?.[0] || ''}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      {/* Content */}
                      <div className="p-6">
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
                        <h3 className="text-slate-900 text-xl mb-2 group-hover:text-cyan-600 transition-colors">
                          {product.title}
                        </h3>

                        {product.description && (
                          <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-slate-900 text-xl sm:text-2xl">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                            {product.stock !== undefined && (
                              <p className="text-slate-500 text-xs mt-1">Stock: {product.stock}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart({
                                id: product.id,
                                name: product.title,
                                price: parseFloat(product.price),
                                image: product.images?.[0] || ''
                              });
                              toast.success(`${product.title} added to cart!`, {
                                duration: 2000,
                              });
                            }}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden justify-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              disabled={!canGoLeft}
              className={`bg-white shadow-lg rounded-full p-2 transition-all ${
                canGoLeft 
                  ? 'hover:bg-slate-50 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={nextSlide}
              disabled={!canGoRight}
              className={`bg-white shadow-lg rounded-full p-2 transition-all ${
                canGoRight 
                  ? 'hover:bg-slate-50 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}