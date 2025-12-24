"use client";

import { motion } from "motion/react";
import { MessageSquare, Mail, Search, Loader2, Send, Trash2, X, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { messagesAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";

interface Message {
    id: string;
    sender: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface ConversationMessage {
    id: string;
    sender: string;
    subject: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export default function MessagesPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [conversation, setConversation] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<ConversationMessage | null>(null);
    const [deleteForEveryone, setDeleteForEveryone] = useState(false);
    const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await messagesAPI.getAll({ limit: 50 });
                const fetchedMessages = response.messages || [];
                // Filter out any deleted messages (extra safety layer)
                const filteredMessages = fetchedMessages.filter((m: Message) => !deletedMessageIds.has(m.id));
                setMessages(filteredMessages);
            } catch (err: any) {
                console.error('Error fetching messages:', err);
                const status = err.response?.status;
                const errorMessage = err.response?.data?.error || err.message || 'Failed to load messages';
                
                if (status === 401) {
                    setError('Please log in to view messages');
                } else if (status === 500) {
                    setError('Server error. Please try again later or contact support if the problem persists.');
                } else if (status === 429) {
                    setError('Too many requests. Please wait a moment and try again.');
                } else {
                    setError(errorMessage);
                }
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only fetch once on mount, deletedMessageIds will be handled in refresh

    // Auto-refresh conversation every 5 seconds when a message is selected
    useEffect(() => {
        if (!selectedMessage) return;

        const interval = setInterval(async () => {
            // Refresh messages list first to get latest data
            try {
                const response = await messagesAPI.getAll({ limit: 50 });
                const updatedMessages = response.messages || [];
                // Filter out deleted messages
                const filteredMessages = updatedMessages.filter((m: Message) => !deletedMessageIds.has(m.id));
                setMessages(filteredMessages);
                // Then fetch conversation with updated messages
                await fetchConversation(selectedMessage.subject, filteredMessages);
            } catch (err) {
                console.error('Error refreshing messages:', err);
                // If refresh fails, still try to fetch conversation with current messages
                fetchConversation(selectedMessage.subject);
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [selectedMessage, deletedMessageIds]);

    // Auto-scroll to bottom when conversation updates
    useEffect(() => {
        if (conversation.length > 0) {
            setTimeout(() => {
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
        }
    }, [conversation]);

    const fetchConversation = async (subject: string, messagesToUse?: Message[]) => {
        try {
            setLoadingConversation(true);
            // Use provided messages or current state
            const messagesList = messagesToUse || messages;
            
            // Get all messages with the same subject (conversation thread)
            // Filter out deleted messages
            const baseSubject = subject.replace(/^Re: /i, '').trim();
            const threadMessages = messagesList.filter(msg => {
                const msgSubject = msg.subject.replace(/^Re: /i, '').trim();
                const matchesSubject = msgSubject === baseSubject;
                const notDeleted = !deletedMessageIds.has(msg.id);
                return matchesSubject && notDeleted;
            });
            
            // Sort by creation date
            const sortedMessages = [...threadMessages].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            // Mark all unread admin messages in this thread as read when viewing conversation
            const unreadAdminMessages = sortedMessages.filter(msg => !msg.isRead && msg.sender === 'Admin');
            if (unreadAdminMessages.length > 0) {
                try {
                    await Promise.all(
                        unreadAdminMessages.map(msg => 
                            messagesAPI.update(msg.id, { isRead: true })
                        )
                    );
                    
                    // Update local state
                    setMessages(prev => prev.map(m => {
                        if (unreadAdminMessages.some(um => um.id === m.id)) {
                            return { ...m, isRead: true };
                        }
                        return m;
                    }));
                    
                    // Dispatch event to update header notification
                    window.dispatchEvent(new CustomEvent('messageRead'));
                } catch (err) {
                    console.error('Error marking admin messages as read:', err);
                }
            }
            
            // Convert to ConversationMessage format
            const conversationMessages: ConversationMessage[] = sortedMessages.map(msg => ({
                id: msg.id,
                sender: msg.sender,
                subject: msg.subject,
                message: msg.message,
                createdAt: msg.createdAt,
                isRead: msg.isRead,
            }));
            
            setConversation(conversationMessages);
            
            // Auto-scroll to bottom when conversation loads
            setTimeout(() => {
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
            
            // Auto-scroll to bottom when conversation loads
            setTimeout(() => {
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
        } catch (err: any) {
            console.error('Error fetching conversation:', err);
            // If conversation fetch fails, at least show the selected message
            if (selectedMessage) {
                setConversation([{
                    id: selectedMessage.id,
                    sender: selectedMessage.sender,
                    subject: selectedMessage.subject,
                    message: selectedMessage.message,
                    createdAt: selectedMessage.createdAt,
                    isRead: selectedMessage.isRead,
                }]);
            }
        } finally {
            setLoadingConversation(false);
        }
    };

    const handleMessageClick = async (msg: Message) => {
        setSelectedMessage(msg);
        setReplyText(""); // Clear reply text when selecting a message
        setLoadingConversation(true);
        
        // Mark as read if not already read
        if (!msg.isRead) {
            try {
                await messagesAPI.update(msg.id, { isRead: true });
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
                
                // Dispatch event to update header notification
                window.dispatchEvent(new CustomEvent('messageRead'));
            } catch (err) {
                console.error('Error marking message as read:', err);
            }
        }

        // Fetch conversation history
        await fetchConversation(msg.subject);
        setLoadingConversation(false);
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) {
            toast.error("Please enter a message");
            return;
        }

        if (!user) {
            toast.error("Please log in to send messages");
            return;
        }

        try {
            setSending(true);
            const subject = selectedMessage 
                ? `Re: ${selectedMessage.subject.replace(/^Re: /i, '')}` 
                : "New Message";
            
            const messageText = replyText.trim();
            setReplyText(""); // Clear input immediately for better UX
            
            const response = await messagesAPI.create({
                subject: subject,
                message: messageText,
            });

            if (response.userMessage) {
                // Immediately add the new message to conversation for instant display
                const newMessage: ConversationMessage = {
                    id: response.userMessage.id,
                    sender: response.userMessage.sender || `${user.firstName} ${user.lastName}`.trim() || user.email || 'User',
                    subject: response.userMessage.subject,
                    message: response.userMessage.message,
                    createdAt: response.userMessage.createdAt,
                    isRead: response.userMessage.isRead || false,
                };
                
                // Add to conversation immediately
                setConversation(prev => {
                    const updated = [...prev, newMessage];
                    // Auto-scroll to bottom after state update
                    setTimeout(() => {
                        const container = document.getElementById('chat-messages-container');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }, 100);
                    return updated;
                });
                
                // Refresh messages to get updated list
                const refreshResponse = await messagesAPI.getAll({ limit: 50 });
                const updatedMessages = refreshResponse.messages || [];
                // Filter out deleted messages
                const filteredMessages = updatedMessages.filter((m: Message) => !deletedMessageIds.has(m.id));
                setMessages(filteredMessages);
                
                // If no message was selected, select the thread now
                if (!selectedMessage) {
                    const threadMessage = filteredMessages.find((m: Message) => 
                        m.id === response.userMessage.id
                    );
                    if (threadMessage) {
                        setSelectedMessage(threadMessage);
                        // Fetch full conversation for this thread with filtered messages (excluding deleted)
                        await fetchConversation(threadMessage.subject, filteredMessages);
                        // Auto-scroll after conversation loads
                        setTimeout(() => {
                            const container = document.getElementById('chat-messages-container');
                            if (container) {
                                container.scrollTop = container.scrollHeight;
                            }
                        }, 200);
                    }
                } else {
                    // Keep selectedMessage and update conversation directly without calling fetchConversation
                    // This prevents the chat from disappearing
                    const baseSubject = selectedMessage.subject.replace(/^Re: /i, '').trim();
                    const threadMessages = filteredMessages.filter((m: Message) => {
                        const mSubject = m.subject.replace(/^Re: /i, '').trim();
                        return mSubject === baseSubject && !deletedMessageIds.has(m.id);
                    });
                    
                    // Update conversation with all messages from the thread (including the new one)
                    const sortedMessages = [...threadMessages].sort((a, b) => 
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                    
                    const conversationMessages: ConversationMessage[] = sortedMessages.map(msg => ({
                        id: msg.id,
                        sender: msg.sender,
                        subject: msg.subject,
                        message: msg.message,
                        createdAt: msg.createdAt,
                        isRead: msg.isRead,
                    }));
                    
                    // Update conversation directly - this keeps the chat visible
                    setConversation(conversationMessages);
                    
                    // Update selectedMessage to the latest message in thread to keep it in sync
                    const latestMessage = sortedMessages[sortedMessages.length - 1];
                    if (latestMessage && latestMessage.id !== selectedMessage.id) {
                        setSelectedMessage(latestMessage);
                    }
                    
                    // Auto-scroll after conversation updates
                    setTimeout(() => {
                        const container = document.getElementById('chat-messages-container');
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }, 50);
                }
                
                toast.success("Message sent successfully!");
            } else {
                toast.error("Failed to send message");
            }
        } catch (err: any) {
            console.error('Error sending message:', err);
            toast.error(err.response?.data?.error || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleDeleteClick = (msg: ConversationMessage, e: React.MouseEvent) => {
        e.stopPropagation();
        setMessageToDelete(msg);
        setDeleteForEveryone(false); // Reset to default
        setShowDeleteModal(true);
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setMessageToDelete(null);
        setDeleteForEveryone(false);
    };

    const handleDeletePermanently = async () => {
        if (!messageToDelete) return;

        const deletedMessageId = messageToDelete.id;
        const deletedMessageSubject = messageToDelete.subject;

        try {
            setDeletingId(deletedMessageId);
            await messagesAPI.delete(deletedMessageId, deleteForEveryone);
            
            // Add to deleted messages set to prevent it from showing again
            setDeletedMessageIds(prev => new Set(prev).add(deletedMessageId));
            
            // Immediately remove from conversation for instant UI update
            setConversation(prev => prev.filter(m => m.id !== deletedMessageId));
            
            // Refresh messages list from API to ensure sync (API will filter deleted messages)
            const refreshResponse = await messagesAPI.getAll({ limit: 50 });
            const updatedMessages = refreshResponse.messages || [];
            // Also filter out deleted messages locally as backup
            const filteredMessages = updatedMessages.filter((m: Message) => !deletedMessageIds.has(m.id) && m.id !== deletedMessageId);
            setMessages(filteredMessages);
            
            // If the deleted message was the selected one, check if there are other messages in the thread
            if (selectedMessage?.id === deletedMessageId) {
                const baseSubject = selectedMessage.subject.replace(/^Re: /i, '').trim();
                const remainingMessages = filteredMessages.filter((m: Message) => {
                    const mSubject = m.subject.replace(/^Re: /i, '').trim();
                    return mSubject === baseSubject && !deletedMessageIds.has(m.id) && m.id !== deletedMessageId;
                });
                
                if (remainingMessages.length > 0) {
                    // Select the latest remaining message in the thread
                    const latestMessage = remainingMessages.sort((a: Message, b: Message) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                    setSelectedMessage(latestMessage);
                    // Fetch conversation with filtered messages (excluding deleted)
                    await fetchConversation(latestMessage.subject, filteredMessages);
                } else {
                    // No more messages in this thread
                    setSelectedMessage(null);
                    setConversation([]);
                }
            } else {
                // If message was deleted from conversation but not the selected one, refresh conversation
                if (selectedMessage) {
                    await fetchConversation(selectedMessage.subject, filteredMessages);
                }
            }
            
            setShowDeleteModal(false);
            setMessageToDelete(null);
            setDeleteForEveryone(false);
            toast.success(deleteForEveryone ? "Message deleted for everyone" : "Message deleted for you");
        } catch (err: any) {
            console.error('Error deleting message:', err);
            toast.error(err.response?.data?.error || "Failed to delete message");
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
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

    const getInitials = (sender: string) => {
        return sender.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredMessages = messages.filter(msg => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return msg.subject.toLowerCase().includes(query) || 
               msg.message.toLowerCase().includes(query) ||
               msg.sender.toLowerCase().includes(query);
    });

    // Group messages by subject (thread) - show only the latest message from each thread
    const getLatestMessageFromThread = (subject: string) => {
        const baseSubject = subject.replace(/^Re: /i, '').trim();
        const threadMessages = messages.filter(msg => {
            const msgSubject = msg.subject.replace(/^Re: /i, '').trim();
            return msgSubject === baseSubject;
        });
        return threadMessages.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
    };

    // Get unique threads
    const uniqueThreads = Array.from(
        new Set(messages.map(msg => msg.subject.replace(/^Re: /i, '').trim()))
    ).map(baseSubject => {
        const threadMessages = messages.filter(msg => {
            const msgSubject = msg.subject.replace(/^Re: /i, '').trim();
            return msgSubject === baseSubject;
        });
        return threadMessages.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
    }).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filteredThreads = uniqueThreads.filter(msg => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return msg.subject.toLowerCase().includes(query) || 
               msg.message.toLowerCase().includes(query) ||
               msg.sender.toLowerCase().includes(query);
    });

    return (
        <div className="min-h-screen bg-slate-950 pt-8 pb-20 sm:pb-24">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-cyan-400" />
                        Messages
                    </h1>
                    <p className="text-slate-400">View and manage your communications with support and admins.</p>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col md:flex-row mb-8 sm:mb-12" style={{ height: '500px', maxHeight: '500px' }}>

                    {/* Sidebar / Message List */}
                    <div className={`${selectedMessage ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-1/3 border-r border-slate-800`}>
                        {/* Search */}
                        <div className="p-4 border-b border-slate-800">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-cyan-500" />
                                    <p>Loading messages...</p>
                                </div>
                            ) : error ? (
                                <div className="p-8 text-center">
                                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md mx-auto">
                                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                                        <p className="text-red-400 mb-4">{error}</p>
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                const fetchMessages = async () => {
                                                    try {
                                                        setLoading(true);
                                                        const response = await messagesAPI.getAll({ limit: 50 });
                                                        setMessages(response.messages || []);
                                                    } catch (err: any) {
                                                        const status = err.response?.status;
                                                        const errorMessage = err.response?.data?.error || err.message || 'Failed to load messages';
                                                        
                                                        if (status === 401) {
                                                            setError('Please log in to view messages');
                                                        } else if (status === 500) {
                                                            setError('Server error. Please try again later or contact support if the problem persists.');
                                                        } else if (status === 429) {
                                                            setError('Too many requests. Please wait a moment and try again.');
                                                        } else {
                                                            setError(errorMessage);
                                                        }
                                                        setMessages([]);
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                };
                                                fetchMessages();
                                            }}
                                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>{searchQuery ? 'No messages match your search.' : 'No messages yet.'}</p>
                                </div>
                            ) : (
                                filteredThreads.map((msg) => {
                                    const baseSubject = msg.subject.replace(/^Re: /i, '').trim();
                                    const threadMessages = messages.filter(m => {
                                        const mSubject = m.subject.replace(/^Re: /i, '').trim();
                                        return mSubject === baseSubject;
                                    });
                                    const hasUnread = threadMessages.some(m => !m.isRead);
                                    const isSelected = selectedMessage && selectedMessage.subject.replace(/^Re: /i, '').trim() === baseSubject;
                                    
                                    return (
                                    <div
                                        key={msg.id}
                                        className={`w-full p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex gap-4 ${isSelected ? 'bg-slate-800/80 border-l-4 border-l-cyan-500' : 'border-l-4 border-l-transparent'} ${hasUnread ? 'bg-slate-800/30' : ''}`}
                                    >
                                        <button
                                            onClick={() => handleMessageClick(msg)}
                                            className="flex-1 text-left flex gap-4 min-w-0"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold">
                                                {getInitials(msg.sender)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h3 className={`font-semibold truncate ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
                                                        {msg.sender}
                                                    </h3>
                                                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{formatDate(msg.createdAt)}</span>
                                                </div>
                                                <p className={`text-sm truncate mb-1 ${hasUnread ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                                                    {msg.subject}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {msg.message}
                                                </p>
                                            </div>
                                            {hasUnread && (
                                                <div className="self-center">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                )}))}
                        </div>
                    </div>

                    {/* Chat View */}
                    <div className={`${selectedMessage ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-900/50 min-h-0`}>
                        {selectedMessage ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden"
                                style={{ height: '100%', maxHeight: '100%', minHeight: 0 }}
                            >
                                {/* Chat Header */}
                                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700 flex-shrink-0">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={() => {
                                                setSelectedMessage(null);
                                                setConversation([]);
                                            }}
                                            className="md:hidden text-slate-400 hover:text-white mr-2"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm sm:text-base">
                                                {getInitials(selectedMessage.sender)}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white text-base sm:text-lg font-semibold truncate">{selectedMessage.sender}</h3>
                                            <p className="text-slate-400 text-xs sm:text-sm truncate">
                                                {selectedMessage.subject}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Messages */}
                                <div 
                                    className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/30 custom-scrollbar"
                                    style={{ 
                                        minHeight: 0,
                                        height: '100%',
                                        overflowY: 'auto',
                                        overflowX: 'hidden'
                                    }}
                                    id="chat-messages-container"
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
                                            const isAdmin = msg.sender === 'Admin';
                                            const isUser = !isAdmin; // User messages (not from Admin)
                                            const isFirstMessage = index === 0;
                                            return (
                                                <motion.div
                                                    key={msg.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
                                                >
                                                    <div className={`relative flex items-end gap-2 max-w-[75%] sm:max-w-[65%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <div
                                                            className={`rounded-2xl px-4 py-2.5 ${
                                                                isUser
                                                                    ? 'bg-cyan-500 text-white rounded-tr-sm'
                                                                    : 'bg-slate-700 text-white rounded-tl-sm'
                                                            }`}
                                                        >
                                                            {isAdmin && msg.subject && isFirstMessage && (
                                                                <p className="text-xs font-semibold mb-1 opacity-90 text-slate-200">{msg.subject}</p>
                                                            )}
                                                            <p className={`text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap text-white`}>
                                                                {msg.message}
                                                            </p>
                                                            <div className={`flex items-center gap-1.5 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                                <span className={`text-xs ${isUser ? 'text-white/75' : 'text-slate-300'}`}>
                                                                    {formatTime(msg.createdAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteClick(msg, e)}
                                                            disabled={deletingId === msg.id}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                            title="Delete message"
                                                        >
                                                            {deletingId === msg.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Chat Input */}
                                <div className="p-4 sm:p-5 border-t border-slate-700 flex-shrink-0 bg-slate-800">
                                    <div className="flex gap-2 sm:gap-3">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendReply();
                                                }
                                            }}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600 text-slate-200 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base min-h-[44px] max-h-32"
                                            rows={1}
                                            disabled={sending}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || sending}
                                            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 flex-shrink-0"
                                        >
                                            {sending ? (
                                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    <span className="hidden sm:inline">Send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                                <Mail className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-xl font-medium mb-2">Select a message</h3>
                                <p>Choose a message from the list to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
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

                            <p className="text-slate-300 text-sm sm:text-base mb-4">
                                How would you like to delete this message?
                            </p>
                            <div className="bg-slate-700/50 rounded-lg p-3 mb-4 sm:mb-6">
                                <p className="text-slate-400 text-xs sm:text-sm mb-1">Message:</p>
                                <p className="text-white text-sm sm:text-base break-words">{messageToDelete.message}</p>
                            </div>

                            {/* Delete Options */}
                            <div className="mb-4 sm:mb-6 space-y-3">
                                <button
                                    onClick={() => setDeleteForEveryone(false)}
                                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                        !deleteForEveryone
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            !deleteForEveryone
                                                ? 'border-cyan-500 bg-cyan-500'
                                                : 'border-slate-500'
                                        }`}>
                                            {!deleteForEveryone && (
                                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm sm:text-base">Delete for you</p>
                                            <p className="text-slate-400 text-xs sm:text-sm mt-1">This message will be removed from your view only. Admin can still see it.</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setDeleteForEveryone(true)}
                                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                        deleteForEveryone
                                            ? 'border-red-500 bg-red-500/10'
                                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            deleteForEveryone
                                                ? 'border-red-500 bg-red-500'
                                                : 'border-slate-500'
                                        }`}>
                                            {deleteForEveryone && (
                                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm sm:text-base">Delete for everyone</p>
                                            <p className="text-slate-400 text-xs sm:text-sm mt-1">This message will be removed for both you and admin. This action cannot be undone.</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

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
                                    className={`flex-1 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl border ${
                                        deleteForEveryone
                                            ? 'bg-red-500 hover:bg-red-600 hover:shadow-red-500/30 border-red-600 hover:border-red-500'
                                            : 'bg-cyan-500 hover:bg-cyan-600 hover:shadow-cyan-500/30 border-cyan-600 hover:border-cyan-500'
                                    }`}
                                >
                                    {deletingId === messageToDelete.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>{deleteForEveryone ? 'Delete for Everyone' : 'Delete for You'}</span>
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
