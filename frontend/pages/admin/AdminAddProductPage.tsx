"use client";

import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRouter, useParams } from "next/navigation";

import { AdminLayout } from "../../components/admin/AdminLayout";
import { ArrowLeft, Upload, Package, X, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import { productsAPI, categoriesAPI } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  discount: number;
  onOffer: boolean;
  bigOffer: boolean;
  image: string;
}

function AdminAddProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    discount: "",
    hsCode: "",
    stock: "0",
    onOffer: false,
    bigOffer: false,
    productType: "internal",
    externalUrl: "",
  });

  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- LOAD CATEGORIES -------------------- */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await categoriesAPI.getAll();
        setCategories(response.categories || []);
      } catch (err) {
        console.error('Error loading categories:', err);
        // Don't block the form if categories fail to load
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  /* -------------------- LOAD PRODUCT (NO CHANGE) -------------------- */
  useEffect(() => {
    const loadProduct = async () => {
      if (isEdit && id) {
        try {
          setLoading(true);
          const response = await productsAPI.getById(id);
            const product = response.product;
          
          if (product) {
            setFormData({
              name: product.title || "",
              price: product.price || "",
              category: product.category || "",
              description: product.description || "",
              discount: product.discount?.toString() || "0",
              hsCode: product.hsCode || "",
              stock: product.stock?.toString() || "0",
              onOffer: false,
              bigOffer: product.featured || false,
              productType: "internal",
              externalUrl: "",
            });

            if (Array.isArray(product.images)) {
              setImages(product.images);
            }
          } else {
            router.push("/admin/products");
          }
        } catch (err) {
          router.push("/admin/products");
        } finally {
          setLoading(false);
        }
      }
    };

    loadProduct();
  }, [isEdit, id, router]);

  /* -------------------- HANDLE FILE UPLOAD -------------------- */
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
        setImages([...images, imageUrl]);
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

  /* -------------------- VALIDATE FORM -------------------- */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    
    const priceValue = parseFloat(formData.price);
    if (!formData.price || isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = "Valid price is required";
    }
    
    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!formData.hsCode.trim()) {
      newErrors.hsCode = "HS Code is required";
    }
    
    const stockValue = parseInt(formData.stock);
    if (formData.stock && (isNaN(stockValue) || stockValue < 0)) {
      newErrors.stock = "Stock must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* -------------------- HANDLE SUBMIT -------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        alert("Please enter a valid price");
        setSaving(false);
        return;
      }

      const discount = formData.discount ? parseInt(formData.discount) : 0;
      if (isNaN(discount) || discount < 0 || discount > 100) {
        alert("Discount must be between 0 and 100");
        setSaving(false);
        return;
      }

      const stock = parseInt(formData.stock) || 0;
      if (isNaN(stock) || stock < 0) {
        alert("Stock must be a non-negative number");
        setSaving(false);
        return;
      }

      let processedImages: string[] | undefined = undefined;
      if (images.length > 0) {
        processedImages = images.map(img => img);
          }

      // Find categoryId if category name is selected
      const selectedCategory = categories.find(cat => cat.name === formData.category.trim());
      
      const productData: any = {
          title: formData.name.trim(),
          price: price,
          hsCode: formData.hsCode.trim(),
          stock: stock,
          ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
          // Preserve category string for backward compatibility
          ...(formData.category.trim() ? { category: formData.category.trim() } : {}),
          // Also send categoryId if category is selected from dropdown
          ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
          ...(discount > 0 ? { discount: discount } : {}),
          featured: formData.bigOffer || formData.onOffer || false,
          ...(processedImages && processedImages.length > 0 ? { images: processedImages } : {}),
        };

      if (isEdit && id) {
        await productsAPI.update(id, productData);
        setSuccessMessage("Product updated successfully!");
        setShowSuccessModal(true);
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      } else {
        await productsAPI.create(productData);
        setSuccessMessage("Product added successfully!");
        setShowSuccessModal(true);
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to save product';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- UI CLASSES (ONLY UI) -------------------- */
  const pageWidth = "max-w-6xl w-full mx-auto px-3 sm:px-4 pb-12";

  const sectionCard =
    "bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-700 shadow-xl";

  const labelClass = "text-slate-300 text-sm mb-2 block";

  const inputClass =
    "w-full px-4 py-3 bg-slate-700/80 border border-slate-600 text-white rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer";

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={pageWidth}>
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/admin/products")}
            className="bg-slate-800 border border-slate-700 p-2 rounded-lg text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-white text-2xl sm:text-3xl font-semibold">
              {isEdit ? "Edit Product" : "Add Product"}
            </h1>
            <p className="text-slate-400 text-sm">
              Fill in the product details below
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC INFORMATION */}
          <div className={sectionCard}>
            <h2 className="text-white text-xl font-semibold mb-5">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Product Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className={labelClass}>Category *</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className={`${inputClass} pr-10 ${errors.category ? 'border-red-500' : ''}`}
                    disabled={loadingCategories}
                    style={{
                      color: '#ffffff',
                      backgroundColor: '#334155',
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Select a category</option>
                    {categories.map((cat) => (
                      <option 
                        key={cat.id} 
                        value={cat.name}
                        style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                      >
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
                {loadingCategories && (
                  <p className="text-slate-500 text-xs mt-1">Loading categories...</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="Enter price"
                  className={`${inputClass} ${errors.price ? 'border-red-500' : ''}`}
                />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className={labelClass}>Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount: e.target.value })
                  }
                  placeholder="Enter discount percentage"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>HS Code *</label>
                <input
                  value={formData.hsCode}
                  onChange={(e) =>
                    setFormData({ ...formData, hsCode: e.target.value })
                  }
                  placeholder="e.g., 123456"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder="Enter stock quantity"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Description *</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter product description"
                className={`${inputClass} resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.onOffer}
                  onChange={(e) =>
                    setFormData({ ...formData, onOffer: e.target.checked })
                  }
                  className="w-5 h-5 rounded text-purple-500"
                />
                Mark as On Offer
              </label>
            </div>
          </div>

          {/* PRODUCT IMAGES */}
          <div className={sectionCard}>
            <h2 className="text-white text-xl font-semibold mb-4">
              Product Images
            </h2>

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
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Add Image
            </button>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden border border-slate-700"
                  >
                    <img
                      src={img}
                      className="w-full h-28 sm:h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages(images.filter((_, i) => i !== index))
                      }
                      className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OFFERS */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-emerald-400" />
              <h2 className="text-white text-xl font-semibold">
                Offers
              </h2>
            </div>

            <div className="mt-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.bigOffer}
                  onChange={(e) =>
                    setFormData({ ...formData, bigOffer: e.target.checked })
                  }
                  className="w-5 h-5 mt-1 text-purple-500"
                />
                <div>
                  <p className="text-white font-medium">Big Offer</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Mark this product as a Big Offer. Max 4 products.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl border border-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg"
            >
              {saving ? (isEdit ? "Updating..." : "Adding Product...") : (isEdit ? "Update Product" : "Add Product")}
            </button>
          </div>
        </form>

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
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push("/admin/products");
                  }}
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

export default AdminAddProductPage;
export { AdminAddProductPage };
