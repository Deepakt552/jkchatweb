import React, { useState } from 'react';
import { X, Star, Search, CornerUpLeft, Trash2, Image as ImageIcon, FileText, Mic, Calendar } from 'lucide-react';

interface StarredMessageItem {
    id: number;
    conversation_id: number;
    conversation_name?: string;
    sender_id: number;
    sender_name: string;
    type: string;
    body: string;
    created_at: string;
}

interface StarredMessagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    starredMessages: StarredMessageItem[];
    onUnstar: (messageId: number) => void;
    onJumpToMessage: (conversationId: number, messageId: number) => void;
    currentConversationId?: number | null;
    isDark: boolean;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
    isOpen,
    onClose,
    starredMessages,
    onUnstar,
    onJumpToMessage,
    currentConversationId,
    isDark,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterScope, setFilterScope] = useState<'all' | 'current'>('all');

    if (!isOpen) return null;

    const filtered = starredMessages.filter(msg => {
        if (filterScope === 'current' && currentConversationId && msg.conversation_id !== currentConversationId) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                msg.body.toLowerCase().includes(q) ||
                msg.sender_name.toLowerCase().includes(q) ||
                (msg.conversation_name && msg.conversation_name.toLowerCase().includes(q))
            );
        }
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
                    isDark ? 'border-white/10 bg-[#141414] text-white' : 'border-neutral-200 bg-white text-neutral-900'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Star className="h-5 w-5 fill-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Starred Messages</h3>
                            <p className="text-[11px] text-neutral-400">{starredMessages.length} saved bookmarks</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scope & Search Filter Bar */}
                <div className="p-4 border-b dark:border-white/5 border-neutral-100 space-y-3">
                    {currentConversationId && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterScope('all')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                    filterScope === 'all'
                                        ? 'bg-[#2788E8] text-white'
                                        : 'dark:bg-white/5 bg-neutral-100 text-neutral-400 hover:text-white'
                                }`}
                            >
                                All Chats ({starredMessages.length})
                            </button>
                            <button
                                onClick={() => setFilterScope('current')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                    filterScope === 'current'
                                        ? 'bg-[#2788E8] text-white'
                                        : 'dark:bg-white/5 bg-neutral-100 text-neutral-400 hover:text-white'
                                }`}
                            >
                                This Chat ({starredMessages.filter(m => m.conversation_id === currentConversationId).length})
                            </button>
                        </div>
                    )}

                    <div className="relative flex h-9 w-full items-center rounded-xl border dark:border-white/8 border-neutral-200 dark:bg-white/[0.02] bg-neutral-50 px-3">
                        <Search className="h-3.5 w-3.5 text-neutral-400 mr-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search starred messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-xs outline-none border-none dark:text-white text-neutral-800 placeholder-neutral-400 p-0 focus:ring-0"
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400 flex flex-col items-center">
                            <Star className="h-8 w-8 text-neutral-600 mb-2" />
                            <span className="text-xs">No starred messages found.</span>
                            <span className="text-[11px] text-neutral-500 mt-1">Right click any message and choose "Star" to bookmark it.</span>
                        </div>
                    ) : (
                        filtered.map(msg => (
                            <div
                                key={`starred-msg-${msg.id}`}
                                className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                                    isDark
                                        ? 'bg-white/[0.02] border-white/5 hover:border-[#2788E8]/30'
                                        : 'bg-neutral-50 border-neutral-200 hover:border-[#2788E8]/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-[#2788E8] truncate">
                                            {msg.sender_name}
                                        </span>
                                        {msg.conversation_name && (
                                            <span className="text-[10px] text-neutral-500 font-medium truncate">
                                                in {msg.conversation_name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(msg.created_at).toLocaleDateString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs dark:text-neutral-200 text-neutral-800 leading-relaxed break-words">
                                    {msg.type === 'image' || msg.body.includes('Photo') ? (
                                        <span className="flex items-center gap-1.5 text-[#2788E8]">
                                            <ImageIcon className="h-4 w-4" /> Photo attachment
                                        </span>
                                    ) : msg.type === 'audio' || msg.body.includes('voice_') ? (
                                        <span className="flex items-center gap-1.5 text-emerald-400">
                                            <Mic className="h-4 w-4" /> Voice note
                                        </span>
                                    ) : msg.type === 'document' ? (
                                        <span className="flex items-center gap-1.5 text-[#2788E8]">
                                            <FileText className="h-4 w-4" /> Document
                                        </span>
                                    ) : (
                                        msg.body
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t dark:border-white/5 border-neutral-200/60">
                                    <button
                                        onClick={() => {
                                            onJumpToMessage(msg.conversation_id, msg.id);
                                            onClose();
                                        }}
                                        className="text-[11px] text-[#2788E8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        <CornerUpLeft className="h-3 w-3" />
                                        <span>Jump to Message</span>
                                    </button>

                                    <button
                                        onClick={() => onUnstar(msg.id)}
                                        className="text-[11px] text-red-400 hover:text-red-300 font-medium flex items-center gap-1 cursor-pointer"
                                        title="Remove Star"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        <span>Unstar</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
