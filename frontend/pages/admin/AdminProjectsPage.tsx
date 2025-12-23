"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
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
        setSuccessMessage("Project updated successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
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
        setSuccessMessage("Project created successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
      }
    } catch (err: any) {
      console.error('Error saving project:', err);
      alert(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setProjectToDelete(null);
    setDeleteConfirm(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !projectToDelete) return;

    try {
      setDeleting(true);
      await projectsAPI.delete(deleteConfirm);
      setProjects(projects.filter(p => p.id !== deleteConfirm));
      setDeleteConfirm(null);
      setProjectToDelete(null);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1 className="text-white text-2xl sm:text-3xl mb-1 sm:mb-2">Manage Projects</h1>
            <p className="text-slate-400 text-sm sm:text-base">{projects.length} projects</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add New Project</span>
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
                <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-4 lg:p-6 border border-slate-700 overflow-hidden">
              <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
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
                    <span>{project.year}</span>
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
                <div className="flex gap-2 lg:ml-4 flex-shrink-0 items-start">
                  <button
                    onClick={() => handleEdit(project)}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2 sm:p-2.5 lg:p-3 rounded-lg transition-all flex-shrink-0 flex items-center justify-center"
                    style={{ minWidth: '36px', minHeight: '36px' }}
                  >
                    <Edit className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteConfirm(project.id);
                      setProjectToDelete(project);
                    }}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 sm:p-2.5 lg:p-3 rounded-lg transition-all flex-shrink-0 flex items-center justify-center"
                    style={{ minWidth: '36px', minHeight: '36px' }}
                  >
                    <Trash2 className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  </button>
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "Completed" | "In Progress" })}
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

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirm && projectToDelete && (
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
                  <h2 className="text-white text-lg sm:text-xl font-semibold">Delete Project</h2>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 text-sm sm:text-base mb-2">
                Are you sure you want to delete this project?
              </p>
              <p className="text-white font-semibold mb-4 sm:mb-6 break-words">
                "{projectToDelete.title}"
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
                      <span>Delete Project</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl max-w-md w-full mx-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
              </div>
              <h3 className="text-white text-lg sm:text-xl font-semibold mb-2">
                Success!
              </h3>
              <p className="text-slate-300 text-sm sm:text-base mb-6">
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold transition-colors text-sm sm:text-base"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminProjectsPage;