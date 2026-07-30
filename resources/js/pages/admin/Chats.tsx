import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Shield,
    Trash2,
    Eye,
    Calendar,
    Users,
    Loader2,
    RotateCcw,
    Search,
    Archive,
    History,
    Zap,
    RefreshCw,
    CheckCircle2,
    Clock,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Monitor',
        href: '/admin/chats',
    },
];

interface Conversation {
    id: number;
    name: string | null;
    type: 'direct' | 'group';
    messages_count: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    delete_reason?: string | null;
    members: { id: number; name: string; username: string }[];
    cleared_members?: {
        user_id: number;
        name?: string;
        username?: string;
        cleared_at?: string | null;
        hidden_at?: string | null;
    }[];
    soft_deletions?: {
        id: number;
        action: string;
        effect_at: string;
        user?: { id: number; name: string } | null;
    }[];
}

interface Message {
    id: number;
    sender_id: number;
    body: string;
    type: string;
    created_at: string;
    is_deleted?: boolean;
    is_restored?: boolean;
    sender?: { name: string; username: string } | null;
}

interface Pagination<T> {
    data: T[];
    links: any[];
    current_page: number;
    last_page: number;
}

interface Props {
    conversations: Pagination<Conversation>;
    privacyMode: boolean;
    tab: 'active' | 'cleared' | 'deleted';
    filters: { from?: string; to?: string; search?: string };
    stats: {
        active: number;
        cleared: number;
        deleted: number;
        pending_restores: number;
    };
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
}

