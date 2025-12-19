"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    published: false
  });
  const [imagePreview, setImagePreview] = useState<string>("");

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
      excerpt: blog.excerpt || "",
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

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Please fill in title and content!");
      return;
    }

    try {
      setSaving(true);
      if (editingBlog) {
        // Update existing blog
        const response = await blogAPI.update(editingBlog.id, {
          title: formData.title,
          excerpt: formData.excerpt || null,
          content: formData.content,
          featuredImage: formData.featuredImage || null,
          published: formData.published
        });
        setBlogs(blogs.map(b => b.id === editingBlog.id ? response.post : b));
        alert("Blog post updated successfully!");
      } else {
        // Create new blog
        const response = await blogAPI.create({
          title: formData.title,
          excerpt: formData.excerpt || undefined,
          content: formData.content,
          featuredImage: formData.featuredImage || undefined,
          published: formData.published
        });
        setBlogs([response.post, ...blogs]);
        alert("Blog post created successfully!");
      }
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error saving blog:', err);
      alert(err.response?.data?.error || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await blogAPI.delete(deleteConfirm);
      setBlogs(blogs.filter(b => b.id !== deleteConfirm));
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 lg:mb-8">
          <div>
            <h1 className="text-white text-2xl lg:text-3xl mb-1 lg:mb-2">Manage Blog</h1>
            <p className="text-slate-400 text-sm lg:text-base">{blogs.length} blog posts</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm lg:text-base w-full lg:w-auto"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Add New Post
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

        <div className="space-y-4">
          {blogs.map((blog, index) => (
            <motion.div key={blog.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-4 lg:p-6 border border-slate-700">
              <div className="flex items-start gap-3 lg:gap-4">
                {/* Blog Image */}
                <div className="w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
                  <ImageWithFallback
                    src={blog.featuredImage || ''}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Blog Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-lg lg:text-xl mb-1 lg:mb-2 line-clamp-2">{blog.title}</h3>
                  
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
                  {deleteConfirm === blog.id ? (
                    <>
                      <button 
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all text-xs lg:text-sm flex items-center gap-2"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all text-xs lg:text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirm(blog.id)}
                      disabled={deleting}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 lg:p-3 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  placeholder="Excerpt (optional)"
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
                <textarea
                  placeholder="Full Content (HTML supported)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full h-40 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                />
                <p className="text-slate-400 text-xs">You can use HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, etc.</p>

                {/* Image Upload Section - Separate Field */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Featured Image (optional)</label>

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
                  <p className="text-slate-400 text-xs">Paste an image URL for the featured image.</p>
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
      </div>
    </AdminLayout>
  );
}

export default AdminBlogPage;