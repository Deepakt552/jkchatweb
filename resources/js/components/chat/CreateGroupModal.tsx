import React, { useState, useRef } from 'react';
import { X, Users, Camera, Search, Check, LoaderCircle, Sparkles } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    friends: User[];
    onGroupCreated: (conversation: any) => void;
    isDark: boolean;
    compressAndCropImage: (file: File) => Promise<Blob>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isOpen,
    onClose,
    friends,
    onGroupCreated,
    isDark,
    compressAndCropImage,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const toggleMember = (id: number) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter a group name.');
            return;
        }
        if (selectedMemberIds.length === 0) {
            setError('Please select at least one contact to join the group.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/web/conversations/group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    member_ids: selectedMemberIds,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to create group');
            }

            let newConv = await res.json();

            // Update description if provided
            if (description.trim()) {
                await fetch(`/web/conversations/${newConv.id}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({ description: description.trim() }),
                });
            }

            // Upload group avatar if provided
            if (avatarFile) {
                try {
                    const compressedBlob = await compressAndCropImage(avatarFile);
                    const formData = new FormData();
                    formData.append('avatar', compressedBlob, 'avatar.jpg');
                    const avatarRes = await fetch(`/web/conversations/${newConv.id}/avatar`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: formData,
                    });
                    if (avatarRes.ok) {
                        newConv = await avatarRes.json();
                    }
                } catch (avErr) {
                    console.error('Group avatar upload failed:', avErr);
                }
            }

            onGroupCreated(newConv);
            onClose();
        } catch (err: any) {
            console.error('Error creating group:', err);
            setError(err.message || 'Failed to create group');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
                    isDark ? 'border-white/10 bg-[#141414] text-white' : 'border-neutral-200 bg-white text-neutral-900'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-[#2788E8]/15 border border-[#2788E8]/30 flex items-center justify-center text-[#2788E8]">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Create New Group</h3>
                            <p className="text-[11px] text-neutral-400">Collaborate with end-to-end encryption</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Group Icon & Name */}
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div
                            onClick={() => avatarInputRef.current?.click()}
                            className="relative h-18 w-18 rounded-2xl border-2 border-dashed border-[#2788E8]/50 hover:border-[#2788E8] bg-[#2788E8]/5 flex flex-col items-center justify-center text-[#2788E8] cursor-pointer shrink-0 overflow-hidden transition-all group"
                            title="Upload group picture"
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 mb-1 text-[#2788E8]/80 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Icon</span>
                                </>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-5 w-5 text-white" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Group Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Project Team, Family Room"
                                maxLength={60}
                                required
                                className={`w-full h-11 px-4 text-sm rounded-xl outline-none border transition-all ${
                                    isDark
                                        ? 'bg-white/[0.03] border-white/10 text-white placeholder-neutral-500 focus:border-[#2788E8]'
                                        : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-[#2788E8]'
                                }`}
                            />
                        </div>
                    </div>

                    {/* Group Description */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this group about?"
                            maxLength={150}
                            className={`w-full h-10 px-4 text-xs rounded-xl outline-none border transition-all ${
                                isDark
                                    ? 'bg-white/[0.03] border-white/10 text-white placeholder-neutral-500 focus:border-[#2788E8]'
                                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-[#2788E8]'
                            }`}
                        />
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Select Members ({selectedMemberIds.length} chosen)
                            </label>
                            {friends.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedMemberIds.length === friends.length) {
                                            setSelectedMemberIds([]);
                                        } else {
                                            setSelectedMemberIds(friends.map(f => f.id));
                                        }
                                    }}
                                    className="text-[10px] text-[#2788E8] hover:underline font-semibold cursor-pointer"
                                >
                                    {selectedMemberIds.length === friends.length ? 'Deselect All' : 'Select All'}
                                </button>
                            )}
                        </div>

                        {/* Search in friends */}
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

                        {/* List */}
                        <div className={`max-h-48 overflow-y-auto custom-scrollbar border rounded-xl p-1.5 space-y-1 ${
                            isDark ? 'border-white/5 bg-black/20' : 'border-neutral-200 bg-neutral-50/50'
                        }`}>
                            {filteredFriends.length === 0 ? (
                                <div className="py-6 text-center text-neutral-400 text-xs">
                                    {friends.length === 0 ? 'No contacts available yet. Add friends first.' : 'No matching contacts.'}
                                </div>
                            ) : (
                                filteredFriends.map(friend => {
                                    const isSelected = selectedMemberIds.includes(friend.id);
                                    return (
                                        <div
                                            key={`group-select-${friend.id}`}
                                            onClick={() => toggleMember(friend.id)}
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
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !name.trim() || selectedMemberIds.length === 0}
                        className="h-11 w-full bg-[#2788E8] hover:bg-[#1f73c7] text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>Create Encrypted Group</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
