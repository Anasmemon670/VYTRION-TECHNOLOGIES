"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useRouter } from "next/navigation";
import { productsAPI } from "@/lib/api";

export function OtherOffers() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getAll({ limit: 5 });
        // Filter products with discount > 20%
        const discountedProducts = (response.products || []).filter((p: any) => p.discount && p.discount > 20);
        setOffers(discountedProducts);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
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

    const element = document.getElementById("other-offers");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, offers.length));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.max(1, offers.length)) % Math.max(1, offers.length));
  };

  if (offers.length === 0 && !loading) {
    return null; // Don't show section if no offers
  }

  return (
    <section id="other-offers" className="py-12 sm:py-16 md:py-24 bg-white">
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
              <span className="text-xs sm:text-sm">★ Special Deals</span>
            </div>
            <h2 className="text-slate-900 text-2xl sm:text-3xl md:text-4xl mb-2">
              Other Offers
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Explore additional products with special pricing. Quality products at competitive rates.
            </p>
          </div>
          <button
            onClick={() => router.push('/offers')}
            className="text-cyan-600 hover:text-cyan-700 flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            View All Offers
            <span>→</span>
          </button>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-slate-50 transition-all hidden md:block"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-slate-50 transition-all hidden md:block"
          >
            <ChevronRight className="w-6 h-6 text-slate-700" />
          </button>

          {/* Carousel Items */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: `-${currentSlide * (100 / 3)}%` }}
              transition={{ duration: 0.5 }}
            >
              {loading ? (
                <div className="text-center py-12 w-full">
                  <p className="text-slate-600">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="text-center py-12 w-full">
                  <p className="text-slate-600">No special offers available.</p>
                </div>
              ) : (
                offers.map((offer, index) => {
                  const images = offer.images && Array.isArray(offer.images) ? offer.images : [];
                  return (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3"
                    >
                      <div className="bg-slate-50 rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group border border-slate-200 hover:border-cyan-500">
                        {/* Image */}
                        <div className="h-40 sm:h-48 overflow-hidden">
                          <ImageWithFallback
                            src={images[0] || '/images/products/headphones.png'}
                            alt={offer.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6">
                          <div className="flex items-center justify-between mb-2">
                            {offer.discount && offer.discount > 0 && (
                              <span className="bg-cyan-500 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full inline-block">
                                {offer.discount}% OFF
                              </span>
                            )}
                            {offer.category && (
                              <span className="text-cyan-600 text-xs">{offer.category}</span>
                            )}
                          </div>
                          <h3 className="text-slate-900 text-lg sm:text-xl mb-2">{offer.title}</h3>
                          {offer.description && (
                            <p className="text-slate-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                              {offer.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-900 text-lg sm:text-xl">${parseFloat(offer.price).toFixed(2)}</span>
                            {offer.stock !== undefined && (
                              <span className="text-slate-500 text-xs">Stock: {offer.stock}</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/product/${offer.slug || offer.id}`);
                            }}
                            className="w-full text-cyan-600 hover:text-cyan-700 transition-colors text-xs sm:text-sm text-center mt-2"
                          >
                            Learn More →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden justify-center gap-4 mt-6">
            <button
              onClick={prevSlide}
              className="bg-white shadow-lg rounded-full p-2 hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={nextSlide}
              className="bg-white shadow-lg rounded-full p-2 hover:bg-slate-50 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {offers.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${currentSlide === index ? "bg-cyan-600 w-8" : "bg-slate-300"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}