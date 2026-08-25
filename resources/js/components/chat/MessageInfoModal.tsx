import React, { useEffect, useState } from 'react';
import { X, Info, Check, CheckCheck, Clock, LoaderCircle, Users } from 'lucide-react';

interface MessageInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    messageId: number | null;
    messageBody: string;
    isDark: boolean;
}

interface MessageInfoData {
    message_id: number;
    conversation_id: number;
    is_group: boolean;
    sender_id: number;
    created_at: string;
    status: string;
    total_recipients: number;
    read_count: number;
    delivered_count: number;
    undelivered_count: number;
    reads: {
        user_id: number;
        name: string;
        username?: string;
        avatar_url?: string;
        role?: string;
        read_at?: string;
        delivered_at?: string;
    }[];
    delivered: {
        user_id: number;
        name: string;
        username?: string;
        avatar_url?: string;
        role?: string;
        delivered_at?: string;
    }[];
    undelivered: {
        user_id: number;
        name: string;
        username?: string;
        avatar_url?: string;
    }[];
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
    isOpen,
    onClose,
    messageId,
    messageBody,
    isDark,
}) => {
    const [infoData, setInfoData] = useState<MessageInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !messageId) {
            setInfoData(null);
            return;
        }

        let active = true;
        setLoading(true);
        setError(null);

        const fetchInfo = async () => {
            try {
                const res = await fetch(`/web/messages/${messageId}/info`, {
                    headers: { 'Accept': 'application/json' },
                });
                if (!res.ok) throw new Error('Failed to load message delivery info');
                const data = await res.json();
                if (active) {
                    setInfoData(data);
                }
            } catch (err: any) {
                if (active) {
                    setError(err.message || 'Error fetching message info');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchInfo();

        return () => {
            active = false;
        };
    }, [isOpen, messageId]);

    if (!isOpen) return null;

    const formatTimestamp = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (_) {
            return dateStr;
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
                            <Info className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Message Info</h3>
                            <p className="text-[11px] text-neutral-400">Delivery and read receipts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Message Bubble Preview */}
                <div className="p-4 border-b dark:border-white/5 border-neutral-100 dark:bg-white/[0.01] bg-neutral-50/50">
                    <div className="p-3 rounded-xl bg-[#2788E8]/15 border border-[#2788E8]/30 text-xs dark:text-neutral-200 text-neutral-800 break-words">
                        {messageBody}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-3">
                            <LoaderCircle className="h-7 w-7 animate-spin text-[#2788E8]" />
                            <span className="text-xs">Fetching delivery report...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    ) : infoData ? (
                        <div className="space-y-4">
                            {/* Read by section */}
                            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
                                <div className="flex items-center gap-2 text-sky-400">
                                    <CheckCheck className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Read {infoData.is_group ? `(${infoData.read_count})` : ''}
                                    </span>
                                </div>
                                {infoData.reads.length === 0 ? (
                                    <span className="text-xs text-neutral-500 italic block">Not yet read</span>
                                ) : (
                                    <div className="space-y-2">
                                        {infoData.reads.map(r => (
                                            <div key={`read-${r.user_id}`} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-6 w-6 rounded-full border border-sky-400/40 bg-sky-400/10 flex items-center justify-center font-bold text-[10px] text-sky-400 overflow-hidden">
                                                        {r.avatar_url ? (
                                                            <img src={r.avatar_url} alt={r.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            r.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="font-semibold truncate">{r.name}</span>
                                                </div>
                                                <span className="text-[11px] text-neutral-400 font-mono">
                                                    {formatTimestamp(r.read_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Delivered to section */}
                            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <CheckCheck className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Delivered {infoData.is_group ? `(${infoData.delivered_count})` : ''}
                                    </span>
                                </div>
                                {infoData.delivered.length === 0 ? (
                                    <span className="text-xs text-neutral-500 italic block">
                                        {infoData.reads.length > 0 ? 'All delivered members have read this message' : 'Waiting for delivery...'}
                                    </span>
                                ) : (
                                    <div className="space-y-2">
                                        {infoData.delivered.map(d => (
                                            <div key={`del-${d.user_id}`} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-6 w-6 rounded-full border border-neutral-400/40 bg-neutral-400/10 flex items-center justify-center font-bold text-[10px] text-neutral-400 overflow-hidden">
                                                        {d.avatar_url ? (
                                                            <img src={d.avatar_url} alt={d.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            d.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="font-semibold truncate">{d.name}</span>
                                                </div>
                                                <span className="text-[11px] text-neutral-400 font-mono">
                                                    {formatTimestamp(d.delivered_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sent timestamp section */}
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <Check className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Sent</span>
                                </div>
                                <span className="text-[11px] text-neutral-400 font-mono">
                                    {formatTimestamp(infoData.created_at)}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
