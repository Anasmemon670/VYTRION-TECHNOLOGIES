"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Mail, User, Calendar, X, Loader2 } from "lucide-react";
import { contactAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  isRead: boolean;
  archived: boolean;
  createdAt: string;
}

export function AdminContactMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Wait for auth to complete before fetching messages
    if (authLoading) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await contactAPI.getAll({ limit: 100 });
        setMessages(response.messages || []);
      } catch (err: any) {
        console.error('Error fetching contact messages:', err);
        const status = err.response?.status;
        if (status === 403) {
          setError('Access denied. Please ensure you are logged in as an admin.');
        } else if (status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(err.response?.data?.error || 'Failed to load messages');
        }
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [authLoading]);

  const handleMessageClick = async (message: ContactMessage) => {
    setSelectedMessage(message);
    if (activeTab === "active" && !message.isRead) {
      try {
        await contactAPI.update(message.id, { isRead: true });
        setMessages(messages.map(m =>
          m.id === message.id ? { ...m, isRead: true } : m
        ));
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  const handleReply = () => {
    if (selectedMessage) {
      setShowReplyModal(true);
      setReplyText("");
      setReplySubject(selectedMessage.subject ? `Re: ${selectedMessage.subject}` : "Re: Your inquiry");
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !replySubject.trim()) {
      alert("Please enter both subject and message!");
      return;
    }

    try {
      setUpdating(true);
      await contactAPI.reply(selectedMessage.id, {
        subject: replySubject,
        message: replyText,
      });
      setShowReplyModal(false);
      setReplyText("");
      setReplySubject("");
      alert("Reply sent successfully! The user will see it in their messages.");
    } catch (err: any) {
      console.error('Error sending reply:', err);
      alert(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setUpdating(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedMessage) return;

    try {
      setUpdating(true);
      await contactAPI.update(selectedMessage.id, { archived: true });
      setMessages(messages.map(m =>
        m.id === selectedMessage.id ? { ...m, archived: true } : m
      ));
      setSelectedMessage(null);
      alert("Message archived successfully!");
    } catch (err: any) {
      console.error('Error archiving message:', err);
      alert(err.response?.data?.error || 'Failed to archive message');
    } finally {
      setUpdating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedMessage) return;

    try {
      setUpdating(true);
      await contactAPI.update(selectedMessage.id, { archived: false });
      setMessages(messages.map(m =>
        m.id === selectedMessage.id ? { ...m, archived: false } : m
      ));
      setSelectedMessage(null);
      alert("Message restored successfully!");
    } catch (err: any) {
      console.error('Error restoring message:', err);
      alert(err.response?.data?.error || 'Failed to restore message');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (!selectedMessage || !window.confirm("Are you sure you want to permanently delete this message?")) return;

    try {
      setUpdating(true);
      await contactAPI.delete(selectedMessage.id);
      setMessages(messages.filter(m => m.id !== selectedMessage.id));
      setSelectedMessage(null);
      alert("Message deleted permanently!");
    } catch (err: any) {
      console.error('Error deleting message:', err);
      alert(err.response?.data?.error || 'Failed to delete message');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = messages.filter(m => !m.isRead && !m.archived).length;
  const currentMessages = messages.filter(m => 
    activeTab === "active" ? !m.archived : m.archived
  );

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-white text-3xl mb-2">Contact Messages</h1>
          <p className="text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All messages read'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setActiveTab("active");
              setSelectedMessage(null);
            }}
            className={`px-6 py-3 rounded-lg transition-all ${activeTab === "active"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
          >
            Active Messages ({messages.filter(m => !m.archived).length})
          </button>
          <button
            onClick={() => {
              setActiveTab("archived");
              setSelectedMessage(null);
            }}
            className={`px-6 py-3 rounded-lg transition-all ${activeTab === "archived"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
          >
            Archived ({messages.filter(m => m.archived).length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Messages List */}
            <div className="space-y-4">
              {currentMessages.length === 0 ? (
                <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                  <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {activeTab === "active" ? "No active messages" : "No archived messages"}
                  </p>
                </div>
              ) : (
                currentMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => handleMessageClick(message)}
                    className={`bg-slate-800 rounded-xl p-5 cursor-pointer hover:bg-slate-700 transition-all border ${!message.isRead ? 'border-l-4 border-l-cyan-500 border-t-slate-700 border-r-slate-700 border-b-slate-700' : 'border-slate-700'
                      } ${selectedMessage?.id === message.id ? 'ring-2 ring-cyan-500' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white">{message.name}</h3>
                          <p className="text-slate-400 text-sm">{message.email}</p>
                        </div>
                      </div>
                      {!message.isRead && (
                        <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    <h4 className="text-white mb-2">{message.subject || 'No subject'}</h4>
                    <p className="text-slate-400 text-sm line-clamp-2">{message.message}</p>

                    <div className="flex items-center gap-2 mt-3 text-slate-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      {formatDate(message.createdAt)}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          {/* Message Detail */}
          <div className="lg:sticky lg:top-24 h-fit">
            {selectedMessage ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg">{selectedMessage.name}</h3>
                      <p className="text-slate-400 text-sm flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {selectedMessage.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-slate-400 hover:text-white transition-colors lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Subject:</p>
                    <h2 className="text-white text-xl">{selectedMessage.subject}</h2>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-2">Message:</p>
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <p className="text-slate-200 leading-relaxed">{selectedMessage.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-sm pt-4 border-t border-slate-700">
                    <Calendar className="w-4 h-4" />
                    Received on {formatDate(selectedMessage.createdAt)}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  {activeTab === "active" ? (
                    <>
                      <button
                        onClick={handleReply}
                        disabled={updating}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all"
                      >
                        Reply
                      </button>
                      <button
                        onClick={handleArchive}
                        disabled={updating}
                        className="px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 py-3 rounded-lg transition-all"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Archive'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleRestore}
                        disabled={updating}
                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Restore'}
                      </button>
                      <button
                        onClick={handleDeletePermanently}
                        disabled={updating}
                        className="px-6 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Select a message to view details</p>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-96">
            <h2 className="text-white text-xl mb-4">Reply to {selectedMessage?.name}</h2>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">Subject</label>
              <input
                type="text"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="w-full bg-slate-700/50 rounded-lg p-3 border border-slate-600 text-slate-200"
                placeholder="Subject"
              />
            </div>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">Message</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full h-32 bg-slate-700/50 rounded-lg p-4 border border-slate-600 text-slate-200 leading-relaxed"
                placeholder="Type your reply here..."
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={handleSendReply}
                disabled={updating}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-white py-3 px-6 rounded-lg transition-all flex items-center gap-2"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                Send
              </button>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText("");
                  setReplySubject("");
                }}
                disabled={updating}
                className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-300 py-3 px-6 rounded-lg transition-all"
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

export default AdminContactMessagesPage;