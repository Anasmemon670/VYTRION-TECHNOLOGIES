"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Edit, Trash2, Plus, X, Cpu, Code, Globe, Shield, Smartphone, Headphones, Zap, Rocket, Loader2 } from "lucide-react";
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
        alert("Service updated successfully!");
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
        alert("Service created successfully!");
      }
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error saving service:', err);
      alert(err.response?.data?.error || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      await servicesAPI.delete(deleteConfirm);
      setServices(services.filter(s => s.id !== deleteConfirm));
      setDeleteConfirm(null);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl mb-2">Manage Services</h1>
            <p className="text-slate-400">{services.length} services</p>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Service
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service, index) => {
              const Icon = service.iconName ? iconMap[service.iconName] || Cpu : Cpu;
              const features = service.features && Array.isArray(service.features) ? service.features : [];
              
              return (
                <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white text-xl">{service.title}</h3>
                  </div>
                  <p className="text-slate-400 mb-4">{service.description}</p>

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
                    {deleteConfirm === service.id ? (
                      <>
                        <button 
                          onClick={handleDeleteConfirm}
                          disabled={deleting}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm(service.id)}
                        disabled={deleting}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
      </div>
    </AdminLayout>
  );
}

export default AdminServicesPage;