import React, { useState } from 'react';
import { X, Share2, Search, Send, Check, Users, LoaderCircle } from 'lucide-react';

interface Conversation {
    id: number;
    name?: string;
    type: 'direct' | 'group';
    members: any[];
    avatar_url?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
}

interface ForwardMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    messageToForward: {
        id: number;
        type: string;
        body: string;
        attachments?: any[];
    } | null;
    conversations: Conversation[];
    friends: User[];
    currentUserId: number;
    onForwardSuccess: (targetConversationId: number) => void;
    isDark: boolean;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
    isOpen,
    onClose,
    messageToForward,
    conversations,
    friends,
    currentUserId,
    onForwardSuccess,
    isDark,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
    const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !messageToForward) return null;

    const getChatName = (conv: Conversation): string => {
        if (conv.type === 'group') return conv.name || 'Group Chat';
        const partner = conv.members?.find((m: any) => m.id !== currentUserId);
        return partner ? partner.name : 'Direct Chat';
    };

    const filteredConversations = conversations.filter(c =>
        getChatName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectConversation = (convId: number) => {
        setSelectedConvId(convId);
        setSelectedFriendId(null);
    };

    const handleSelectFriend = (friendId: number) => {
        setSelectedFriendId(friendId);
        setSelectedConvId(null);
    };

    const handleSendForward = async () => {
        if (!selectedConvId && !selectedFriendId) return;

        setIsSending(true);
        setError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            let targetConvId = selectedConvId;

            // If a direct friend was selected without existing active conversation
            if (!targetConvId && selectedFriendId) {
                const startRes = await fetch('/web/conversations/direct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({ friend_id: selectedFriendId }),
                });
                if (!startRes.ok) throw new Error('Failed to start chat with contact');
                const convData = await startRes.json();
                targetConvId = convData.id;
            }

            if (!targetConvId) throw new Error('Invalid conversation selected');

            // Send message to target conversation
            const body = messageToForward.body;
            const res = await fetch('/web/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    conversation_id: targetConvId,
                    type: messageToForward.type || 'text',
                    body: body,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to forward message');
            }

            onForwardSuccess(targetConvId);
            onClose();
        } catch (err: any) {
            console.error('Error forwarding message:', err);
            setError(err.message || 'Failed to forward message');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
                    isDark ? 'border-white/10 bg-[#141414] text-white' : 'border-neutral-200 bg-white text-neutral-900'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-[#2788E8]/15 border border-[#2788E8]/30 flex items-center justify-center text-[#2788E8]">
                            <Share2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Forward Message</h3>
                            <p className="text-[11px] text-neutral-400">Share to another conversation</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Preview of message */}
                <div className="p-4 border-b dark:border-white/5 border-neutral-100 dark:bg-white/[0.01] bg-neutral-50/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">
                        Message Preview
                    </span>
                    <div className={`p-2.5 rounded-xl border text-xs max-h-20 overflow-hidden line-clamp-3 ${
                        isDark ? 'bg-black/30 border-white/5 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                    }`}>
                        {messageToForward.body}
                    </div>
                </div>

                {/* Search & Selection */}
                <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
                    {error && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="relative flex h-9 w-full items-center rounded-xl border dark:border-white/8 border-neutral-200 dark:bg-white/[0.02] bg-neutral-50 px-3">
                        <Search className="h-3.5 w-3.5 text-neutral-400 mr-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search chats or contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-xs outline-none border-none dark:text-white text-neutral-800 placeholder-neutral-400 p-0 focus:ring-0"
                        />
                    </div>

                    <div className={`flex-1 overflow-y-auto custom-scrollbar border rounded-xl p-1.5 space-y-1 ${
                        isDark ? 'border-white/5 bg-black/20' : 'border-neutral-200 bg-neutral-50/50'
                    }`}>
                        {/* Existing Conversations */}
                        {filteredConversations.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold px-2 py-1 block">
                                    Recent Chats
                                </span>
                                {filteredConversations.map(conv => {
                                    const isSelected = selectedConvId === conv.id;
                                    const name = getChatName(conv);
                                    return (
                                        <div
                                            key={`forward-conv-${conv.id}`}
                                            onClick={() => handleSelectConversation(conv.id)}
                                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-[#2788E8]/10 border-[#2788E8]/40 text-white'
                                                    : 'border-transparent hover:bg-neutral-200/50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2788E8]/40 bg-[#2788E8]/10 text-[#2788E8] font-bold text-xs overflow-hidden shrink-0">
                                                    {conv.type === 'group' ? (
                                                        <Users className="h-4 w-4" />
                                                    ) : (
                                                        name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-xs dark:text-white text-neutral-900 block truncate">
                                                        {name}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 capitalize block">
                                                        {conv.type}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#2788E8] border-[#2788E8] text-white'
                                                        : 'border-neutral-400 dark:border-white/20'
                                                }`}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Contacts List */}
                        {filteredFriends.length > 0 && (
                            <div className="space-y-1 pt-2">
                                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold px-2 py-1 block">
                                    Contacts
                                </span>
                                {filteredFriends.map(friend => {
                                    const isSelected = selectedFriendId === friend.id;
                                    return (
                                        <div
                                            key={`forward-friend-${friend.id}`}
                                            onClick={() => handleSelectFriend(friend.id)}
                                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-[#2788E8]/10 border-[#2788E8]/40 text-white'
                                                    : 'border-transparent hover:bg-neutral-200/50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2788E8]/40 bg-[#2788E8]/10 text-[#2788E8] font-bold text-xs overflow-hidden shrink-0">
                                                    {friend.avatar_url ? (
                                                        <img src={friend.avatar_url} alt={friend.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        friend.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-xs dark:text-white text-neutral-900 block truncate">
                                                        {friend.name}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 block truncate">
                                                        {friend.email}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#2788E8] border-[#2788E8] text-white'
                                                        : 'border-neutral-400 dark:border-white/20'
                                                }`}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Send */}
                <div className="p-4 border-t dark:border-white/5 border-neutral-100">
                    <button
                        type="button"
                        onClick={handleSendForward}
                        disabled={isSending || (!selectedConvId && !selectedFriendId)}
                        className="h-11 w-full bg-[#2788E8] hover:bg-[#1f73c7] text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                <span>Forward Message</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
