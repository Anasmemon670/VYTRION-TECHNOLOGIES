"use client";

import { motion } from "motion/react";
import { Lightbulb, Shield, Users, TrendingUp, Award, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import robotImage from "@/assets/de31c5425aba837651df9a57828d3340c31bec49.png";

const values = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We embrace cutting-edge ideas to deliver innovative solutions.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Shield,
    title: "Quality",
    description: "We maintain the highest standards in everything we do.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "We work closely with our clients to achieve common goals.",
    color: "from-purple-500 to-pink-500"
  }
];

const stats = [
  { number: "500+", label: "Products Sold" },
  { number: "50+", label: "Satisfied Customers" },
  { number: "25+", label: "Projects Completed" },
  { number: "5", label: "Years of Experience" },
];

export default function AboutUsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section with Robot Image */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="relative max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={robotImage.src}
                alt="VYTRION Robot"
                className="w-full h-[400px] md:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-center px-4">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-white text-4xl md:text-6xl mb-4"
                >
                  Welcome to <span className="text-cyan-400">VYTRION</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-slate-200 text-lg md:text-xl mb-8"
                >
                  Professional E-Commerce Solutions
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <button
                    onClick={() => router.push('/products')}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg transition-all transform hover:scale-105"
                  >
                    Explore Products
                  </button>
                  <button
                    onClick={() => router.push('/services')}
                    className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-900 text-white px-8 py-3 rounded-lg transition-all"
                  >
                    Our Services
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Our Mission Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-slate-900 text-3xl md:text-5xl mb-6">
              Our Mission
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              At VYTRION, we are committed to providing innovative and high-quality solutions for your business needs.
              We strive to deliver excellence in every project, ensuring customer satisfaction and long-term partnerships.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-slate-900 text-3xl md:text-5xl mb-4">
              Our Values
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all group"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${value.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-slate-900 text-2xl mb-4">
                  {value.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-cyan-400 text-4xl md:text-5xl mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Team Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-slate-900 text-3xl md:text-5xl mb-4">
              Our Team
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-4xl">VY</span>
              </div>
              <h3 className="text-slate-900 text-2xl mb-2">
                VYTRION Team
              </h3>
              <p className="text-cyan-600 mb-4">
                Dedicated Professionals
              </p>
              <p className="text-slate-600 leading-relaxed">
                Our team consists of highly experienced professionals committed to delivering exceptional results on every project.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-white text-3xl md:text-4xl mb-6">
              Ready to Work with Us?
            </h2>
            <p className="text-white text-lg mb-8 opacity-90">
              Contact us today to discuss your project needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/contact')}
                className="bg-white hover:bg-slate-100 text-blue-600 px-8 py-4 rounded-lg transition-all transform hover:scale-105"
              >
                Contact Now
              </button>
              <button
                onClick={() => router.push('/products')}
                className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-600 text-white px-8 py-4 rounded-lg transition-all"
              >
                View Products
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
