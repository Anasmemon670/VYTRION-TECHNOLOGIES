"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Trash2, Plus, X, Loader2, CheckCircle, AlertTriangle, Tag } from "lucide-react";
import { categoriesAPI } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await categoriesAPI.getAll();
        setCategories(response.categories || []);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.response?.data?.error || 'Failed to load categories');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleAddNew = () => {
    setCategoryName("");
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      alert("Please enter a category name!");
      return;
    }

    try {
      setSaving(true);
      const response = await categoriesAPI.create({
        name: categoryName.trim(),
      });
      setCategories([response.category, ...categories]);
      setSuccessMessage("Category created successfully!");
      setShowSuccessModal(true);
      setShowAddModal(false);
      setCategoryName("");
    } catch (err: any) {
      console.error('Error saving category:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to save category';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setCategoryToDelete(null);
    setDeleteConfirm(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !categoryToDelete) return;

    try {
      setDeleting(true);
      await categoriesAPI.delete(deleteConfirm);
      setCategories(categories.filter(c => c.id !== deleteConfirm));
      setDeleteConfirm(null);
      setCategoryToDelete(null);
      setSuccessMessage("Category deleted successfully!");
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete category';
      alert(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setCategoryName("");
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1 className="text-white text-2xl sm:text-3xl mb-1 sm:mb-2">Manage Categories</h1>
            <p className="text-slate-400 text-sm sm:text-base">{categories.length} total categories</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add New Category</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No categories yet.</p>
            <p className="text-slate-500 text-sm mt-2">Create your first category to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 sm:p-6 border border-slate-700 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-white text-lg sm:text-xl font-semibold break-words flex-1">
                    {category.name}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs mb-4">
                  Created: {new Date(category.createdAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => {
                    setDeleteConfirm(category.id);
                    setCategoryToDelete(category);
                  }}
                  disabled={deleting}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add Category Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 w-full max-w-md border border-slate-700 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-2xl font-semibold">Add New Category</h2>
                <button
                  onClick={handleCancel}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">Category Name *</label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !saving) {
                        handleSave();
                      }
                    }}
                    className="bg-slate-700/80 border border-slate-600 text-white px-4 py-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving || !categoryName.trim()}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && categoryToDelete && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 w-full max-w-md border border-slate-700 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">Delete Category</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Are you sure you want to delete "{categoryToDelete.name}"?
                  </p>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-6">
                This action cannot be undone. If this category is used by any products, the deletion will fail.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-2xl max-w-md w-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Success!</h3>
                <p className="text-slate-300 text-sm mb-6">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminCategoriesPage;

