import { Facebook, Twitter, Linkedin, MessageSquare } from "lucide-react";
import Link from "next/link";
import logoImage from "../assets/77ac9b30465e2a638fe36d43d6692e10b6bf92e1.png";

export function Footer() {
  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com", label: "Twitter", bg: "bg-slate-700" },
    { icon: MessageSquare, href: "https://discord.com", label: "Discord", bg: "bg-slate-700" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn", bg: "bg-slate-700" },
    { icon: Facebook, href: "https://facebook.com", label: "Facebook", bg: "bg-slate-700" },
  ];

  const companyLinks = [
    { name: "About Us", href: "/about-us" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-of-service" },
  ];

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mb-6 sm:mb-8">
          {/* Left Side - Logo & Description */}
          <div>
            <h3 className="text-cyan-400 text-xl sm:text-2xl mb-3 sm:mb-4">VYTRION</h3>
            <p className="text-slate-400 text-sm sm:text-base mb-4 sm:mb-6 max-w-md leading-relaxed">
              Your trusted company where we bring together the latest technology, the best offers and the most innovative solutions. Our mission is to keep you updated every day to bring you a smarter, more accessible and opportunity-filled future.
            </p>
            {/* Social Links */}
            <div className="flex gap-2 sm:gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className={`${social.bg} hover:bg-slate-600 p-2.5 sm:p-3 rounded-lg transition-all transform hover:scale-110`}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Right Side - Company Links */}
          <div>
            <h3 className="text-white text-base sm:text-lg mb-3 sm:mb-4">Company</h3>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {companyLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-slate-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-slate-400 text-xs sm:text-sm">
            © 2025 VYTRION. All rights reserved.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center text-xs sm:text-sm justify-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-slate-400">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-slate-400">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-slate-400">Fast Shipping</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}