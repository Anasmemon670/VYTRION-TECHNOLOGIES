"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { Mail, User, Calendar, X, Loader2, Trash2, AlertTriangle, Send, Check, CheckCheck, Archive, ArchiveRestore } from "lucide-react";
import { AnimatePresence } from "motion/react";
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

interface ConversationMessage {
  id: string;
  type: 'user' | 'admin';
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: string;
  status: 'SENT' | 'SEEN' | null;
  seenAt: string | null;
}

export function AdminContactMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);

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

  // Auto-refresh conversation every 2 seconds for real-time updates (silent refresh like WhatsApp)
  useEffect(() => {
    if (!selectedMessage) return;

    const interval = setInterval(async () => {
      // Silent refresh - no loading indicator, just update data in background
      // Use functional updates to access latest state without dependencies
      try {
        // Refresh conversation silently (without showing loading)
        const conversationResponse = await contactAPI.getConversation(selectedMessage.id);
        const newConversation = conversationResponse.conversation || [];
        
        // Update conversation using functional update to compare with latest state
        setConversation(prevConversation => {
          // Only update if conversation actually changed
          const currentIds = new Set<string>(prevConversation.map((m: ConversationMessage) => m.id));
          const newIds = new Set<string>(newConversation.map((m: ConversationMessage) => m.id));
          const hasChanges = newConversation.length !== prevConversation.length || 
                            Array.from<string>(newIds).some((id: string) => !currentIds.has(id));
          
          if (hasChanges) {
            // Auto-scroll to bottom if there are new messages
            setTimeout(() => {
              const container = document.getElementById('admin-chat-messages-container');
              if (container) {
                container.scrollTop = container.scrollHeight;
              }
            }, 100);
            return newConversation;
          }
          return prevConversation; // No changes, return previous state
        });
        
        // Also refresh messages list silently
        const messagesResponse = await contactAPI.getAll({ limit: 100 });
        const newMessages = messagesResponse.messages || [];
        
        // Update messages using functional update
        setMessages(prevMessages => {
          // Only update if messages actually changed
          const currentMessageIds = new Set<string>(prevMessages.map((m: ContactMessage) => m.id));
          const newMessageIds = new Set<string>(newMessages.map((m: ContactMessage) => m.id));
          const messagesChanged = newMessages.length !== prevMessages.length || 
                                Array.from<string>(newMessageIds).some((id: string) => !currentMessageIds.has(id));
          
          return messagesChanged ? newMessages : prevMessages;
        });
      } catch (err) {
        // Silently fail - don't show errors for background refresh
        console.error('Error refreshing (silent):', err);
      }
    }, 2000); // Refresh every 2 seconds silently

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessage?.id]); // Only depend on message ID to avoid infinite loops

  const fetchConversation = async (messageId: string, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoadingConversation(true);
      }
      const response = await contactAPI.getConversation(messageId);
      const newConversation = response.conversation || [];
      
      // Check if conversation has new messages (compare by length or IDs)
      const currentIds = new Set<string>(conversation.map((m: ConversationMessage) => m.id));
      const newIds = new Set<string>(newConversation.map((m: ConversationMessage) => m.id));
      const hasNewMessages = newConversation.length > conversation.length || 
                            Array.from<string>(newIds).some((id: string) => !currentIds.has(id));
      
      setConversation(newConversation);
      
      // Auto-scroll to bottom if there are new messages
      if (hasNewMessages) {
        setTimeout(() => {
          const container = document.getElementById('admin-chat-messages-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      }
    } catch (err: any) {
      console.error('Error fetching conversation:', err);
      // If conversation fetch fails, at least show the original message
      const msg = messages.find((m: ContactMessage) => m.id === messageId);
      if (msg) {
        setConversation([{
          id: msg.id,
          type: 'user',
          name: msg.name,
          email: msg.email,
          subject: msg.subject || null,
          message: msg.message,
          createdAt: msg.createdAt,
          status: null,
          seenAt: null,
        }]);
      }
    } finally {
      if (showLoading) {
        setLoadingConversation(false);
      }
    }
  };

  const handleMessageClick = async (groupedMsg: GroupedMessage) => {
    // Use the latest message as the selected message
    const latestMessage = groupedMsg.latestMessage;
    setSelectedMessage(latestMessage);
    setLoadingConversation(true);
    
    // Mark all unread messages from this user as read
    if (activeTab === "active" && groupedMsg.unreadCount > 0) {
      try {
        const unreadMessages = groupedMsg.messages.filter(m => !m.isRead);
        await Promise.all(
          unreadMessages.map(msg => contactAPI.update(msg.id, { isRead: true }))
        );
        setMessages(messages.map(m =>
          groupedMsg.messages.some(gm => gm.id === m.id && !m.isRead) ? { ...m, isRead: true } : m
        ));
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    }

    // Fetch conversation history using the latest message ID
    // This will get all messages from this user
    await fetchConversation(latestMessage.id);
    setLoadingConversation(false);
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
      return;
    }

    const messageText = replyText.trim();
    const subjectText = replySubject.trim();
    
    // Clear inputs immediately for better UX
    setReplyText("");
    setReplySubject("");
    setShowReplyModal(false);

    try {
      setSendingReply(true);
      const response = await contactAPI.reply(selectedMessage.id, {
        subject: subjectText,
        message: messageText,
      });
      
      // Immediately add admin reply to conversation for instant display
      if (response.userMessage) {
        const newAdminMessage: ConversationMessage = {
          id: response.userMessage.id,
          type: 'admin',
          name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Admin',
          email: user?.email || '',
          subject: response.userMessage.subject,
          message: response.userMessage.message,
          createdAt: response.userMessage.createdAt,
          status: response.userMessage.status || 'SENT',
          seenAt: response.userMessage.seenAt || null,
        };
        
        // Add to conversation immediately
        setConversation(prev => {
          const updated = [...prev, newAdminMessage];
          // Auto-scroll to bottom
          setTimeout(() => {
            const container = document.getElementById('admin-chat-messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
          return updated;
        });
      }
      
      // Refresh conversation after a short delay to get any new user replies
      setTimeout(async () => {
        if (selectedMessage) {
          await fetchConversation(selectedMessage.id);
        }
      }, 500);
      
    } catch (err: any) {
      console.error('Error sending reply:', err);
      // Restore inputs on error
      setReplyText(messageText);
      setReplySubject(subjectText);
      setShowReplyModal(true);
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendInlineReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      return;
    }

    const subject = selectedMessage.subject ? `Re: ${selectedMessage.subject}` : "Re: Your inquiry";
    const messageText = replyText.trim();
    
    // Clear input immediately for better UX
    setReplyText("");

    try {
      setSendingReply(true);
      const response = await contactAPI.reply(selectedMessage.id, {
        subject: subject,
        message: messageText,
      });
      
      // Immediately add admin reply to conversation for instant display
      if (response.userMessage) {
        const newAdminMessage: ConversationMessage = {
          id: response.userMessage.id,
          type: 'admin',
          name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Admin',
          email: user?.email || '',
          subject: response.userMessage.subject,
          message: response.userMessage.message,
          createdAt: response.userMessage.createdAt,
          status: response.userMessage.status || 'SENT',
          seenAt: response.userMessage.seenAt || null,
        };
        
        // Add to conversation immediately
        setConversation(prev => {
          const updated = [...prev, newAdminMessage];
          // Auto-scroll to bottom
          setTimeout(() => {
            const container = document.getElementById('admin-chat-messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
          return updated;
        });
      }
      
      // Refresh conversation after a short delay to get any new user replies
      setTimeout(async () => {
        if (selectedMessage) {
          await fetchConversation(selectedMessage.id);
        }
      }, 500);
      
    } catch (err: any) {
      console.error('Error sending reply:', err);
      // Restore reply text on error
      setReplyText(messageText);
    } finally {
      setSendingReply(false);
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
      setConversation([]);
    } catch (err: any) {
      console.error('Error archiving message:', err);
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
      setConversation([]);
    } catch (err: any) {
      console.error('Error restoring message:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (message: ContactMessage) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
  };

  const handleDeletePermanently = async () => {
    if (!messageToDelete) return;

    try {
      setDeletingId(messageToDelete.id);
      await contactAPI.delete(messageToDelete.id);
      setMessages(messages.filter(m => m.id !== messageToDelete.id));
      if (selectedMessage?.id === messageToDelete.id) {
        setSelectedMessage(null);
      }
      setShowDeleteModal(false);
      setMessageToDelete(null);
    } catch (err: any) {
      console.error('Error deleting message:', err);
    } finally {
      setDeletingId(null);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const MessageStatusIcon = ({ status }: { status: 'SENT' | 'SEEN' | null }) => {
    if (status === 'SEEN') {
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    } else if (status === 'SENT') {
      return <Check className="w-3 h-3 text-slate-400" />;
    }
    return null;
  };

  const unreadCount = messages.filter(m => !m.isRead && !m.archived).length;
  const currentMessages = messages.filter(m => 
    activeTab === "active" ? !m.archived : m.archived
  );

  // Group messages by email (user) - WhatsApp style
  interface GroupedMessage {
    email: string;
    name: string;
    messages: ContactMessage[];
    latestMessage: ContactMessage;
    unreadCount: number;
    latestMessageId: string;
  }

  const groupedMessages = currentMessages.reduce((acc, message) => {
    const email = message.email.toLowerCase();
    if (!acc[email]) {
      acc[email] = {
        email: message.email,
        name: message.name,
        messages: [],
        latestMessage: message,
        unreadCount: 0,
        latestMessageId: message.id,
      };
    }
    acc[email].messages.push(message);
    // Update latest message if this one is newer
    if (new Date(message.createdAt) > new Date(acc[email].latestMessage.createdAt)) {
      acc[email].latestMessage = message;
      acc[email].latestMessageId = message.id;
    }
    // Count unread messages
    if (!message.isRead) {
      acc[email].unreadCount++;
    }
    return acc;
  }, {} as Record<string, GroupedMessage>);

  const groupedMessagesList = Object.values(groupedMessages).sort((a, b) => {
    // Sort by latest message date (newest first)
    return new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime();
  });

  return (
    <AdminLayout>
      <div>
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-white text-2xl sm:text-3xl mb-1 sm:mb-2">Contact Messages</h1>
          <p className="text-slate-400 text-sm sm:text-base">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Messages List */}
            <div className="space-y-4">
              {groupedMessagesList.length === 0 ? (
                <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                  <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {activeTab === "active" ? "No active messages" : "No archived messages"}
                  </p>
                </div>
              ) : (
                groupedMessagesList.map((groupedMsg, index) => {
                  const latestMsg = groupedMsg.latestMessage;
                  const isSelected = selectedMessage?.email?.toLowerCase() === groupedMsg.email.toLowerCase();
                  return (
                    <motion.div
                      key={groupedMsg.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`bg-slate-800 rounded-xl p-4 sm:p-5 hover:bg-slate-700 transition-all border ${groupedMsg.unreadCount > 0 ? 'border-l-4 border-l-cyan-500 border-t-slate-700 border-r-slate-700 border-b-slate-700' : 'border-slate-700'
                        } ${isSelected ? 'ring-2 ring-cyan-500' : ''}`}
                    >
                      <div 
                        onClick={() => handleMessageClick(groupedMsg)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-white text-sm sm:text-base truncate">{groupedMsg.name}</h3>
                              <p className="text-slate-400 text-xs sm:text-sm truncate">{groupedMsg.email}</p>
                            </div>
                          </div>
                          {groupedMsg.unreadCount > 0 && (
                            <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                              {groupedMsg.unreadCount > 1 ? `${groupedMsg.unreadCount}` : 'New'}
                            </span>
                          )}
                        </div>

                        <h4 className="text-white text-sm sm:text-base mb-2 break-words">{latestMsg.subject || 'No subject'}</h4>
                        <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 break-words">{latestMsg.message}</p>

                        <div className="flex items-center gap-2 mt-3 text-slate-500 text-xs sm:text-sm">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{formatDate(latestMsg.createdAt)}</span>
                          {groupedMsg.messages.length > 1 && (
                            <span className="text-slate-500 text-xs">({groupedMsg.messages.length} messages)</span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(latestMsg);
                          }}
                          disabled={deletingId === latestMsg.id}
                          className="w-full sm:w-auto bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

          {/* WhatsApp-style Chat View */}
          <div className="lg:sticky lg:top-24 flex flex-col" style={{ height: '500px', maxHeight: '500px' }}>
            {selectedMessage ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700 flex-shrink-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white text-base sm:text-lg font-semibold truncate">{selectedMessage.name}</h3>
                      <p className="text-slate-400 text-xs sm:text-sm truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{selectedMessage.email}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeTab === "active" ? (
                      <button
                        onClick={handleArchive}
                        disabled={updating}
                        className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg transition-all"
                        title="Archive"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleRestore}
                          disabled={updating}
                          className="p-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 rounded-lg transition-all"
                          title="Restore"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(selectedMessage)}
                          disabled={updating}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedMessage(null);
                        setConversation([]);
                      }}
                      className="text-slate-400 hover:text-white transition-colors lg:hidden p-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div 
                  id="admin-chat-messages-container"
                  className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/30 min-h-0 custom-scrollbar"
                  style={{ maxHeight: '100%' }}
                >
                  {loadingConversation ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                    </div>
                  ) : conversation.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-400">No messages yet</p>
                    </div>
                  ) : (
                    conversation.map((msg, index) => {
                      const isAdmin = msg.type === 'admin';
                      const isFirstMessage = index === 0;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 ${
                              isAdmin
                                ? 'bg-cyan-500 text-white rounded-tr-sm'
                                : 'bg-slate-700 text-white rounded-tl-sm'
                            }`}
                          >
                            {!isAdmin && msg.subject && isFirstMessage && (
                              <p className="text-xs font-semibold mb-1 opacity-90 text-slate-200">{msg.subject}</p>
                            )}
                            <p className={`text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap ${
                              isAdmin ? 'text-white' : 'text-white'
                            }`}>
                              {msg.message}
                            </p>
                            <div className={`flex items-center gap-1.5 mt-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-xs ${isAdmin ? 'text-white/75' : 'text-slate-300'}`}>
                                {formatTime(msg.createdAt)}
                              </span>
                              {isAdmin && (
                                <MessageStatusIcon status={msg.status} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input (only for active messages) */}
                {activeTab === "active" && (
                  <div className="p-4 sm:p-5 border-t border-slate-700 flex-shrink-0 bg-slate-800">
                    <div className="flex gap-2 sm:gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendInlineReply();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600 text-slate-200 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base min-h-[44px] max-h-32"
                        rows={1}
                      />
                      <button
                        onClick={handleSendInlineReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        {sendingReply ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700 flex items-center justify-center h-full">
                <div>
                  <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Select a message to start chatting</p>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
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

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && messageToDelete && (
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
                  <h2 className="text-white text-lg sm:text-xl font-semibold">Delete Message</h2>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 text-sm sm:text-base mb-2">
                Are you sure you want to permanently delete this message?
              </p>
              <p className="text-white font-semibold mb-1 break-words">
                From: {messageToDelete.name}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6 break-words">
                {messageToDelete.email}
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
                  onClick={handleDeletePermanently}
                  disabled={deletingId === messageToDelete.id}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl hover:shadow-red-500/30 border border-red-600 hover:border-red-500"
                >
                  {deletingId === messageToDelete.id ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Delete Message</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

export default AdminContactMessagesPage;