"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Upload, Loader2 } from "lucide-react";
import { projectsAPI } from "@/lib/api";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface Project {
  id: string;
  title: string;
  description?: string;
  client?: string;
  year?: string;
  status: string;
  images?: string[] | null;
  features?: string[] | null;
  createdAt: string;
}

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client: "",
    status: "Completed" as "Completed" | "In Progress",
    image: "",
    features: "",
    year: ""
  });
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await projectsAPI.getAll({ limit: 100 });
        setProjects(response.projects || []);
      } catch (err: any) {
        console.error('Error fetching projects:', err);
        setError(err.response?.data?.error || 'Failed to load projects');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => status === "Completed" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30";

  const handleAddNew = () => {
    setEditingProject(null);
    setFormData({ title: "", description: "", client: "", status: "Completed", image: "", features: "", year: "" });
    setImagePreview("");
    setShowEditModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    const images = project.images && Array.isArray(project.images) ? project.images : [];
    const features = project.features && Array.isArray(project.features) ? project.features : [];
    setFormData({
      title: project.title,
      description: project.description || "",
      client: project.client || "",
      status: project.status as "Completed" | "In Progress",
      image: images[0] || "",
      features: features.join(", "),
      year: project.year || ""
    });
    setImagePreview(images[0] || "");
    setShowEditModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For local file preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Store file path or URL (in real app, you'd upload to server)
      setFormData({ ...formData, image: URL.createObjectURL(file) });
    }
  };

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, image: url });
    setImagePreview(url);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Please fill in the title!");
      return;
    }

    try {
      setSaving(true);
      const images = imagePreview || formData.image ? [imagePreview || formData.image] : [];
      const features = formData.features ? formData.features.split(",").map(f => f.trim()).filter(f => f) : [];

      if (editingProject) {
        // Update existing project
        const response = await projectsAPI.update(editingProject.id, {
          title: formData.title,
          description: formData.description || null,
          client: formData.client || null,
          year: formData.year || null,
          status: formData.status,
          images: images.length > 0 ? images : null,
          features: features.length > 0 ? features : null,
        });
        setProjects(projects.map(p => p.id === editingProject.id ? response.project : p));
        alert("Project updated successfully!");
      } else {
        // Create new project
        const response = await projectsAPI.create({
          title: formData.title,
          description: formData.description || undefined,
          client: formData.client || undefined,
          year: formData.year || undefined,
          status: formData.status,
          images: images.length > 0 ? images : undefined,
          features: features.length > 0 ? features : undefined,
        });
        setProjects([response.project, ...projects]);
        alert("Project created successfully!");
      }
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error saving project:', err);
      alert(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await projectsAPI.delete(deleteConfirm);
      setProjects(projects.filter(p => p.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting project:', err);
      alert(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 lg:mb-8">
          <div>
            <h1 className="text-white text-2xl lg:text-3xl mb-1 lg:mb-2">Manage Projects</h1>
            <p className="text-slate-400 text-sm lg:text-base">{projects.length} projects</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm lg:text-base w-full lg:w-auto"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Add New Project
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
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No projects yet. Create your first project!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project, index) => {
              const images = project.images && Array.isArray(project.images) ? project.images : [];
              const features = project.features && Array.isArray(project.features) ? project.features : [];
              
              return (
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-4 lg:p-6 border border-slate-700">
              <div className="flex items-start gap-3 lg:gap-4">
                {/* Project Image */}
                {project.images && Array.isArray(project.images) && project.images[0] && (
                  <div className="w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={project.images[0]}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Project Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
                    <h3 className="text-white text-lg lg:text-xl line-clamp-2">{project.title}</h3>
                    <span className={`px-2 lg:px-3 py-1 border rounded-full text-xs lg:text-sm w-fit ${getStatusColor(project.status)}`}>{project.status}</span>
                  </div>
                  <p className="text-slate-400 mb-2 lg:mb-3 text-sm lg:text-base line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-xs lg:text-sm text-slate-500">
                    <span>Client: {project.client}</span>
                    <span className="hidden lg:inline">•</span>
                    <span>{project.year || project.date}</span>
                  </div>
                  {/* Features */}
                  {project.features && Array.isArray(project.features) && project.features.length > 0 && (
                    <div className="mt-2 lg:mt-3 flex flex-wrap gap-2">
                      {project.features.map((feature, i) => (
                        <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 lg:ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(project)}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2 lg:p-3 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  {deleteConfirm === project.id ? (
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
                      onClick={() => setDeleteConfirm(project.id)}
                      disabled={deleting}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 lg:p-3 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-4 lg:p-8 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-white text-lg lg:text-2xl">{editingProject ? "Edit Project" : "Add New Project"}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:text-slate-400 transition-colors flex-shrink-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            <div className="space-y-3 lg:space-y-4">
              <input
                type="text"
                placeholder="Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base"
              />
              <textarea
                placeholder="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full h-20 lg:h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base resize-none"
              />
              <input
                type="text"
                placeholder="Client *"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base"
              />
              <input
                type="text"
                placeholder="Year (e.g., 2024)"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base"
              />
              {/* Image Upload Section */}
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Image</label>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="w-full h-40 lg:h-48 rounded-lg overflow-hidden mb-2 border border-slate-600">
                    <ImageWithFallback
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Image Upload Options */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                  {/* File Upload */}
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="bg-slate-700 hover:bg-slate-600 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-600 text-sm lg:text-base">
                      <Upload className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span>Upload Image</span>
                    </div>
                  </label>

                  {/* URL Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Or enter image URL"
                      value={formData.image}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base"
                    />
                  </div>
                </div>
                <p className="text-slate-400 text-xs">Upload an image file or paste an image URL</p>
              </div>
              <textarea
                placeholder="Features (comma separated, e.g., Web Development, Mobile Apps)"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full h-16 lg:h-20 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base resize-none"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="bg-slate-700 text-white px-3 lg:px-4 py-2 lg:py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm lg:text-base"
              >
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 mt-4 lg:mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg transition-all text-sm lg:text-base flex items-center justify-center gap-2"
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
                className="px-4 lg:px-6 py-2 lg:py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-all text-sm lg:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminProjectsPage;