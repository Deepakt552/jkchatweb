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
    Loader2
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Monitor',
        href: '/admin/chats',
    },
];

interface ConversationMember {
    id: number;
    user_id: number;
    role: string;
}

interface Conversation {
    id: number;
    name: string | null;
    type: 'direct' | 'group';
    messages_count: number;
    created_at: string;
    updated_at: string;
    members: { id: number; name: string; username: string }[];
}

interface Message {
    id: number;
    sender_id: number;
    body: string;
    type: string;
    created_at: string;
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
}

export default function Chats({ conversations, privacyMode }: Props) {
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const handleViewMessages = async (conv: Conversation) => {
        setSelectedConv(conv);
        setIsLoadingMessages(true);
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
        if (confirm('Delete this conversation entirely? This deletes all message logs and attachments.')) {
            router.delete(`/admin/chats/${id}`, {
                onSuccess: () => setSelectedConv(null),
            });
        }
    };

    const handleDeleteMessage = async (msgId: number) => {
        if (confirm('Are you sure you want to permanently delete this message?')) {
            try {
                await fetch(`/admin/messages/${msgId}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '' } });
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Monitor" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chat Monitor</h1>
                    <p className="text-neutral-500">Oversee active conversations, verify compliance audits, and manage server storage.</p>
                </div>

                {/* Privacy Warning Header */}
                {privacyMode && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#C88B37]/20 bg-[#C88B37]/5 p-4 text-sm text-[#C88B37] dark:border-[#C88B37]/10 dark:bg-[#C88B37]/5 backdrop-blur-md">
                        <Shield className="h-5 w-5 shrink-0 text-[#C88B37]" />
                        <div>
                            <span className="font-semibold">Privacy Mode Enabled:</span> Message bodies are fully end-to-end encrypted client-side using AES-256-GCM. The database stores only ciphertext; server administrators cannot view message content.
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    
                    {/* Left: Chat Session list */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md dark:border-white/5 shadow-sm hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A]">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Conversation Details</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Members Count</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Message Total</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                    {conversations.data.map((conv) => (
                                        <tr key={conv.id} className="hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 dark:text-white">
                                                    {conv.type === 'direct' 
                                                        ? `Direct: ${conv.members.map(m => m.name).join(' & ')}`
                                                        : `Group: ${conv.name || 'Unnamed Group'}`
                                                    }
                                                </div>
                                                <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                                    <Calendar className="h-3 w-3" />
                                                    Last active: {new Date(conv.updated_at).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-xs">
                                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                                    {conv.members.length} members
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold">{conv.messages_count}</td>
                                            <td className="px-6 py-4 text-right space-x-1">
                                                <button 
                                                    onClick={() => handleViewMessages(conv)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/5 dark:bg-[#C88B37]/10 dark:text-[#C88B37] dark:hover:bg-[#C88B37]/15 hover:border-[#C88B37]/45 transition-colors"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Inspect
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteConversation(conv.id)}
                                                    className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-white/5 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/30 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Message Inspector Panel */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-6 shadow-sm dark:border-white/5 min-h-[400px] flex flex-col hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
                            <MessageSquare className="h-5 w-5 text-[#C88B37]" />
                            Message Inspect Log
                        </h2>

                        {!selectedConv ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                                <Shield className="h-8 w-8 mb-2 opacity-50 text-[#C88B37] animate-pulse" />
                                <p className="text-sm">Select a conversation to inspect message parameters and compliance attributes.</p>
                            </div>
                        ) : isLoadingMessages ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-[#C88B37]" />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                                    <div className="text-xs text-neutral-400 mb-2">
                                        ID: {selectedConv.id} | Type: {selectedConv.type}
                                    </div>
                                    
                                    {messages.length === 0 ? (
                                        <p className="text-xs text-neutral-400 text-center py-6">No messages recorded in this chat.</p>
                                    ) : (
                                        messages.map((msg) => (
                                            <div key={msg.id} className="rounded-xl bg-neutral-50/50 p-3 text-xs dark:bg-[#0A0A0A]/50 border border-neutral-100 dark:border-white/5 relative group hover:border-[#C88B37]/25 transition-all duration-300">
                                                <div className="flex justify-between items-center mb-1 font-semibold text-neutral-600 dark:text-neutral-400">
                                                    <span>{msg.sender?.name || `User ID: ${msg.sender_id}`}</span>
                                                    <span className="text-xxs font-normal">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="font-mono break-words text-neutral-800 dark:text-neutral-200">
                                                    {msg.body}
                                                </p>
                                                <div className="mt-1 flex items-center justify-between text-xxs text-neutral-400">
                                                    <span>Format: {msg.type}</span>
                                                    <button 
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-600 hover:underline flex items-center gap-0.5 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3 w-3" /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button 
                                    onClick={() => handleDeleteConversation(selectedConv.id)}
                                    className="w-full mt-4 inline-flex justify-center items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Wipe Conversation
                                </button>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}
