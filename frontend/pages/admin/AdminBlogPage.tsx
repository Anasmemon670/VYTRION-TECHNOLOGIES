"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Upload, Image as ImageIcon, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { blogAPI } from "@/lib/api";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function AdminBlogPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<BlogPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    published: false
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await blogAPI.getAll({ limit: 100, published: false });
        setBlogs(response.posts || []);
      } catch (err: any) {
        console.error('Error fetching blogs:', err);
        setError(err.response?.data?.error || 'Failed to load blog posts');
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const handleAddNew = () => {
    setEditingBlog(null);
    setFormData({ title: "", excerpt: "", content: "", featuredImage: "", published: false });
    setImagePreview("");
    setShowEditModal(true);
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt || blog.content || "",
      content: blog.content,
      featuredImage: blog.featuredImage || "",
      published: blog.published
    });
    setImagePreview(blog.featuredImage || "");
    setShowEditModal(true);
  };

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, featuredImage: url });
    setImagePreview(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setFormData({ ...formData, featuredImage: imageUrl });
        setImagePreview(imageUrl);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.excerpt.trim()) {
      alert("Please fill in title and excerpt!");
      return;
    }

    try {
      setSaving(true);
      if (editingBlog) {
        // Update existing blog
        const response = await blogAPI.update(editingBlog.id, {
          title: formData.title,
          excerpt: formData.excerpt || null,
          content: formData.excerpt || "",
          featuredImage: formData.featuredImage || null,
          published: formData.published
        });
        setBlogs(blogs.map(b => b.id === editingBlog.id ? response.post : b));
        setSuccessMessage("Blog post updated successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
      } else {
        // Create new blog
        const response = await blogAPI.create({
          title: formData.title,
          excerpt: formData.excerpt || undefined,
          content: formData.excerpt || "",
          featuredImage: formData.featuredImage || undefined,
          published: formData.published
        });
        setBlogs([response.post, ...blogs]);
        setSuccessMessage("Blog post created successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
      }
    } catch (err: any) {
      console.error('Error saving blog:', err);
      alert(err.response?.data?.error || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await blogAPI.delete(deleteConfirm.id);
      setBlogs(blogs.filter(b => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting blog:', err);
      alert(err.response?.data?.error || 'Failed to delete blog post');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
            <h1 className="text-white text-2xl sm:text-3xl mb-1 sm:mb-2">Manage Blog</h1>
            <p className="text-slate-400 text-sm sm:text-base">{blogs.length} blog posts</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add New Post</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && blogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No blog posts found.</p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {blogs.map((blog, index) => (
            <motion.div key={blog.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-slate-700">
              <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                {/* Blog Image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
                  <ImageWithFallback
                    src={blog.featuredImage || undefined}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Blog Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-base sm:text-lg lg:text-xl mb-1 lg:mb-2 line-clamp-2 break-words">{blog.title}</h3>
                  
                  {/* Excerpt or Content Preview */}
                  {(blog.excerpt || blog.content) && (
                    <p className="text-slate-400 mb-2 lg:mb-3 text-sm lg:text-base line-clamp-2 leading-relaxed">
                      {blog.excerpt || 
                        (blog.content 
                          ? blog.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' 
                          : '')
                      }
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-xs lg:text-sm text-slate-500">
                    <span>{formatDate(blog.createdAt)}</span>
                    <span className="hidden lg:inline">•</span>
                    <span className={blog.published ? "text-green-400" : "text-yellow-400"}>
                      {blog.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 lg:ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(blog)}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2 lg:p-3 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(blog)}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 lg:p-3 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-4 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-white text-xl sm:text-2xl">{editingBlog ? "Edit Blog Post" : "Add New Blog Post"}</h2>
                <button onClick={() => setShowEditModal(false)} className="text-white hover:text-slate-400 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <textarea
                  placeholder="Excerpt *"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="published" className="text-white">Published</label>
                </div>

                {/* Image Upload Section - Separate Field */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Featured Image *</label>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="w-full h-48 rounded-lg overflow-hidden mb-2 border border-slate-600">
                      <ImageWithFallback
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* URL Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Enter image URL"
                      value={formData.featuredImage}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  
                  {/* Divider */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-slate-600"></div>
                    <span className="text-slate-400 text-xs">OR</span>
                    <div className="flex-1 h-px bg-slate-600"></div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Image
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
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
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  </div>
                  <h2 className="text-white text-lg sm:text-xl font-semibold">Delete Blog Post</h2>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 text-sm sm:text-base mb-2">
                Are you sure you want to delete this blog post?
              </p>
              <p className="text-white font-semibold mb-4 sm:mb-6 break-words">
                "{deleteConfirm.title}"
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                This action cannot be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-6 py-3 bg-slate-700/80 hover:bg-slate-600 text-white rounded-xl transition-all duration-200 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl border border-slate-600 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl hover:shadow-red-500/30 border border-red-600 hover:border-red-500"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Delete Blog</span>
                    </>
                  )}
                </button>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-2xl max-w-md w-full mx-4"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Success!
                </h3>
                <p className="text-slate-300 text-sm mb-6">
                  {successMessage}
                </p>
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

export default AdminBlogPage;