export default function Chats({ conversations, privacyMode, tab, filters, stats }: Props) {
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');
    const [restoreMode, setRestoreMode] = useState<'full' | 'from_date' | 'date_range'>('full');
    const [restoreFromDate, setRestoreFromDate] = useState('');
    const [restoreToDate, setRestoreToDate] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [bulkFrom, setBulkFrom] = useState('');
    const [bulkTo, setBulkTo] = useState('');
    const [isBulkRestoring, setIsBulkRestoring] = useState(false);
    const [liveSync, setLiveSync] = useState(true);

    useEffect(() => {
        if (!liveSync) return;
        const interval = setInterval(() => {
            router.reload({ preserveScroll: true, preserveState: true });
        }, 4000);
        return () => clearInterval(interval);
    }, [liveSync]);

    const handleBulkRestore = async () => {
        if (!bulkFrom || !bulkTo) {
            alert('Pick both From Date and To Date for bulk restore.');
            return;
        }
        if (!confirm(`Bulk restore all deleted and cleared chats between ${bulkFrom} and ${bulkTo}?`)) return;

        setIsBulkRestoring(true);
        try {
            const res = await fetch('/admin/chats/bulk-restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ from: bulkFrom, to: bulkTo, mode: 'full' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Bulk restore failed');
            }
            alert('Bulk restoration completed successfully!');
            applyFilters(tab);
        } catch (e: any) {
            alert(e.message || 'Bulk restore failed');
        } finally {
            setIsBulkRestoring(false);
        }
    };

    const applyFilters = (nextTab = tab) => {
        router.get(
            '/admin/chats',
            {
                tab: nextTab,
                search: search || undefined,
                from: from || undefined,
                to: to || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleViewMessages = async (conv: Conversation) => {
        setSelectedConv(conv);
        setIsLoadingMessages(true);
        setRestoreMode('full');
        setRestoreFromDate('');
        try {
            const res = await fetch(`/admin/chats/${conv.id}`);
            const data = await res.json();
            setMessages(data.messages);
        } catch (e) {
            console.error('Failed to load chat messages', e);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleDeleteConversation = (id: number) => {
        if (
            confirm(
                'Soft-delete this conversation? Messages stay on the server and can be restored later from the Deleted tab.',
            )
        ) {
            router.delete(`/admin/chats/${id}`, {
                onSuccess: () => setSelectedConv(null),
            });
        }
    };

    const handleDeleteMessage = async (msgId: number) => {
        if (confirm('Soft-delete this message content? The row is kept for audit.')) {
            try {
                await fetch(`/admin/messages/${msgId}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': csrfToken() },
                });
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId
                            ? { ...m, is_deleted: true, body: '[This message was deleted by admin]' }
                            : m,
                    ),
                );
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleRestoreMessage = async (msgId: number) => {
        if (confirm('Restore this message to its original content?')) {
            try {
                const res = await fetch(`/admin/messages/${msgId}/restore`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                });
                const data = await res.json();
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId
                            ? { ...m, is_deleted: false, body: data.restored_body || m.body }
                            : m,
                    ),
                );
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleRestore = async (
        convId: number,
        options?: { mode?: 'full' | 'from_date' | 'date_range'; fromDate?: string; toDate?: string },
    ) => {
        const mode = options?.mode ?? restoreMode;
        const fromDate = options?.fromDate ?? restoreFromDate;
        const toDate = options?.toDate ?? restoreToDate;

        if ((mode === 'from_date' || mode === 'date_range') && !fromDate) {
            alert('Pick a start date.');
            return;
        }
        if (mode === 'date_range' && !toDate) {
            alert('Pick an end date.');
            return;
        }
        const label =
            mode === 'full'
                ? 'Restore the full chat history for all members?'
                : mode === 'date_range'
                ? `Restore chat history between ${fromDate} and ${toDate} for all members?`
                : `Restore messages from ${fromDate} onward for all members?`;
        if (!confirm(label)) return;

        setIsRestoring(true);
        try {
            const res = await fetch(`/admin/chats/${convId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    mode,
                    from_date: (mode === 'from_date' || mode === 'date_range') ? fromDate : null,
                    to_date: mode === 'date_range' ? toDate : null,
                    restore_conversation: true,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Restore failed');
            }
            alert('Chat restored. Users will see history again on next sync.');
            setSelectedConv(null);
            applyFilters(tab);
        } catch (e: any) {
            alert(e.message || 'Restore failed');
        } finally {
            setIsRestoring(false);
        }
    };

    const conversationTitle = (conv: Conversation) =>
        conv.type === 'direct'
            ? `Direct: ${conv.members.map((m) => m.name).join(' & ')}`
            : `Group: ${conv.name || 'Unnamed Group'}`;

    const tabs: { id: Props['tab']; label: string; count: number; icon: typeof MessageSquare }[] = [
        { id: 'active', label: 'Active', count: stats.active, icon: MessageSquare },
        { id: 'cleared', label: 'Cleared / Deleted by Users', count: stats.cleared, icon: History },
        { id: 'deleted', label: 'Admin Soft-Deleted', count: stats.deleted, icon: Archive },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Monitor" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Chat Monitor</h1>
                            <button
                                type="button"
                                onClick={() => setLiveSync(!liveSync)}
                                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                                    liveSync
                                        ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400'
                                }`}
                            >
                                {liveSync ? (
                                    <>
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                        </span>
                                        <span>Live Auto-Sync Active (4s)</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3" />
                                        <span>Live Sync Paused</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Real-time chat monitoring. Soft-deleted messages stay in database & recoverable by admin.
                        </p>
                    </div>
                </div>

                {/* Metric Stats Overview Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#C88B37]/20 bg-gradient-to-br from-amber-500/10 via-white to-white p-4 shadow-sm dark:bg-gradient-to-br dark:from-[#C88B37]/15 dark:to-[#0F0F0F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                Active Chats
                            </span>
                            <MessageSquare className="h-5 w-5 text-[#C88B37]" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {stats.active}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Active conversations</span>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-white to-white p-4 shadow-sm dark:bg-gradient-to-br dark:from-emerald-950/30 dark:to-[#0F0F0F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Cleared / Soft-Deleted
                            </span>
                            <History className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {stats.cleared}
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Recoverable user chat history</span>
                    </div>

                    <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-white to-white p-4 shadow-sm dark:bg-gradient-to-br dark:from-rose-950/30 dark:to-[#0F0F0F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                Admin Soft-Wiped
                            </span>
                            <Archive className="h-5 w-5 text-rose-600" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {stats.deleted}
                        </div>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400">Soft-deleted conversations</span>
                    </div>
                </div>

                {privacyMode && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#C88B37]/20 bg-[#C88B37]/5 p-4 text-sm text-[#C88B37] dark:border-[#C88B37]/10 dark:bg-[#C88B37]/5 backdrop-blur-md">
                        <Shield className="h-5 w-5 shrink-0 text-[#C88B37]" />
                        <div>
                            <span className="font-semibold">Privacy Mode Enabled:</span> Message bodies
                            are end-to-end encrypted. Soft-delete keeps ciphertext so chats can be restored
                            without exposing plaintext on the server.
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => applyFilters(t.id)}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                    active
                                        ? 'bg-[#C88B37] text-white shadow-sm'
                                        : 'border border-neutral-200 bg-white text-neutral-700 hover:border-[#C88B37]/40 dark:border-white/10 dark:bg-[#0F0F0F] dark:text-neutral-200'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {t.label}
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                                        active ? 'bg-white/20' : 'bg-neutral-100 dark:bg-white/10'
                                    }`}
                                >
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Filters + bulk restore */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-white/5 dark:bg-[#0F0F0F]/65">
                        <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                            Filter
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1 text-xs text-neutral-500">
                                Search
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                        placeholder="Name or username"
                                        className="w-44 rounded-lg border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm dark:border-white/10 dark:bg-[#0A0A0A]"
                                    />
                                </div>
                            </label>
                            {(tab === 'cleared' || tab === 'deleted') && (
                                <>
                                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                                        From
                                        <input
                                            type="date"
                                            value={from}
                                            onChange={(e) => setFrom(e.target.value)}
                                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#0A0A0A]"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                                        To
                                        <input
                                            type="date"
                                            value={to}
                                            onChange={(e) => setTo(e.target.value)}
                                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#0A0A0A]"
                                        />
                                    </label>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => applyFilters()}
                                className="rounded-lg bg-[#C88B37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b57a2f]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            <RotateCcw className="h-4 w-4" />
                            Bulk restore by date range
                        </div>
                        <p className="mb-3 text-xs text-emerald-700/80 dark:text-emerald-400/70">
                            Restore every user clear/delete and admin wipe that happened between two dates.
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1 text-xs text-neutral-500">
                                From
                                <input
                                    type="date"
                                    value={bulkFrom}
                                    onChange={(e) => setBulkFrom(e.target.value)}
                                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#0A0A0A]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-neutral-500">
                                To
                                <input
                                    type="date"
                                    value={bulkTo}
                                    onChange={(e) => setBulkTo(e.target.value)}
                                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#0A0A0A]"
                                />
                            </label>
                            <button
                                type="button"
                                disabled={isBulkRestoring}
                                onClick={handleBulkRestore}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {isBulkRestoring ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="h-4 w-4" />
                                )}
                                Restore range
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left: list */}
                    <div className="space-y-4 lg:col-span-2">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-white/5 dark:bg-[#0F0F0F]/65">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A]">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">
                                            Conversation
                                        </th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">
                                            Members
                                        </th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">
                                            Messages
                                        </th>
                                        <th className="px-6 py-3.5 text-right font-semibold text-neutral-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                    {conversations.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-6 py-12 text-center text-sm text-neutral-400"
                                            >
                                                No conversations in this view.
                                            </td>
                                        </tr>
                                    ) : (
                                        conversations.data.map((conv) => (
                                            <tr
                                                key={conv.id}
                                                className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-white/5"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 dark:text-white">
                                                        {conversationTitle(conv)}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                                                        <Calendar className="h-3 w-3" />
                                                        {tab === 'deleted' && conv.deleted_at
                                                            ? `Deleted: ${new Date(conv.deleted_at).toLocaleString()}`
                                                            : `Last active: ${new Date(conv.updated_at).toLocaleString()}`}
                                                    </div>
                                                    {tab === 'cleared' && conv.cleared_members && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {conv.cleared_members.map((m) => (
                                                                <span
                                                                    key={m.user_id}
                                                                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                                                >
                                                                    {m.name || m.username || m.user_id}
                                                                    {m.hidden_at ? ' · deleted' : ' · cleared'}
                                                                    {m.cleared_at
                                                                        ? ` · ${new Date(m.cleared_at).toLocaleDateString()}`
                                                                        : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 text-xs">
                                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                                        {conv.members.length}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-semibold">
                                                    {conv.messages_count}
                                                </td>
                                                <td className="space-x-1 px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleViewMessages(conv)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-[#C88B37]/45 hover:bg-neutral-50 dark:border-white/5 dark:bg-[#C88B37]/10 dark:text-[#C88B37]"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Inspect
                                                    </button>
                                                    {(tab === 'cleared' || tab === 'deleted') && (
                                                        <button
                                                            onClick={() => handleRestore(conv.id, { mode: 'full' })}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            Restore
                                                        </button>
                                                    )}
                                                    {tab === 'active' && (
                                                        <button
                                                            onClick={() => handleDeleteConversation(conv.id)}
                                                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:border-white/5 dark:hover:bg-rose-950/30"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {conversations.last_page > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {conversations.links.map((link, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                            link.active
                                                ? 'bg-[#C88B37] text-white'
                                                : 'border border-neutral-200 bg-white text-neutral-600 dark:border-white/10 dark:bg-[#0F0F0F]'
                                        } disabled:opacity-40`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: inspector + restore panel */}
                    <div className="flex min-h-[400px] flex-col rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-white/5 dark:bg-[#0F0F0F]/65">
                        <h2 className="mb-4 flex items-center gap-2 border-b border-neutral-100 pb-3 text-lg font-semibold tracking-tight dark:border-white/5">
                            <MessageSquare className="h-5 w-5 text-[#C88B37]" />
                            Inspect & Restore
                        </h2>

                        {!selectedConv ? (
                            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-neutral-400">
                                <Shield className="mb-2 h-8 w-8 animate-pulse text-[#C88B37] opacity-50" />
                                <p className="text-sm">
                                    Select a conversation to inspect messages or restore soft-deleted history.
                                </p>
                            </div>
                        ) : isLoadingMessages ? (
                            <div className="flex flex-1 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-[#C88B37]" />
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col justify-between gap-4">
                                <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                                    <div className="text-xs text-neutral-400">
                                        ID: {selectedConv.id} · Type: {selectedConv.type}
                                        {selectedConv.deleted_at && (
                                            <span className="ml-2 text-rose-500">
                                                Soft-deleted {new Date(selectedConv.deleted_at).toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {messages.length === 0 ? (
                                        <p className="py-6 text-center text-xs text-neutral-400">
                                            No messages recorded in this chat.
                                        </p>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className="group relative rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 text-xs dark:border-white/5 dark:bg-[#0A0A0A]/50"
                                            >
                                                <div className="mb-1 flex items-center justify-between font-semibold text-neutral-600 dark:text-neutral-400">
                                                    <span className="flex items-center gap-1.5">
                                                        {msg.sender?.name || `User ID: ${msg.sender_id}`}
                                                        {msg.is_restored && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                <RotateCcw className="h-3 w-3 text-amber-600" /> Restored
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-normal">
                                                        {new Date(msg.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="break-words font-mono text-neutral-800 dark:text-neutral-200">
                                                    {msg.body}
                                                </p>
                                                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                                                    <span>Format: {msg.type}</span>
                                                    {!msg.is_deleted ? (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="flex items-center gap-0.5 text-rose-600 opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-3 w-3" /> Soft-delete
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRestoreMessage(msg.id)}
                                                            className="flex items-center gap-0.5 text-emerald-600 font-semibold transition-opacity hover:underline"
                                                        >
                                                            <RotateCcw className="h-3 w-3" /> Restore Message
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Restore controls */}
                                <div className="space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                    <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                        Restore for users
                                    </div>
                                    <div className="flex flex-col gap-2 text-xs">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="restoreMode"
                                                checked={restoreMode === 'full'}
                                                onChange={() => setRestoreMode('full')}
                                            />
                                            Full restore (all history visible again)
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="restoreMode"
                                                checked={restoreMode === 'from_date'}
                                                onChange={() => setRestoreMode('from_date')}
                                            />
                                            Restore from single date onward
                                        </label>
                                        {restoreMode === 'from_date' && (
                                            <input
                                                type="date"
                                                value={restoreFromDate}
                                                onChange={(e) => setRestoreFromDate(e.target.value)}
                                                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0A0A0A]"
                                            />
                                        )}
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="restoreMode"
                                                checked={restoreMode === 'date_range'}
                                                onChange={() => setRestoreMode('date_range')}
                                            />
                                            Restore between two dates (First Date to Last Date)
                                        </label>
                                        {restoreMode === 'date_range' && (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
                                                    <span>First Date (Start):</span>
                                                    <span>Last Date (End):</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="date"
                                                        value={restoreFromDate}
                                                        onChange={(e) => setRestoreFromDate(e.target.value)}
                                                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-[#0A0A0A]"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={restoreToDate}
                                                        onChange={(e) => setRestoreToDate(e.target.value)}
                                                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-[#0A0A0A]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isRestoring}
                                        onClick={() => handleRestore(selectedConv.id)}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        {isRestoring ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-4 w-4" />
                                        )}
                                        Restore chat to users
                                    </button>
                                </div>

                                {tab === 'active' && (
                                    <button
                                        onClick={() => handleDeleteConversation(selectedConv.id)}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Soft-delete conversation
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
