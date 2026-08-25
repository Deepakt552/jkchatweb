import React, { useState } from 'react';
import { X, SlidersHorizontal, ShieldCheck, LoaderCircle, Check } from 'lucide-react';

interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: number;
    initialSettings?: {
        edit_permissions?: 'admins' | 'all';
        add_permissions?: 'admins' | 'all';
        message_permissions?: 'admins' | 'all';
    };
    onSettingsUpdated: (updatedConversation: any) => void;
    isDark: boolean;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
    isOpen,
    onClose,
    conversationId,
    initialSettings,
    onSettingsUpdated,
    isDark,
}) => {
    const [editPermissions, setEditPermissions] = useState<'admins' | 'all'>(
        initialSettings?.edit_permissions || 'all'
    );
    const [addPermissions, setAddPermissions] = useState<'admins' | 'all'>(
        initialSettings?.add_permissions || 'all'
    );
    const [messagePermissions, setMessagePermissions] = useState<'admins' | 'all'>(
        initialSettings?.message_permissions || 'all'
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/web/conversations/${conversationId}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    edit_permissions: editPermissions,
                    add_permissions: addPermissions,
                    message_permissions: messagePermissions,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to update group settings');
            }

            const data = await res.json();
            onSettingsUpdated(data.conversation);
            onClose();
        } catch (err: any) {
            console.error('Error updating group settings:', err);
            setError(err.message || 'Failed to update group settings');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPermissionOption = (
        title: string,
        description: string,
        value: 'admins' | 'all',
        onChange: (v: 'admins' | 'all') => void
    ) => (
        <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
            <div>
                <h4 className="text-xs font-bold dark:text-white text-neutral-900">{title}</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">{description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onChange('all')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        value === 'all'
                            ? 'bg-[#2788E8]/15 border-[#2788E8] text-[#2788E8]'
                            : 'border-transparent dark:bg-white/5 bg-white text-neutral-400 hover:text-neutral-200'
                    }`}
                >
                    {value === 'all' && <Check className="h-3.5 w-3.5" />}
                    <span>All Members</span>
                </button>
                <button
                    type="button"
                    onClick={() => onChange('admins')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        value === 'admins'
                            ? 'bg-[#2788E8]/15 border-[#2788E8] text-[#2788E8]'
                            : 'border-transparent dark:bg-white/5 bg-white text-neutral-400 hover:text-neutral-200'
                    }`}
                >
                    {value === 'admins' && <Check className="h-3.5 w-3.5" />}
                    <span>Only Admins</span>
                </button>
            </div>
        </div>
    );

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
                            <SlidersHorizontal className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Group Permissions</h3>
                            <p className="text-[11px] text-neutral-400">Admin control panel</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {renderPermissionOption(
                        'Edit Group Info',
                        'Who can change the group name, icon, and description.',
                        editPermissions,
                        setEditPermissions
                    )}

                    {renderPermissionOption(
                        'Send Messages',
                        'Who can send messages, photos, and files in this group.',
                        messagePermissions,
                        setMessagePermissions
                    )}

                    {renderPermissionOption(
                        'Add Other Members',
                        'Who can invite new participants to this group.',
                        addPermissions,
                        setAddPermissions
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-11 w-full bg-[#2788E8] hover:bg-[#1f73c7] text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <span>Save Permissions</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
