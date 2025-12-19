"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";
import { User, Save, ArrowLeft, X, CheckCircle, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setProfilePicture(user.profilePicture || null);
    setPreview(user.profilePicture || null);
    setMarketingOptIn(user.marketingOptIn || false);
  }, [user, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      // Convert file to base64 data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setProfilePicture(imageUrl);
        setPreview(imageUrl);
      };
      reader.onerror = () => {
        toast.error('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveClick = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    // Check if there are any changes
    const hasFirstNameChange = firstName.trim() !== (user?.firstName || '');
    const hasLastNameChange = lastName.trim() !== (user?.lastName || '');
    const hasEmailChange = email !== (user?.email || '');
    const hasPhoneChange = phone !== (user?.phone || '');
    const hasProfilePictureChange = profilePicture !== (user?.profilePicture || null);
    const hasMarketingChange = marketingOptIn !== (user?.marketingOptIn || false);
    
    if (!hasFirstNameChange && !hasLastNameChange && !hasEmailChange && !hasPhoneChange && !hasProfilePictureChange && !hasMarketingChange) {
      toast.info("No changes to save");
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!user) {
      toast.error("Error: Cannot update profile");
      return;
    }

    setIsSaving(true);
    try {
      const response = await authAPI.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        profilePicture: profilePicture || null,
        marketingOptIn,
      });

      if (response.user) {
        // Update user directly from response instead of calling refreshUser
        // This prevents logout if refreshUser fails
        updateUser(response.user);
        toast.success("Profile updated successfully!");
        setShowConfirmModal(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmModal(false);
  };

  if (!user) {
    return null;
  }

  const getUserInitial = () => {
    if (user.firstName) {
      return user.firstName[0]?.toUpperCase() || "U";
    }
    if (user.email) {
      return user.email[0]?.toUpperCase() || "U";
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>

          {/* Profile Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-white text-3xl mb-8 flex items-center gap-3">
              <User className="w-8 h-8" />
              My Profile
            </h1>

            <div className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-500/50 bg-slate-700 flex items-center justify-center aspect-square">
                    {preview ? (
                      <img
                        src={preview}
                        alt={`${firstName} ${lastName}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center rounded-full">
                        <span className="text-white text-4xl font-bold">
                          {getUserInitial()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-cyan-500 hover:bg-cyan-600 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className="text-slate-400 text-sm mt-4">Click camera icon to upload profile picture</p>
              </div>

              {/* First Name Field */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Last Name Field */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full bg-slate-900/50 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Marketing Opt-in */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />
                <label htmlFor="marketing" className="text-slate-300 text-sm">
                  I want to receive marketing emails and updates
                </label>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveClick}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/50"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-white text-xl font-semibold">Confirm Changes</h2>
                </div>
                <button
                  onClick={handleCancelSave}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to update your profile?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Yes, Update
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
