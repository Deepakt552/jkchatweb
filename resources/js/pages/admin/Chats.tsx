import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
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
    const [restoreMode, setRestoreMode] = useState<'full' | 'from_date'>('full');
    const [restoreFromDate, setRestoreFromDate] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [bulkFrom, setBulkFrom] = useState('');
    const [bulkTo, setBulkTo] = useState('');
    const [isBulkRestoring, setIsBulkRestoring] = useState(false);

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

    const handleRestore = async (
        convId: number,
        options?: { mode?: 'full' | 'from_date'; fromDate?: string },
    ) => {
        const mode = options?.mode ?? restoreMode;
        const fromDate = options?.fromDate ?? restoreFromDate;
        if (mode === 'from_date' && !fromDate) {
            alert('Pick a restore-from date.');
            return;
        }
        const label =
            mode === 'full'
                ? 'Restore the full chat history for all members?'
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
                    from_date: mode === 'from_date' ? fromDate : null,
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

    const handleBulkRestore = () => {
        if (!bulkFrom || !bulkTo) {
            alert('Select both From and To dates for bulk restore.');
            return;
        }
        if (
            !confirm(
                `Restore all user clears/deletes and admin wipes between ${bulkFrom} and ${bulkTo}?`,
            )
        ) {
            return;
        }
        setIsBulkRestoring(true);
        router.post(
            '/admin/chats/bulk-restore',
            {
                from: bulkFrom,
                to: bulkTo,
                mode: 'full',
                actions: ['clear', 'delete', 'admin_wipe'],
            },
            {
                onFinish: () => setIsBulkRestoring(false),
                onSuccess: () => {
                    setBulkFrom('');
                    setBulkTo('');
                },
            },
        );
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
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Chat Monitor</h1>
                        <p className="text-neutral-500">
                            Oversee conversations. User clear/delete is soft — restore history any time.
                        </p>
                    </div>
                    <div className="text-xs text-neutral-500">
                        Pending restores: <span className="font-semibold text-[#C88B37]">{stats.pending_restores}</span>
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
                                                    <span>
                                                        {msg.sender?.name || `User ID: ${msg.sender_id}`}
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
                                                    {!msg.is_deleted && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="flex items-center gap-0.5 text-rose-600 opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-3 w-3" /> Soft-delete
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
                                            Restore from date
                                        </label>
                                        {restoreMode === 'from_date' && (
                                            <input
                                                type="date"
                                                value={restoreFromDate}
                                                onChange={(e) => setRestoreFromDate(e.target.value)}
                                                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0A0A0A]"
                                            />
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
