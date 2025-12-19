"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Zap, Shield, Award, Clock } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized performance for seamless experience",
    color: "from-cyan-500 to-blue-500"
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Enterprise-grade security and encryption",
    color: "from-purple-500 to-indigo-500"
  },
  {
    icon: Award,
    title: "Quality Products",
    description: "Premium products you can trust",
    color: "from-cyan-500 to-teal-500"
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Round-the-clock customer assistance",
    color: "from-pink-500 to-rose-500"
  }
];

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:py-16 md:py-24 lg:py-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Side - Content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-2 text-cyan-400 mb-4 sm:mb-6"
            >
              <span className="text-xs sm:text-sm">★</span>
              <span className="text-xs sm:text-sm">Making the future more present</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 leading-tight"
            >
              Technology <span className="text-cyan-400">Solutions</span> & Services
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-slate-300 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-xl"
            >
              Discover products and services for your daily needs. Quality solutions at competitive prices.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <button
                onClick={() => router.push('/products')}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 sm:px-8 py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/50 text-sm sm:text-base"
              >
                Explore Products
                <span>→</span>
              </button>
              <button
                onClick={() => router.push('/projects')}
                className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-900 text-white px-6 sm:px-8 py-3 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base"
              >
                View Projects
              </button>
            </motion.div>
          </div>

          {/* Right Side - Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-all group hover:border-cyan-500 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}