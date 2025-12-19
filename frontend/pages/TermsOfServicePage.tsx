"use client";

import { motion } from "motion/react";
import { FileText, Shield, CheckCircle, User, DollarSign, CreditCard, Copyright, AlertTriangle, Edit, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

const sections = [
  {
    id: 1,
    icon: CheckCircle,
    title: "Acceptance of Terms",
    content: "By accessing and using VYTRION's services, you accept and agree to comply with the terms and conditions described in this document. If you do not agree with these terms, please do not use our services.",
    points: []
  },
  {
    id: 2,
    icon: FileText,
    title: "Service Description",
    content: "VYTRION provides an e-commerce platform that includes:",
    points: [
      "Sale of products",
      "Presentation of professional projects and services",
      "Informative blog and educational resources",
      "Order and payment management system",
      "Customer service and technical support"
    ]
  },
  {
    id: 3,
    icon: Shield,
    title: "Acceptable Use",
    content: "You agree to use our services only for legal purposes and in accordance with these terms. The following are prohibited:",
    points: [
      "Using the platform for illegal or fraudulent activities",
      "Attempting unauthorized access to systems or data",
      "Distributing malware, viruses, or malicious code",
      "Violating intellectual property rights",
      "Performing spam or unsolicited mass mailings"
    ]
  },
  {
    id: 4,
    icon: User,
    title: "User Accounts",
    content: "To access certain features, you must create an account by providing accurate and up-to-date information. You are responsible for:",
    points: [
      "Maintaining the confidentiality of your credentials",
      "All activities performed with your account",
      "Notifying us immediately of any unauthorized use"
    ]
  },
  {
    id: 5,
    icon: DollarSign,
    title: "Products and Prices",
    content: "Prices are subject to change without prior notice. We strive to maintain accurate product information, but we do not guarantee that all descriptions are completely accurate.",
    points: []
  },
  {
    id: 6,
    icon: CreditCard,
    title: "Payments and Refunds",
    content: "Payments are processed securely through Stripe. Refund policies apply according to the type of product and the specific conditions of each purchase. Please consult our terms page for more details.",
    points: []
  },
  {
    id: 7,
    icon: Copyright,
    title: "Intellectual Property",
    content: "All content on VYTRION, including text, images, logos, and software, is protected by intellectual property rights. Reproduction without express authorization is not permitted.",
    points: []
  },
  {
    id: 8,
    icon: AlertTriangle,
    title: "Limitation of Liability",
    content: "VYTRION shall not be liable for indirect, incidental, or consequential damages. Our maximum liability is limited to the amount paid for the specific service that generated the claim.",
    points: []
  },
  {
    id: 9,
    icon: Edit,
    title: "Modifications",
    content: "We reserve the right to modify these terms at any time. Changes will take effect immediately after publication on the website.",
    points: []
  },
  {
    id: 10,
    icon: Mail,
    title: "Contact",
    content: "For questions about these terms, contact us through our contact form or send an email to devsolutions@gmail.com.",
    points: []
  }
];

export function TermsOfServicePage() {
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
              <FileText className="w-5 h-5" />
              <span className="text-sm">★ Legal Terms</span>
            </div>
            <h1 className="text-white text-4xl md:text-6xl mb-4">
              Terms and Conditions of Service
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
                These terms were last updated on VYTRION. By continuing to use our services, you agree to these updated terms.
              </p>
            </motion.div>

            {/* Terms Sections */}
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
                These terms were last updated on 1/01/2025. By continuing to use our services, you agree to these updated terms.
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
              Questions About Our Terms?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Our team is ready to assist you. Contact us if you have any questions about these terms and conditions.
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

export default TermsOfServicePage;