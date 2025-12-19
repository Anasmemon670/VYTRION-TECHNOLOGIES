"use client";

import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { ArrowLeft, Upload, Package, X, Loader2 } from "lucide-react";
import { productsAPI } from "@/lib/api";

// Product type definition
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

export function AdminAddProductPage() {
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
    externalUrl: ""
  });

  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load product data when editing
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
              externalUrl: ""
            });
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              setImages(product.images);
            }
          } else {
            alert(`Product not found. Redirecting to products page.`);
            router.push('/admin/products');
          }
        } catch (err: any) {
          console.error('Error loading product:', err);
          alert(err.response?.data?.error || 'Failed to load product');
          router.push('/admin/products');
        } finally {
          setLoading(false);
        }
      }
    };

    loadProduct();
  }, [isEdit, id, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    
    const priceValue = parseFloat(formData.price);
    if (!formData.price || isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = "Valid price is required (must be a positive number)";
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
    
    if (formData.productType === "external" && !formData.externalUrl.trim()) {
      newErrors.externalUrl = "External URL is required for external products";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Declare productData outside try block so it's accessible in catch
    let productData: any = null;

    try {
      setSaving(true);

      // Prepare product data for API
      // Validate numeric fields
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

      // Process images - limit base64 size or convert to URLs if needed
      let processedImages: string[] | undefined = undefined;
      if (images.length > 0) {
        processedImages = images.map(img => {
          // If image is base64 and too large (>1MB), warn user
          if (img.startsWith('data:image') && img.length > 1000000) {
            console.warn('Large base64 image detected, consider using image URLs instead');
          }
          return img;
        });
      }

      // Prepare product data exactly as per form structure
      // Map form fields to API fields:
      // - Product Name (formData.name) -> title
      // - Category (formData.category) -> category
      // - Price (formData.price) -> price
      // - Discount (formData.discount) -> discount
      // - HS Code (formData.hsCode) -> hsCode
      // - Stock Quantity (formData.stock) -> stock
      // - Description (formData.description) -> description
      // - Mark as On Offer (formData.onOffer) -> featured (if true)
      // - Big Offer (formData.bigOffer) -> featured (if true, takes priority)
      // - Images (images array) -> images
      
      // Prepare product data - ensure all fields match backend schema
      // Backend expects: title (required), price (required), hsCode (required), stock (required)
      // For UPDATE: all fields are optional
      // For CREATE: title, price, hsCode, stock are required
      
      if (isEdit && id) {
        // UPDATE: Send all fields (all optional in update schema, but send them if they have values)
        // For update, only include fields that are being changed
        productData = {
          title: formData.name.trim(),
          price: price,
          hsCode: formData.hsCode.trim(),
          stock: stock,
          ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
          ...(formData.category.trim() ? { category: formData.category.trim() } : {}),
          ...(discount > 0 ? { discount: discount } : {}),
          featured: formData.bigOffer || formData.onOffer || false,
          ...(processedImages && processedImages.length > 0 ? { images: processedImages } : {}),
        };
      } else {
        // CREATE: All required fields must be present
        productData = {
          title: formData.name.trim(),
          price: price,
          hsCode: formData.hsCode.trim(),
          stock: stock,
          ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
          ...(formData.category.trim() ? { category: formData.category.trim() } : {}),
          ...(discount > 0 ? { discount: discount } : {}),
          featured: formData.bigOffer || formData.onOffer || false,
          ...(processedImages && processedImages.length > 0 ? { images: processedImages } : {}),
        };
      }

      // Remove undefined values but keep null values for optional fields
      const cleanedProductData: any = {}
      Object.keys(productData).forEach(key => {
        const value = productData[key as keyof typeof productData]
        // Include field if it's not undefined (null is allowed for optional fields)
        if (value !== undefined) {
          cleanedProductData[key] = value
        }
      })

      console.log('Sending product data to API:', JSON.stringify(cleanedProductData, null, 2));
      console.log('Is Edit Mode:', isEdit, 'Product ID:', id);

      if (isEdit && id) {
        // Update existing product - use cleaned data
        await productsAPI.update(id, cleanedProductData);
        alert("Product updated successfully!");
      } else {
        // Create new product - use cleaned data
        await productsAPI.create(cleanedProductData);
        alert("Product added successfully!");
      }

      router.push("/admin/products");
    } catch (err: any) {
      console.error('Error saving product:', err);
      console.error('Full error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Request data that was sent:', productData);
      
      // Log validation errors in detail
      if (err.response?.data?.details) {
        console.error('Validation error details:', err.response.data.details);
      }
      
      let errorMessage = 'Failed to save product. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.details) {
          // If it's a validation error array, format it nicely
          if (Array.isArray(errorData.details)) {
            const validationErrors = errorData.details.map((e: any) => {
              const field = e.path?.join('.') || 'unknown';
              return `${field}: ${e.message}`;
            }).join('\n');
            errorMessage = `Validation errors:\n${validationErrors}`;
          } else if (typeof errorData.details === 'string') {
            // Extract the actual error message from Prisma error
            const prismaErrorMatch = errorData.details.match(/Invalid.*?`(\w+)`/);
            if (prismaErrorMatch) {
              errorMessage = `Database error: Invalid field '${prismaErrorMatch[1]}'. Please check your input.`;
            } else {
              errorMessage = `Error: ${errorData.details}`;
            }
          } else {
            errorMessage = `Error: ${JSON.stringify(errorData.details)}`;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleImageAdd = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      // Convert file to base64 data URL
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
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    console.log("Image removed at index:", index);
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
      <div className="max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/admin/products")}
            className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg border border-slate-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-white text-3xl">
              {isEdit ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="text-slate-400">Fill in the product details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white text-xl mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  className={`w-full px-4 py-3 bg-slate-700 border ${errors.name ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Category *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electronics, Home & Kitchen"
                  className={`w-full px-4 py-3 bg-slate-700 border ${errors.category ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-slate-700 border ${errors.price ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">HS Code *</label>
                <input
                  type="text"
                  value={formData.hsCode}
                  onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                  placeholder="e.g., 8471.30"
                  className={`w-full px-4 py-3 bg-slate-700 border ${errors.hsCode ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
                {errors.hsCode && <p className="text-red-400 text-xs mt-1">{errors.hsCode}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-slate-300 text-sm mb-2 block">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows={4}
                className={`w-full px-4 py-3 bg-slate-700 border ${errors.description ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Checkboxes */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.onOffer}
                  onChange={(e) => setFormData({ ...formData, onOffer: e.target.checked })}
                  className="w-5 h-5 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-slate-300">Mark as On Offer</span>
              </label>
            </div>
          </div>

          {/* Images */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white text-xl mb-4">Product Images</h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleImageAdd}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Add Image
            </button>
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img src={img} alt={`Product ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(index)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Type */}
          <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-6 h-6 text-green-400" />
              <h2 className="text-white text-xl">Product Type</h2>
            </div>

            <div className="mb-4">
              <label className="text-slate-300 text-sm mb-2 block">Type</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="internal">Internal Product (API)</option>
                <option value="external">External Product</option>
              </select>
            </div>

            {formData.productType === "external" && (
              <div className="mb-4">
                <label className="text-slate-300 text-sm mb-2 block">External URL *</label>
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  placeholder="https://example.com/product"
                  className={`w-full px-4 py-3 bg-slate-700 border ${errors.externalUrl ? 'border-red-500' : 'border-slate-600'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
                {errors.externalUrl && <p className="text-red-400 text-xs mt-1">{errors.externalUrl}</p>}
              </div>
            )}

            {/* Big Offer Checkbox */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bigOffer}
                  onChange={(e) => setFormData({ ...formData, bigOffer: e.target.checked })}
                  className="w-5 h-5 mt-1 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-white">Big Offer</span>
                  <p className="text-slate-400 text-sm mt-1">
                    Mark this product as a "Big Offer". It will be featured in the Big Offers section on the home page. Maximum 4 products can be marked as big offers.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all border border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? "Updating..." : "Adding..."}
                </>
              ) : (
                isEdit ? "Update Product" : "Add Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminAddProductPage;
export { AdminAddProductPage };