"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Cpu, Code, Globe, Shield, Smartphone, Headphones, Zap, Rocket, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { servicesAPI } from "@/lib/api";
import type { LucideIcon } from "lucide-react";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Cpu,
  Code,
  Globe,
  Shield,
  Smartphone,
  Headphones,
  Zap,
  Rocket
};

interface Service {
  id: string;
  title: string;
  description: string;
  features?: string[] | null;
  price?: string | null;
  duration?: string | null;
  iconName?: string | null;
  active: boolean;
}

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    features: "",
    price: "",
    duration: "",
    iconName: "Cpu"
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await servicesAPI.getAll({ limit: 100, active: false });
        setServices(response.services || []);
      } catch (err: any) {
        console.error('Error fetching services:', err);
        setError(err.response?.data?.error || 'Failed to load services');
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({ title: "", description: "", features: "", price: "", duration: "", iconName: "Cpu" });
    setShowEditModal(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const features = service.features && Array.isArray(service.features) ? service.features : [];
    setFormData({
      title: service.title,
      description: service.description,
      features: features.join(", "),
      price: service.price || "",
      duration: service.duration || "",
      iconName: service.iconName || "Cpu"
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill all required fields (Title and Description)!");
      return;
    }

    try {
      setSaving(true);
      const features = formData.features ? formData.features.split(",").map(f => f.trim()).filter(f => f) : [];

      if (editingService) {
        // Update existing service
        const response = await servicesAPI.update(editingService.id, {
          title: formData.title,
          description: formData.description,
          iconName: formData.iconName || null,
          features: features.length > 0 ? features : null,
          price: formData.price || null,
          duration: formData.duration || null,
        });
        setServices(services.map(s => s.id === editingService.id ? response.service : s));
        setSuccessMessage("Service updated successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
      } else {
        // Create new service
        const response = await servicesAPI.create({
          title: formData.title,
          description: formData.description,
          iconName: formData.iconName || undefined,
          features: features.length > 0 ? features : undefined,
          price: formData.price || null,
          duration: formData.duration || null,
        });
        setServices([response.service, ...services]);
        setSuccessMessage("Service created successfully!");
        setShowSuccessModal(true);
        setShowEditModal(false);
      }
    } catch (err: any) {
      console.error('Error saving service:', err);
      alert(err.response?.data?.error || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setServiceToDelete(null);
    setDeleteConfirm(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !serviceToDelete) return;

    try {
      setDeleting(true);
      await servicesAPI.delete(deleteConfirm);
      setServices(services.filter(s => s.id !== deleteConfirm));
      setDeleteConfirm(null);
      setServiceToDelete(null);
    } catch (err: any) {
      console.error('Error deleting service:', err);
      alert(err.response?.data?.error || 'Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-white text-2xl sm:text-3xl">Manage Services</h1>
            <p className="text-slate-400 text-sm sm:text-base">{services.length} services</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
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
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No services yet. Create your first service!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            {services.map((service, index) => {
              const Icon = service.iconName ? iconMap[service.iconName] || Cpu : Cpu;
              const features = service.features && Array.isArray(service.features) ? service.features : [];
              
              return (
                <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-4 sm:p-5 md:p-6 border border-slate-700">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="text-white text-lg sm:text-xl break-words">{service.title}</h3>
                  </div>
                  <p className="text-slate-400 mb-3 sm:mb-4 text-sm sm:text-base line-clamp-3">{service.description}</p>

                  {/* Features */}
                  {features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-slate-300 text-sm mb-2">Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {features.map((feature, i) => (
                          <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(service.price || service.duration) && (
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      {service.price && <span className="text-cyan-400">{service.price}</span>}
                      {service.price && service.duration && <span>•</span>}
                      {service.duration && <span>Duration: {service.duration}</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteConfirm(service.id);
                        setServiceToDelete(service);
                      }}
                      disabled={deleting}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-2xl">{editingService ? "Edit Service" : "Add New Service"}</h2>
                <button onClick={handleCancel} className="text-white hover:text-slate-400 transition-colors">
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
                  placeholder="Description *"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <textarea
                  placeholder="Features (comma separated, e.g., Cloud Computing, IT Infrastructure)"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full h-20 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Price (optional, e.g., $2,999)"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Duration (optional, e.g., 4-6 weeks)"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />

                {/* Icon Selection */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Icon</label>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(iconMap).map(([name, IconComponent]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData({ ...formData, iconName: name })}
                        className={`p-3 rounded-lg border-2 transition-all ${formData.iconName === name
                            ? "border-cyan-500 bg-cyan-500/20"
                            : "border-slate-600 bg-slate-700 hover:border-slate-500"
                          }`}
                      >
                        <IconComponent className={`w-6 h-6 mx-auto ${formData.iconName === name ? "text-cyan-400" : "text-slate-400"
                          }`} />
                        <p className={`text-xs mt-1 ${formData.iconName === name ? "text-cyan-400" : "text-slate-500"
                          }`}>{name}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs">Select an icon for this service</p>
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
                  onClick={handleCancel}
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
          {deleteConfirm && serviceToDelete && (
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
                    <h2 className="text-white text-lg sm:text-xl font-semibold">Delete Service</h2>
                  </div>
                  <button
                    onClick={handleDeleteCancel}
                    className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-300 text-sm sm:text-base mb-2">
                  Are you sure you want to delete this service?
                </p>
                <p className="text-white font-semibold mb-4 sm:mb-6 break-words">
                  "{serviceToDelete.title}"
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
                        <span>Delete Service</span>
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
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 sm:py-3.5 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-green-500/30 border border-green-600 hover:border-green-500"
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

export default AdminServicesPage;