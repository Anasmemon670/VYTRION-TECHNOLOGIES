"use client";

import { motion } from "motion/react";
import { Shield, Lock, Eye, FileText, Users, Globe, Clock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

const sections = [
  {
    id: 1,
    icon: FileText,
    title: "Information We Collect",
    content: "At VYTRION, we collect information from the following sources:",
    points: [
      "Information provided by you: Name, email, address, payment information",
      "Automatic information: IP address, browser type, pages visited",
      "Cookies and similar technologies: To improve your browsing experience",
      "Third-party sources: Data from business partners"
    ]
  },
  {
    id: 2,
    icon: Eye,
    title: "How We Use Your Information",
    content: "We use your information to:",
    points: [
      "Process orders and payments securely",
      "Provide customer service and technical support",
      "Send order confirmations and updates",
      "Improve our website and services",
      "Comply with legal obligations",
      "Send marketing communications (with your consent)"
    ]
  },
  {
    id: 3,
    icon: Users,
    title: "Information Sharing",
    content: "We do not sell your personal information to third parties. We share information only in the following cases:",
    points: [
      "Service providers: Shops for payments, ordering services",
      "Legal compliance: When required by law",
      "Protection: To prevent fraud or illegal activities",
      "With your consent: For other specific purposes"
    ]
  },
  {
    id: 4,
    icon: Lock,
    title: "Data Security",
    content: "We implement technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. We use SSL encryption for all transactions.",
    points: []
  },
  {
    id: 5,
    icon: Globe,
    title: "Cookies and Tracking Technologies",
    content: "We use cookies to improve your experience on our website. You can control cookies through your browser settings. Some cookies are necessary for the basic functioning of the site.",
    points: []
  },
  {
    id: 6,
    icon: Shield,
    title: "Your Rights",
    content: "You have the right to:",
    points: [
      "Access your personal information",
      "Rectify inaccurate data",
      "Request deletion of your data",
      "Object to the processing of your data",
      "Data portability",
      "Withdraw your consent at any time"
    ]
  },
  {
    id: 7,
    icon: Clock,
    title: "Data Retention",
    content: "We retain your personal information for as long as necessary to fulfill the purposes for which it was collected, or as required by law or for legitimate business purposes.",
    points: []
  },
  {
    id: 8,
    icon: Globe,
    title: "International Transfers",
    content: "Your information may be transferred and processed in countries other than your own. We implement appropriate measures to ensure that your data is protected according to equivalent standards.",
    points: []
  },
  {
    id: 9,
    icon: FileText,
    title: "Changes to this Policy",
    content: "We may update this privacy policy periodically. We will notify you about significant changes by posting the new policy on our website.",
    points: []
  },
  {
    id: 10,
    icon: Mail,
    title: "Contact",
    content: "If you have questions about this privacy policy or wish to exercise your rights, contact us through:",
    points: [
      "Email: devsolutions@gmail.com",
      "Contact form on our website"
    ]
  }
];

export function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 text-cyan-400 mb-4">
              <Shield className="w-5 h-5" />
              <span className="text-sm">★ Your Privacy Matters</span>
            </div>
            <h1 className="text-white text-4xl md:text-6xl mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-300 text-lg">
              Last updated: 1/01/2025
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl p-8 shadow-lg mb-8 border border-slate-200"
            >
              <p className="text-slate-600 text-lg leading-relaxed">
                At VYTRION, we value your privacy and are committed to protecting your personal information.
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.
              </p>
            </motion.div>

            {/* Policy Sections */}
            <div className="space-y-6">
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-slate-900 text-2xl mb-4">
                        {section.id}. {section.title}
                      </h2>
                      <p className="text-slate-600 leading-relaxed mb-4">
                        {section.content}
                      </p>
                      {section.points.length > 0 && (
                        <ul className="space-y-3">
                          {section.points.map((point, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-700">
                              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 mt-8 border border-cyan-200"
            >
              <p className="text-slate-600 text-center leading-relaxed">
                This privacy policy was last updated on 1/01/2025. By using our services, you agree to the processing of your
                information as described herein.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-white text-3xl md:text-4xl mb-6">
              Have Questions About Our Privacy Policy?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Our team is here to help. Contact us if you have any concerns about how we handle your data.
            </p>
            <button
              onClick={() => router.push('/contact')}
              className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg transition-all transform hover:scale-105"
            >
              Contact Us
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;