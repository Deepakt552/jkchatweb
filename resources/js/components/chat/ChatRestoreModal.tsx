import React, { useEffect, useState } from 'react';
import { X, History, RefreshCw, CheckCircle2, AlertCircle, LoaderCircle, Trash2 } from 'lucide-react';

interface ChatRestoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestored: () => void;
    isDark: boolean;
}

export const ChatRestoreModal: React.FC<ChatRestoreModalProps> = ({
    isOpen,
    onClose,
    onRestored,
    isDark,
}) => {
    const [restores, setRestores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreMode, setRestoreMode] = useState<'full' | 'from_date'>('full');
    const [fromDate, setFromDate] = useState('');
    const [selectedConvIds, setSelectedConvIds] = useState<number[]>([]);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchPendingRestores = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            const res = await fetch('/web/my-pending-restores', {
                headers: { 'Accept': 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setRestores(data.restores || []);
                setSelectedConvIds(data.restores?.map((r: any) => r.conversation_id) || []);
            }
        } catch (err) {
            console.error('Failed to fetch pending restores:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPendingRestores();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRestore = async () => {
        setIsRestoring(true);
        setStatusMessage(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/web/my-restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    mode: restoreMode,
                    from_date: restoreMode === 'from_date' ? fromDate : null,
                    conversation_ids: selectedConvIds.length > 0 ? selectedConvIds : null,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Restore failed');
            }

            const data = await res.json();
            setStatusMessage({
                type: 'success',
                text: `Successfully restored ${data.restored_count || restores.length} conversations!`,
            });
            onRestored();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Error during restore:', err);
            setStatusMessage({
                type: 'error',
                text: err.message || 'Failed to restore chat history',
            });
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
                    isDark ? 'border-white/10 bg-[#141414] text-white' : 'border-neutral-200 bg-white text-neutral-900'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-[#2788E8]/15 border border-[#2788E8]/30 flex items-center justify-center text-[#2788E8]">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Recover Deleted Chat History</h3>
                            <p className="text-[11px] text-neutral-400">Restore soft-deleted / cleared conversations</p>
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
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    {statusMessage && (
                        <div
                            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                                statusMessage.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}
                        >
                            {statusMessage.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 shrink-0" />
                            )}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-3">
                            <LoaderCircle className="h-7 w-7 animate-spin text-[#2788E8]" />
                            <span className="text-xs">Searching recoverable archives...</span>
                        </div>
                    ) : restores.length === 0 ? (
                        <div className="py-10 text-center text-neutral-400 flex flex-col items-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                            <span className="text-sm font-semibold">No Cleared Chats Pending</span>
                            <span className="text-xs text-neutral-500 mt-1">All your active conversations are currently visible.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
                                    Select Chats to Restore ({restores.length} recoverable)
                                </span>
                                <div className={`max-h-48 overflow-y-auto custom-scrollbar border rounded-xl p-2 space-y-1.5 ${
                                    isDark ? 'border-white/5 bg-black/20' : 'border-neutral-200 bg-neutral-50/50'
                                }`}>
                                    {restores.map(r => {
                                        const isChecked = selectedConvIds.includes(r.conversation_id);
                                        return (
                                            <label
                                                key={`restore-conv-${r.conversation_id}`}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                    isChecked ? 'bg-[#2788E8]/10 text-white' : 'hover:bg-neutral-100 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        setSelectedConvIds(prev =>
                                                            prev.includes(r.conversation_id)
                                                                ? prev.filter(id => id !== r.conversation_id)
                                                                : [...prev, r.conversation_id]
                                                        );
                                                    }}
                                                    className="h-4 w-4 rounded border-neutral-300 text-[#2788E8] focus:ring-[#2788E8]"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-xs dark:text-white text-neutral-900 block truncate">
                                                        {r.conversation_name}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 capitalize block">
                                                        {r.type} • Cleared {r.cleared_at ? new Date(r.cleared_at).toLocaleDateString() : 'recently'}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Restore Mode Options */}
                            <div className="space-y-2">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
                                    Restore Range
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRestoreMode('full')}
                                        className={`p-3 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                                            restoreMode === 'full'
                                                ? 'bg-[#2788E8]/15 border-[#2788E8] text-[#2788E8]'
                                                : 'border-transparent dark:bg-white/5 bg-neutral-100 text-neutral-400'
                                        }`}
                                    >
                                        <span className="block font-bold">Full History</span>
                                        <span className="text-[10px] opacity-80">Restore all past messages</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRestoreMode('from_date')}
                                        className={`p-3 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                                            restoreMode === 'from_date'
                                                ? 'bg-[#2788E8]/15 border-[#2788E8] text-[#2788E8]'
                                                : 'border-transparent dark:bg-white/5 bg-neutral-100 text-neutral-400'
                                        }`}
                                    >
                                        <span className="block font-bold">From Date</span>
                                        <span className="text-[10px] opacity-80">Restore starting from day</span>
                                    </button>
                                </div>

                                {restoreMode === 'from_date' && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                                            Restore From Date
                                        </label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className={`h-10 px-3 rounded-xl text-xs outline-none border w-full ${
                                                isDark ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-neutral-50 border-neutral-200'
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {restores.length > 0 && (
                    <div className="p-4 border-t dark:border-white/5 border-neutral-100">
                        <button
                            type="button"
                            onClick={handleRestore}
                            disabled={isRestoring || selectedConvIds.length === 0}
                            className="h-11 w-full bg-[#2788E8] hover:bg-[#1f73c7] text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRestoring ? (
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" />
                                    <span>Restore {selectedConvIds.length} Conversations</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
