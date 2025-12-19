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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl mb-2">Manage Products</h1>
            <p className="text-slate-400">{products.length} total products</p>
          </div>
          <button
            onClick={() => router.push("/admin/products/add")}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Product
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
        <p className="text-slate-400 mb-6">
          Showing <span className="font-semibold text-white">{filteredAndSortedProducts.length}</span> products
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-slate-700"
            >
              <div className="relative">
                {product.images && Array.isArray(product.images) && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                    <span className="text-slate-500">No Image</span>
                  </div>
                )}
                {product.featured && (
                  <span className="absolute top-3 right-3 bg-cyan-500 text-white text-xs px-3 py-1 rounded-full">
                    Featured
                  </span>
                )}
                {product.discount && product.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                    {product.discount}% OFF
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-white text-lg mb-1">{product.title}</h3>
                {product.description && (
                  <p className="text-slate-400 text-sm mb-2 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-cyan-400">${parseFloat(product.price).toFixed(2)}</p>
                  {product.category && (
                    <p className="text-slate-500 text-sm">{product.category}</p>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-3">Stock: {product.stock}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product.id)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(product)}
                    disabled={deleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
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
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-white text-xl font-semibold">Delete Product</h2>
                  </div>
                  <button
                    onClick={handleDeleteCancel}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-300 mb-2">
                  Are you sure you want to delete this product?
                </p>
                <p className="text-white font-semibold mb-6">
                  "{productToDelete.title}"
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Delete Product
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