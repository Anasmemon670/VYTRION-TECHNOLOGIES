"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronDown, Menu, X, LogOut, User as UserIcon, HelpCircle, ShoppingCart, MessageSquare, Mail, Package } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { productsAPI } from "@/lib/api";
import logoImage from "../assets/77ac9b30465e2a638fe36d43d6692e10b6bf92e1.png";

const pages = [
  { name: "Products", path: "/products" },
  { name: "Blog", path: "/blog" },
  { name: "Projects", path: "/projects" },
  { name: "Services", path: "/services" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const getUserDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || user.phone || "User";
  };
  
  const getUserInitial = () => {
    if (!user) return "U";
    if (user.firstName) {
      return user.firstName[0]?.toUpperCase() || "U";
    }
    if (user.email) {
      return user.email[0]?.toUpperCase() || "U";
    }
    return "U";
  };
  const { getTotalItems } = useCart();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const totalCartItems = getTotalItems();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search products via API
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const response = await productsAPI.getAll({
          search: searchQuery,
          limit: 10
        });
        setSearchResults(response.products || []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredProducts = searchResults;

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push("/login");
  };

  const markAsRead = (id: number) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, unread: false } : msg));
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-1">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <img src={logoImage.src} alt="Vytrion Technologies" className="h-7 sm:h-8 md:h-10" />
            </Link>

            {/* Categories Dropdown - Moved to Left of Search */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseEnter={() => setIsDropdownOpen(true)}
                className="flex items-center gap-1 text-white hover:text-cyan-400 transition-colors bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-cyan-500/50"
              >
                Categories
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                    className="absolute top-full mt-2 left-0 bg-slate-800 rounded-lg shadow-xl py-2 min-w-[200px] border border-slate-700 z-50"
                  >
                    {pages.map((page) => (
                      <Link
                        key={page.name}
                        href={page.path}
                        className="block px-4 py-2 text-white hover:bg-slate-700 hover:text-cyan-400 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        {page.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full" ref={searchRef}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                      router.push(`/product/${filteredProducts[0].id}`);
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }
                  }}
                  className="w-full px-4 py-2 pl-10 bg-slate-800 text-white rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {isSearchFocused && filteredProducts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 max-h-[600px] overflow-y-auto"
                    >
                      {searchLoading && (
                        <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
                      )}
                      {!searchLoading && filteredProducts.length === 0 && searchQuery.trim() && (
                        <div className="p-4 text-center text-slate-400 text-sm">No products found</div>
                      )}
                      {!searchLoading && filteredProducts.map((product) => {
                        const images = product.images && Array.isArray(product.images) ? product.images : [];
                        return (
                          <Link
                            key={product.id}
                            href={`/product/${product.slug || product.id}`}
                            onClick={() => {
                              setSearchQuery("");
                              setIsSearchFocused(false);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                          >
                            <img
                              src={images[0] || '/images/products/headphones.png'}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{product.title}</p>
                              {product.category && (
                                <p className="text-slate-400 text-xs truncate">{product.category}</p>
                              )}
                              <p className="text-cyan-400 text-sm font-semibold">${parseFloat(product.price).toFixed(2)}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">

            {/* Orders Link - Only visible when logged in */}
            {user && (
              <Link
                href="/orders"
                className="text-white hover:text-cyan-400 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Package className="w-5 h-5" />
                <span>Orders</span>
              </Link>
            )}

            {/* Messages Icon */}
            <div className="relative">
              <button
                onClick={() => router.push("/messages")}
                className="relative text-white hover:text-cyan-400 transition-colors p-1 flex items-center justify-center"
                aria-label="Messages"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={() => router.push("/contact")}
              className="text-white hover:text-cyan-400 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Support</span>
            </button>

            {/* Cart Icon with Badge */}
            <button
              onClick={() => router.push("/cart")}
              className="relative text-white hover:text-cyan-400 transition-colors p-1 flex items-center justify-center"
              aria-label="Cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] h-4 w-4 flex items-center justify-center rounded-full font-bold border-2 border-slate-900">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Conditional Login/Register or User Menu */}
            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-3 text-white hover:text-cyan-400 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-cyan-500/50 transition-all overflow-hidden aspect-square">
                      {user?.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={getUserDisplayName()}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{getUserInitial()}</span>
                      )}
                    </div>
                    <span className="font-medium text-xs sm:text-sm hidden xl:block max-w-[100px] xl:max-w-none truncate">{getUserDisplayName()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        onMouseLeave={() => setIsUserMenuOpen(false)}
                        className="absolute top-full mt-4 right-0 bg-slate-800 rounded-lg shadow-xl py-2 min-w-[200px] border border-slate-700 z-50"
                      >
                        <div className="px-4 py-3 border-b border-slate-700 mb-2">
                          <p className="text-white font-medium">{getUserDisplayName()}</p>
                          <p className="text-slate-400 text-xs truncate">{user.email || user.phone || "No contact"}</p>
                        </div>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <UserIcon className="w-4 h-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          My Orders
                        </Link>
                        <div className="border-t border-slate-700 mt-2 pt-2">
                          <button
                            onClick={() => {
                              handleLogout();
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors w-full text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    router.push("/login");
                    setIsMobileMenuOpen(false);
                  }}
                  className="mx-3 text-white hover:text-cyan-400 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800 text-left"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    router.push("/register");
                    setIsMobileMenuOpen(false);
                  }}
                  className="mx-3 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-all"
                >
                  Register
                </button>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <div className="relative w-full" ref={searchRef}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0) {
                  router.push(`/product/${filteredProducts[0].id}`);
                  setSearchQuery("");
                  setIsSearchFocused(false);
                }
              }}
              className="w-full px-4 py-2 pl-10 bg-slate-800 text-white rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

            {/* Mobile Search Results Dropdown */}
            <AnimatePresence>
              {isSearchFocused && filteredProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 max-h-[600px] overflow-y-auto"
                >
                  {searchLoading && (
                    <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
                  )}
                  {!searchLoading && filteredProducts.length === 0 && searchQuery.trim() && (
                    <div className="p-4 text-center text-slate-400 text-sm">No products found</div>
                  )}
                  {!searchLoading && filteredProducts.map((product) => {
                    const images = product.images && Array.isArray(product.images) ? product.images : [];
                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug || product.id}`}
                        onClick={() => {
                          setSearchQuery("");
                          setIsSearchFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                      >
                        <img
                          src={images[0] || '/images/products/headphones.png'}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{product.title}</p>
                          {product.category && (
                            <p className="text-slate-400 text-xs truncate">{product.category}</p>
                          )}
                          <p className="text-cyan-400 text-sm font-semibold">${parseFloat(product.price).toFixed(2)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 overflow-hidden"
            >
              <nav className="flex flex-col gap-2 pb-4">
                <div className="border-b border-slate-700 pb-2 mb-2">
                  <p className="text-slate-400 text-sm px-3 mb-2">Categories</p>
                  {pages.map((page) => (
                    <Link
                      key={page.name}
                      href={page.path}
                      className="block px-3 py-2 text-white hover:bg-slate-800 hover:text-cyan-400 transition-colors rounded"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>

                {/* Mobile Messages Link */}
                <button
                  onClick={() => {
                    setIsMessagesOpen(true); // Ideally open a mobile-friendly view, but standard dropdown works or navigate to /messages
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-white hover:bg-slate-800 hover:text-cyan-400 transition-colors rounded flex items-center justify-between"
                >
                  Messages
                  {unreadCount > 0 && <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </button>

                <button
                  onClick={() => {
                    router.push("/contact");
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-white hover:bg-slate-800 hover:text-cyan-400 transition-colors rounded"
                >
                  Support
                </button>

                {/* Mobile User Menu */}
                {user ? (
                  <>
                    <div className="px-3 py-2 border-b border-slate-700 border-t mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center aspect-square">
                          {user?.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt={getUserDisplayName()}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {getUserInitial()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm">{getUserDisplayName()}</p>
                          <p className="text-slate-400 text-xs">{user.email || user.phone || "No contact"}</p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      className="px-3 py-2 text-white hover:bg-slate-800 hover:text-cyan-400 transition-colors rounded"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/orders"
                      className="px-3 py-2 text-white hover:bg-slate-800 hover:text-cyan-400 transition-colors rounded"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="mx-3 text-red-400 hover:text-red-300 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800 text-left flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => {
                          router.push("/login");
                          setIsMobileMenuOpen(false);
                        }}
                        className="mx-3 text-white hover:text-cyan-400 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800 text-left"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => {
                          router.push("/register");
                          setIsMobileMenuOpen(false);
                        }}
                        className="mx-3 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-all"
                      >
                        Register
                      </button>
                    </div>
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}