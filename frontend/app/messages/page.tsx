"use client";

import { motion } from "motion/react";
import { MessageSquare, Mail, Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { messagesAPI } from "@/lib/api";

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

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await messagesAPI.getAll({ limit: 50 });
                setMessages(response.messages || []);
            } catch (err: any) {
                console.error('Error fetching messages:', err);
                if (err.response?.status === 401) {
                    setError('Please log in to view messages');
                } else {
                    setError(err.response?.data?.error || 'Failed to load messages');
                }
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, []);

    const handleMessageClick = async (msg: Message) => {
        setSelectedMessage(msg);
        // Mark as read if not already read
        if (!msg.isRead) {
            try {
                await messagesAPI.update(msg.id, { isRead: true });
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            } catch (err) {
                console.error('Error marking message as read:', err);
            }
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

    return (
        <div className="min-h-screen bg-slate-950 pt-8 pb-12">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-cyan-400" />
                        Messages
                    </h1>
                    <p className="text-slate-400">View and manage your communications with support and admins.</p>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col md:flex-row h-[700px]">

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
                                <div className="p-8 text-center text-red-400">
                                    <p>{error}</p>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>{searchQuery ? 'No messages match your search.' : 'No messages yet.'}</p>
                                </div>
                            ) : (
                                filteredMessages.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleMessageClick(msg)}
                                    className={`w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex gap-4 ${selectedMessage?.id === msg.id ? 'bg-slate-800/80 border-l-4 border-l-cyan-500' : 'border-l-4 border-l-transparent'} ${!msg.isRead ? 'bg-slate-800/30' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold">
                                        {getInitials(msg.sender)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-semibold truncate ${!msg.isRead ? 'text-white' : 'text-slate-300'}`}>
                                                {msg.sender}
                                            </h3>
                                            <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{formatDate(msg.createdAt)}</span>
                                        </div>
                                        <p className={`text-sm truncate mb-1 ${!msg.isRead ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                                            {msg.subject}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {msg.message}
                                        </p>
                                    </div>
                                    {!msg.isRead && (
                                        <div className="self-center">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                        </div>
                                    )}
                                </button>
                            )))}
                        </div>
                    </div>

                    {/* Message Content */}
                    <div className={`${selectedMessage ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-900/50`}>
                        {selectedMessage ? (
                            <>
                                {/* Message Header */}
                                <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setSelectedMessage(null)}
                                            className="md:hidden text-slate-400 hover:text-white mr-2"
                                        >
                                            ←
                                        </button>
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                            {getInitials(selectedMessage.sender)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{selectedMessage.subject}</h2>
                                            <p className="text-cyan-400">{selectedMessage.sender}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-slate-500">{formatDate(selectedMessage.createdAt)}</span>
                                </div>

                                {/* Message Body */}
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {selectedMessage.message}
                                    </div>
                                </div>

                                {/* Reply Box */}
                                <div className="p-6 border-t border-slate-800 bg-slate-900">
                                    <div className="flex gap-4">
                                        <textarea
                                            placeholder="Type a reply..."
                                            className="flex-1 bg-slate-800 text-white rounded-xl p-4 border border-slate-700 focus:outline-none focus:border-cyan-500 transition-colors resize-none h-24"
                                        ></textarea>
                                        <button className="self-end bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </>
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
        </div>
    );
}
