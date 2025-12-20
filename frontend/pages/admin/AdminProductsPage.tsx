"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, ChevronDown, X, AlertTriangle, Loader2 } from "lucide-react";
import { productsAPI } from "@/lib/api";

// Product type definition
interface Product {
  id: string;
  title: string;
  price: string;
  category?: string;
  description?: string;
  discount?: number;
  stock: number;
  images?: string[] | null;
  featured?: boolean;
  slug?: string;
}

export function AdminProductsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: any = { limit: 100 };
        if (selectedCategory !== "All") {
          params.category = selectedCategory;
        }
        const response = await productsAPI.getAll(params);
        setProducts(response.products || []);

        // Extract unique categories
        const uniqueCategories = new Set<string>(["All"]);
        response.products?.forEach((p: Product) => {
          if (p.category) uniqueCategories.add(p.category);
        });
        setCategories(Array.from(uniqueCategories));
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.response?.data?.error || 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteConfirm(product.id);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      await productsAPI.delete(productToDelete.id);
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setDeleteConfirm(null);
      setProductToDelete(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to delete product';
      alert(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
    setProductToDelete(null);
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/products/edit/${id}`);
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    // Products are already filtered by category from API
    const sorted = [...products];
    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "price-high":
        sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "featured":
      default:
        // Keep original order
        break;
    }
    return sorted;
  }, [products, sortBy]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1 className="text-white text-2xl sm:text-3xl mb-1 sm:mb-2">Manage Products</h1>
            <p className="text-slate-400 text-sm sm:text-base">{products.length} total products</p>
          </div>
          <button
            onClick={() => router.push("/admin/products/add")}
            className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add New Product</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Filter and Sort Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Category Pills */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg transition-all ${selectedCategory === cat
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-700 border border-slate-600 text-white px-4 py-2 pr-10 rounded-lg hover:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Products Count */}
        <p className="text-slate-400 text-sm sm:text-base mb-4 sm:mb-6">
          Showing <span className="font-semibold text-white">{filteredAndSortedProducts.length}</span> products
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {filteredAndSortedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-xl hover:shadow-2xl transition-all"
            >
              {/* IMAGE */}
              <div className="relative">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-56 bg-slate-700 flex items-center justify-center text-slate-400">
                    No Image
                  </div>
                )}

                {/* DISCOUNT */}
                {product.discount && product.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {product.discount}% OFF
                  </span>
                )}

                {/* FEATURED */}
                {product.featured && (
                  <span className="absolute top-3 right-3 bg-cyan-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Featured
                  </span>
                )}
              </div>

              {/* CONTENT */}
              <div className="p-4">
                <h3 className="text-white text-lg font-semibold mb-1 line-clamp-1">
                  {product.title}
                </h3>

                <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mb-2">
                  <p className="text-cyan-400 text-lg font-bold">
                    ${parseFloat(product.price).toFixed(2)}
                  </p>
                  <span className="text-slate-400 text-sm">
                    {product.category}
                  </span>
                </div>

                <p className="text-slate-500 text-sm mb-4">
                  Stock: {product.stock}
                </p>

                {/* BUTTONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(product.id)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Edit size={18} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteClick(product)}
                    disabled={deleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && productToDelete && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-800 rounded-xl p-4 sm:p-6 max-w-md w-full border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    </div>
                    <h2 className="text-white text-lg sm:text-xl font-semibold">Delete Product</h2>
                  </div>
                  <button
                    onClick={handleDeleteCancel}
                    className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-300 text-sm sm:text-base mb-2">
                  Are you sure you want to delete this product?
                </p>
                <p className="text-white font-semibold mb-4 sm:mb-6 break-words">
                  "{productToDelete.title}"
                </p>
                <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                  This action cannot be undone.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Delete Product</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}

export default AdminProductsPage;