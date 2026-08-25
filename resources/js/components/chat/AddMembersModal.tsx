import React, { useState } from 'react';
import { X, UserPlus, Search, Check, LoaderCircle } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
}

interface AddMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: number;
    existingMemberIds: number[];
    friends: User[];
    onMembersAdded: (updatedConversation: any) => void;
    isDark: boolean;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
    isOpen,
    onClose,
    conversationId,
    existingMemberIds,
    friends,
    onMembersAdded,
    isDark,
}) => {
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter friends who are not yet members
    const eligibleFriends = friends.filter(f => !existingMemberIds.includes(f.id));
    const filteredFriends = eligibleFriends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleMember = (id: number) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUserIds.length === 0) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/web/conversations/${conversationId}/add-members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    user_ids: selectedUserIds,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to add members');
            }

            const data = await res.json();
            onMembersAdded(data.conversation);
            onClose();
        } catch (err: any) {
            console.error('Error adding members:', err);
            setError(err.message || 'Failed to add members');
        } finally {
            setIsSubmitting(false);
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
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Add Group Members</h3>
                            <p className="text-[11px] text-neutral-400">Select contacts to invite</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative flex h-9 w-full items-center rounded-xl border dark:border-white/8 border-neutral-200 dark:bg-white/[0.02] bg-neutral-50 px-3">
                        <Search className="h-3.5 w-3.5 text-neutral-400 mr-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-xs outline-none border-none dark:text-white text-neutral-800 placeholder-neutral-400 p-0 focus:ring-0"
                        />
                    </div>

                    {/* Eligible Contacts List */}
                    <div className={`max-h-60 overflow-y-auto custom-scrollbar border rounded-xl p-1.5 space-y-1 ${
                        isDark ? 'border-white/5 bg-black/20' : 'border-neutral-200 bg-neutral-50/50'
                    }`}>
                        {filteredFriends.length === 0 ? (
                            <div className="py-8 text-center text-neutral-400 text-xs">
                                {eligibleFriends.length === 0
                                    ? 'All your contacts are already in this group.'
                                    : 'No contacts matching your search.'}
                            </div>
                        ) : (
                            filteredFriends.map(friend => {
                                const isSelected = selectedUserIds.includes(friend.id);
                                return (
                                    <div
                                        key={`add-member-${friend.id}`}
                                        onClick={() => toggleMember(friend.id)}
                                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
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
                                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? 'bg-[#2788E8] border-[#2788E8] text-white'
                                                    : 'border-neutral-400 dark:border-white/20'
                                            }`}
                                        >
                                            {isSelected && <Check className="h-3.5 w-3.5" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || selectedUserIds.length === 0}
                        className="h-11 w-full bg-[#2788E8] hover:bg-[#1f73c7] text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <span>Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length}) ` : ''}Members</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
