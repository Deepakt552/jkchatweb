import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';
import { deriveConversationKey, decryptText, encryptText, encryptTextWithIV, generateRandomKey, generateRandomIV, encryptBlob, decryptTextWithIV, decryptBlob } from '@/lib/crypto';
import {
    Search, Plus, Send, Paperclip, MoreVertical,
    Check, CheckCheck, Smile, ShieldAlert, UserPlus,
    MessageSquare, Trash2, Edit2, Circle, Users,
    Sparkles, LogOut, Settings, Bell, BellOff, X, ShieldCheck,
    ArrowLeft, Download, Image as ImageIcon, FileText,
    User, CheckCircle2, AlertCircle, Camera, Sun, Moon, LoaderCircle,
    Mail, Info, UploadCloud, CornerUpLeft, Pin
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { initEcho } from '@/lib/echo';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Workspace',
        href: '/dashboard',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
    about?: string;
    online_status?: string;
    is_admin?: boolean;
    privacy_settings?: {
        last_seen_visibility?: string;
    };
}

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    sender_name: string;
    type: string;
    body: string;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    attachments?: any[];
    // Delivery/read receipt tracking
    read_by?: number[];       // user IDs who have read this message
    delivered_by?: number[];  // user IDs who have received this message
    reply_to_message_id?: number | null;
    reply_to?: {
        id: number;
        sender_id: number;
        sender_name?: string;
        type: string;
        body: string;
        iv?: string;
    } | null;
}

interface Conversation {
    id: number;
    name?: string;
    type: 'direct' | 'group';
    unread_count: number;
    members: (User & { pivot?: { role: string; joined_at?: string } })[];
    messages?: Message[];
    avatar_url?: string;
    avatar_thumb_url?: string;
    description?: string;
    created_at?: string;
    creator?: { id: number; name: string } | null;
}

interface CustomTab {
    id: string;
    name: string;
    selectedIds: number[];
}

interface FriendRequest {
    id: number;
    sender_id: number;
    receiver_id: number;
    status: string;
    sender: User;
    receiver?: User;
}

const compressImage = (file: File, quality = 0.5): Promise<Blob | File> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                const maxDim = 1600;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            resolve(file);
                        }
                    },
                    file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                    quality
                );
            };
        };
    });
};

interface DecryptedAttachmentProps {
    attach: {
        id: number;
        file_name: string;
        file_type: string;
        file_size: number;
        encryption_key?: string;
        encryption_iv?: string;
    };
    conversationId: number;
}

const DecryptedAttachment = ({ attach, conversationId }: DecryptedAttachmentProps) => {
    const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const response = await fetch(`/web/files/download/${attach.id}`);
                if (!response.ok) throw new Error();
                const encryptedBlob = await response.blob();

                if (attach.encryption_key && attach.encryption_iv) {
                    const chatKey = deriveConversationKey(conversationId);
                    const fileKey = decryptTextWithIV(attach.encryption_key, chatKey, attach.encryption_iv);
                    const decryptedBlob = await decryptBlob(encryptedBlob, fileKey, attach.encryption_iv);
                    if (active) {
                        const url = URL.createObjectURL(decryptedBlob);
                        setDecryptedUrl(url);
                    }
                } else {
                    if (active) {
                        const url = URL.createObjectURL(encryptedBlob);
                        setDecryptedUrl(url);
                    }
                }
            } catch (err) {
                console.error('Decryption failed for attachment:', attach.id, err);
                if (active) setError(true);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        return () => {
            active = false;
            if (decryptedUrl) {
                URL.revokeObjectURL(decryptedUrl);
            }
        };
    }, [attach.id, attach.encryption_key, attach.encryption_iv, conversationId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6 dark:bg-white/[0.02] bg-neutral-100 rounded-xl h-40 w-full animate-pulse border dark:border-white/5 border-neutral-200">
                <LoaderCircle className="h-6 w-6 animate-spin text-[#C88B37]" />
            </div>
        );
    }

    if (error || !decryptedUrl) {
        return (
            <div className="flex flex-col items-center justify-center p-6 dark:bg-white/[0.02] bg-neutral-100 rounded-xl h-40 w-full border dark:border-white/5 border-neutral-200 text-neutral-400">
                <ImageIcon className="h-8 w-8 text-neutral-500 mb-2" />
                <span className="text-xs">Failed to load media</span>
            </div>
        );
    }

    if (attach.file_type === 'image') {
        return (
            <>
                <img
                    src={decryptedUrl}
                    alt={attach.file_name}
                    className="max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowModal(true)}
                />

                {showModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
                        {/* Close button top right */}
                        <div className="absolute top-4 right-4 flex items-center gap-3">
                            <a
                                href={decryptedUrl}
                                download={attach.file_name}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                title="Download Image"
                            >
                                <Download className="h-5 w-5" />
                            </a>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Image content */}
                        <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center relative">
                            <img
                                src={decryptedUrl}
                                alt={attach.file_name}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            />
                        </div>

                        {/* File details banner at bottom */}
                        <div className="mt-4 text-center">
                            <span className="text-sm font-semibold text-neutral-300 block truncate max-w-md">{attach.file_name}</span>
                            <span className="text-xs text-neutral-500 block mt-1">{(attach.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <a
            href={decryptedUrl}
            download={attach.file_name}
            className="flex items-center gap-3 dark:bg-black/35 bg-neutral-200/50 border dark:border-white/5 border-neutral-200 dark:hover:bg-black/55 hover:bg-neutral-200 p-3 rounded-xl transition-all cursor-pointer text-xs"
        >
            <FileText className="h-5 w-5 text-[#C88B37] shrink-0" />
            <div className="flex-1 min-w-0 pr-2">
                <span className="font-semibold block truncate dark:text-white text-neutral-900">{attach.file_name}</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">{(attach.file_size / 1024).toFixed(1)} KB</span>
            </div>
            <Download className="h-4 w-4 text-neutral-400 shrink-0" />
        </a>
    );
};

const compressAndCropImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get 2D canvas context'));
                return;
            }

            // Calculate center-crop square parameters
            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;

            // Draw center-cropped portion onto the 400x400 canvas
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);

            // Convert to JPEG blob with 85% compression quality
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas conversion to Blob failed'));
                    }
                },
                'image/jpeg',
                0.85
            );
            
            // Clean up memory
            URL.revokeObjectURL(img.src);
        };
        img.onerror = (err) => {
            reject(err);
        };
    });
};

export default function Dashboard() {
    const { auth } = usePage().props as any;
    const [currentUser, setCurrentUser] = useState<User>(auth?.user as User);

    // Chat application state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>('all');

    // Friends list state
    const [friends, setFriends] = useState<User[]>([]);

    // Friend / Search Modals State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
    const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
    const [friendsModalTab, setFriendsModalTab] = useState<'search' | 'requests'>('search');

    // Profile Settings modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'privacy' | 'appearance' | 'account'>('profile');
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [editAbout, setEditAbout] = useState(currentUser?.about || '');
    const [editLastSeen, setEditLastSeen] = useState(currentUser?.privacy_settings?.last_seen_visibility || 'everyone');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Custom tabs state
    const [customTabs, setCustomTabs] = useState<CustomTab[]>(() => {
        try {
            if (currentUser?.privacy_settings?.custom_tabs) {
                return currentUser.privacy_settings.custom_tabs;
            }
            const saved = localStorage.getItem('custom_tabs');
            return saved ? JSON.parse(saved) : [];
        } catch (_) {
            return [];
        }
    });

    const [showNewTabModal, setShowNewTabModal] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [newTabSelectedIds, setNewTabSelectedIds] = useState<number[]>([]);

    const saveTabsToServer = async (newTabs: CustomTab[]) => {
        try {
            const updatedPrivacySettings = {
                ...currentUser?.privacy_settings,
                custom_tabs: newTabs,
            };
            const response = await fetch('/web/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    privacy_settings: updatedPrivacySettings,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setCurrentUser(data.user);
                }
            }
        } catch (e) {
            console.error('Failed to sync custom tabs to server:', e);
        }
    };

    const handleCreateTab = () => {
        if (!newTabName.trim()) return;
        if (newTabSelectedIds.length === 0) return;

        const newTab: CustomTab = {
            id: 'custom_' + Date.now(),
            name: newTabName.trim(),
            selectedIds: newTabSelectedIds,
        };

        const updated = [...customTabs, newTab];
        setCustomTabs(updated);
        localStorage.setItem('custom_tabs', JSON.stringify(updated));
        saveTabsToServer(updated);

        // Reset fields
        setNewTabName('');
        setNewTabSelectedIds([]);
        setShowNewTabModal(false);

        // Switch to the newly created tab
        setActiveTab(newTab.id);
    };

    const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = customTabs.filter(t => t.id !== tabId);
        setCustomTabs(updated);
        localStorage.setItem('custom_tabs', JSON.stringify(updated));
        saveTabsToServer(updated);
        if (activeTab === tabId) {
            setActiveTab('all');
        }
    };

    // Local chat pinning state
    const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
        try {
            if (currentUser?.privacy_settings?.pinned_conversations) {
                return currentUser.privacy_settings.pinned_conversations;
            }
            const saved = localStorage.getItem('pinned_conversations');
            return saved ? JSON.parse(saved) : [];
        } catch (_) {
            return [];
        }
    });

    const savePinnedToServer = async (newPinned: number[]) => {
        try {
            const updatedPrivacySettings = {
                ...currentUser?.privacy_settings,
                pinned_conversations: newPinned,
            };
            const response = await fetch('/web/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    privacy_settings: updatedPrivacySettings,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setCurrentUser(data.user);
                }
            }
        } catch (e) {
            console.error('Failed to sync pinned chats to server:', e);
        }
    };

    const togglePin = (convId: number) => {
        setPinnedIds(prev => {
            const next = prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId];
            localStorage.setItem('pinned_conversations', JSON.stringify(next));
            savePinnedToServer(next);
            return next;
        });
    };

    // Local chat muting state
    const [mutedIds, setMutedIds] = useState<number[]>(() => {
        try {
            if (currentUser?.privacy_settings?.muted_conversations) {
                return currentUser.privacy_settings.muted_conversations;
            }
            const saved = localStorage.getItem('muted_conversations');
            return saved ? JSON.parse(saved) : [];
        } catch (_) {
            return [];
        }
    });

    const saveMutedToServer = async (newMuted: number[]) => {
        try {
            const updatedPrivacySettings = {
                ...currentUser?.privacy_settings,
                muted_conversations: newMuted,
            };
            const response = await fetch('/web/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    privacy_settings: updatedPrivacySettings,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setCurrentUser(data.user);
                }
            }
        } catch (e) {
            console.error('Failed to sync muted chats to server:', e);
        }
    };

    const toggleMute = (convId: number) => {
        setMutedIds(prev => {
            const next = prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId];
            localStorage.setItem('muted_conversations', JSON.stringify(next));
            saveMutedToServer(next);
            return next;
        });
    };

    // Right-click custom context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, convId: number } | null>(null);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    useEffect(() => {
        // Fetch fresh profile on mount to sync any updates from mobile app!
        const fetchProfile = async () => {
            try {
                const response = await fetch('/web/profile', {
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data);
                    
                    // Sync to states and localStorage!
                    if (data.privacy_settings) {
                        if (data.privacy_settings.custom_tabs) {
                            setCustomTabs(data.privacy_settings.custom_tabs);
                            localStorage.setItem('custom_tabs', JSON.stringify(data.privacy_settings.custom_tabs));
                        }
                        if (data.privacy_settings.pinned_conversations) {
                            setPinnedIds(data.privacy_settings.pinned_conversations);
                            localStorage.setItem('pinned_conversations', JSON.stringify(data.privacy_settings.pinned_conversations));
                        }
                        if (data.privacy_settings.muted_conversations) {
                            setMutedIds(data.privacy_settings.muted_conversations);
                            localStorage.setItem('muted_conversations', JSON.stringify(data.privacy_settings.muted_conversations));
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchProfile();
    }, []);

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [notifSound, setNotifSound] = useState(() => localStorage.getItem('notif_sound') !== 'off');

    // Real-time typing indicators
    const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
    const [isTyping, setIsTyping] = useState(false);

    // Presence & Online Users state
    const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
    const [activeContactProfile, setActiveContactProfile] = useState<any>(null);
    const [showFullAvatarUrl, setShowFullAvatarUrl] = useState<string | null>(null);
    const [showContactSidebar, setShowContactSidebar] = useState(false);
    const [sidebarUserProfile, setSidebarUserProfile] = useState<any>(null);
    const [sidebarView, setSidebarView] = useState<'main' | 'user'>('main');
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);

    // File Sharing state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Theme Dark/Light Mode state
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return document.documentElement.classList.contains('dark') || true;
        }
        return true;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Handle logout action via Inertia Router
    const handleLogout = () => {
        router.post('/logout');
    };

    const groupAvatarInputRef = useRef<HTMLInputElement>(null);
    const [editingGroupName, setEditingGroupName] = useState(false);
    const [editingGroupDesc, setEditingGroupDesc] = useState(false);
    const [tempGroupName, setTempGroupName] = useState('');
    const [tempGroupDesc, setTempGroupDesc] = useState('');

    const handleUpdateGroupDetails = async (updates: { name?: string; description?: string }) => {
        if (!activeConversation) return;
        try {
            const response = await fetch(`/web/conversations/${activeConversation.id}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                const updatedConv = await response.json();
                setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
                setActiveConversation(prev => prev && prev.id === updatedConv.id ? { ...prev, ...updatedConv } : prev);
            }
        } catch (e) {
            console.error('Failed to update group details:', e);
        }
    };

    const handleUploadGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeConversation) return;
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressedBlob = await compressAndCropImage(file);
            const formData = new FormData();
            formData.append('avatar', compressedBlob, 'avatar.jpg');
            const response = await fetch(`/web/conversations/${activeConversation.id}/avatar`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: formData,
            });
            if (response.ok) {
                const updatedConv = await response.json();
                setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
                setActiveConversation(prev => prev && prev.id === updatedConv.id ? { ...prev, ...updatedConv } : prev);
            }
        } catch (e) {
            console.error('Failed to upload group avatar:', e);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const activeConversationIdRef = useRef<number | null>(null);
    const currentUserRef = useRef<User | null>(null);

    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    // Fetch conversations list from Laravel Web API
    const fetchConversations = async () => {
        try {
            const response = await fetch('/web/conversations', {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();

                // Decrypt last message preview inside conversations
                const decryptedList = data.map((conv: Conversation) => {
                    if (conv.messages && conv.messages.length > 0) {
                        const lastMsg = conv.messages[0];
                        if (lastMsg.type === 'text' && lastMsg.body && (lastMsg as any).iv) {
                            const chatKey = deriveConversationKey(conv.id);
                            return {
                                ...conv,
                                messages: [{
                                    ...lastMsg,
                                    body: decryptText(lastMsg.body, chatKey, (lastMsg as any).iv)
                                }]
                            };
                        }
                    }
                    return conv;
                });

                setConversations(decryptedList);
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    // Fetch messages for active conversation
    const fetchMessages = async (conversationId: number) => {
        try {
            const response = await fetch(`/web/conversations/${conversationId}/messages`, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Decrypt E2EE messages
                const decrypted = data.map((msg: Message) => {
                    const chatKey = deriveConversationKey(conversationId);
                    let body = msg.body;
                    if (chatKey && (msg as any).iv && msg.type === 'text') {
                        try {
                            body = decryptText(msg.body, chatKey, (msg as any).iv);
                        } catch (_) {
                            body = '[Decryption Failure]';
                        }
                    }

                    // Decrypt E2EE replied message if exists
                    let decryptedReply = (msg as any).reply_to;
                    if (decryptedReply && chatKey && decryptedReply.iv && decryptedReply.type === 'text') {
                        try {
                            decryptedReply = {
                                ...decryptedReply,
                                body: decryptText(decryptedReply.body, chatKey, decryptedReply.iv)
                            };
                        } catch (_) {
                            decryptedReply = {
                                ...decryptedReply,
                                body: '[Decryption Failure]'
                            };
                        }
                    }

                    return {
                        ...msg,
                        body,
                        reply_to: decryptedReply
                    };
                });

                setMessages(decrypted);
                markAsRead(conversationId);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    // Fetch friends list
    const fetchFriends = async () => {
        try {
            const response = await fetch('/web/friends', {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setFriends(data);
            }
        } catch (err) {
            console.error('Error fetching friends:', err);
        }
    };

    // Fetch pending incoming requests
    const fetchPendingRequests = async () => {
        try {
            const response = await fetch('/web/friends/pending', {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setPendingRequests(data);
            }
        } catch (err) {
            console.error('Error fetching pending requests:', err);
        }
    };

    // Fetch sent pending requests
    const fetchSentRequests = async () => {
        try {
            const response = await fetch('/web/friends/sent', {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setSentRequests(data);
            }
        } catch (err) {
            console.error('Error fetching sent requests:', err);
        }
    };

    // Mark conversation messages as read
    const markAsRead = async (conversationId: number) => {
        try {
            await fetch(`/web/conversations/${conversationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                }
            });
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    };

    // Send a delivered/read receipt for a single message
    const sendMessageReceipt = async (messageId: number, status: 'delivered' | 'read') => {
        try {
            await fetch('/web/messages/receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    message_id: messageId,
                    status: status
                })
            });
        } catch (err) {
            console.error('Error sending message receipt:', err);
        }
    };

    // Send a message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeConversationId) return;

        if (editingMessage) {
            handleEditMessage(editingMessage.id, messageInput.trim());
            return;
        }

        const body = messageInput.trim();
        setMessageInput('');

        // Encrypt the message text body before sending to Laravel
        const chatKey = deriveConversationKey(activeConversationId);
        const encrypted = encryptText(body, chatKey);

        try {
            const response = await fetch('/web/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    conversation_id: activeConversationId,
                    type: 'text',
                    body: encrypted.ciphertext,
                    iv: encrypted.iv,
                    reply_to_message_id: replyingToMessage?.id || null,
                })
            });

            if (response.ok) {
                const newMessage = await response.json();
                // Store plaintext body locally so we see it instantly
                const localMsg = {
                    ...newMessage,
                    body: body,
                    reply_to_message_id: replyingToMessage?.id || null,
                    reply_to: replyingToMessage ? {
                        id: replyingToMessage.id,
                        sender_id: replyingToMessage.sender_id,
                        sender_name: replyingToMessage.sender_name,
                        type: replyingToMessage.type,
                        body: replyingToMessage.body,
                    } : null
                };

                setMessages(prev => {
                    if (prev.some(m => String(m.id) === String(localMsg.id))) return prev;
                    return [...prev, localMsg];
                });

                // Clear reply state
                setReplyingToMessage(null);

                // Update last message in conversation list
                setConversations(prev => prev.map(c => {
                    if (c.id === activeConversationId) {
                        return { ...c, messages: [localMsg] };
                    }
                    return c;
                }));

                sendTypingIndicator(false);
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!confirm('Are you sure you want to delete this message for everyone?')) return;
        try {
            const response = await fetch(`/web/messages/${messageId}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ everyone: true })
            });

            if (response.ok) {
                setMessages(prev => prev.map(m => {
                    if (String(m.id) === String(messageId)) {
                        return { ...m, body: '🚫 This message was deleted.', is_deleted: true, iv: null };
                    }
                    return m;
                }));

                // Update last message in conversation list
                setConversations(prev => prev.map(c => {
                    if (c.id === activeConversationId && c.messages && c.messages.length > 0) {
                        const lastMsg = c.messages[0];
                        if (String(lastMsg.id) === String(messageId)) {
                            return {
                                ...c,
                                messages: [{
                                    ...lastMsg,
                                    body: '🚫 This message was deleted.',
                                    is_deleted: true,
                                    iv: null
                                }]
                            };
                        }
                    }
                    return c;
                }));
            }
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    };

    const handleEditMessage = async (messageId: number, newBody: string) => {
        try {
            const chatKey = deriveConversationKey(activeConversationId!);
            const encrypted = encryptText(newBody, chatKey);

            const response = await fetch(`/web/messages/${messageId}/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    body: encrypted.ciphertext,
                    iv: encrypted.iv
                })
            });

            if (response.ok) {
                setMessages(prev => prev.map(m => {
                    if (String(m.id) === String(messageId)) {
                        return { ...m, body: newBody, is_edited: true, iv: encrypted.iv };
                    }
                    return m;
                }));

                // Update last message in conversation list
                setConversations(prev => prev.map(c => {
                    if (c.id === activeConversationId && c.messages && c.messages.length > 0) {
                        const lastMsg = c.messages[0];
                        if (String(lastMsg.id) === String(messageId)) {
                            return {
                                ...c,
                                messages: [{
                                    ...lastMsg,
                                    body: newBody,
                                    is_edited: true,
                                    iv: encrypted.iv
                                }]
                            };
                        }
                    }
                    return c;
                }));

                setEditingMessage(null);
                setMessageInput('');
            }
        } catch (err) {
            console.error('Error editing message:', err);
        }
    };

    // Trigger file input open
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const uploadFile = async (originalFile: File) => {
        if (!activeConversationId) return;

        setIsUploading(true);
        setUploadProgress(0);

        const ext = originalFile.name.split('.').pop()?.toLowerCase() || '';
        let fileType = 'document';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            fileType = 'image';
        }

        // Compress image before uploading
        let file: Blob | File = originalFile;
        if (fileType === 'image') {
            try {
                file = await compressImage(originalFile, 0.5);
            } catch (err) {
                console.error('Image compression failed, using original:', err);
            }
        }

        // Perform E2EE file encryption
        const chatKey = deriveConversationKey(activeConversationId);
        const fileKey = generateRandomKey();
        const fileIv = generateRandomIV();

        let encryptedBlob: Blob;
        let encryptedFileKey: string;
        try {
            encryptedBlob = await encryptBlob(file, fileKey, fileIv);
            encryptedFileKey = encryptTextWithIV(fileKey, chatKey, fileIv);
        } catch (err) {
            console.error('File encryption failed:', err);
            setIsUploading(false);
            setUploadProgress(0);
            return;
        }

        try {
            // 1. Create message log container
            const sendResponse = await fetch('/web/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    conversation_id: activeConversationId,
                    type: fileType,
                    body: `Shared file: ${originalFile.name}`,
                })
            });

            if (!sendResponse.ok) throw new Error('Failed to allocate message record.');
            const placeholderMsg = await sendResponse.json();

            // Append placeholder message locally
            setMessages(prev => [...prev, placeholderMsg]);

            // 2. Chunk upload processing (1MB chunks)
            const chunkSize = 1024 * 1024;
            const totalChunks = Math.ceil(encryptedBlob.size / chunkSize);
            const uploadId = Math.random().toString(36).substring(2, 15);

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, encryptedBlob.size);
                const chunk = encryptedBlob.slice(start, end);

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('chunk_index', i.toString());
                formData.append('total_chunks', totalChunks.toString());
                formData.append('upload_id', uploadId);
                formData.append('file_name', originalFile.name);
                formData.append('message_id', placeholderMsg.id.toString());
                formData.append('encryption_iv', fileIv);
                formData.append('encryption_key', encryptedFileKey);

                const uploadResponse = await fetch('/web/files/upload-chunk', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                    },
                    body: formData
                });

                if (!uploadResponse.ok) throw new Error('Chunk transmission failed.');
                const chunkData = await uploadResponse.json();

                const progress = Math.round(((i + 1) / totalChunks) * 100);
                setUploadProgress(progress);

                if (chunkData.status === 'completed') {
                    // Update active conversation lists
                    fetchMessages(activeConversationId);
                    fetchConversations();
                }
            }
        } catch (err) {
            console.error('File sharing error:', err);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle chunk file uploads
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !activeConversationId) return;
        uploadFile(files[0]);
    };

    // Handle drop event
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (!activeConversationId || isUploading) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    // Save profile updates
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);

        try {
            const response = await fetch('/web/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    name: editName,
                    status: editAbout,
                    last_seen_visibility: editLastSeen,
                })
            });

            if (response.ok) {
                const resData = await response.json();
                setCurrentUser(resData.user);
                setShowSettingsModal(false);
            }
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Upload profile avatar
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];

        setIsUploadingAvatar(true);

        try {
            const compressedBlob = await compressAndCropImage(file);
            const formData = new FormData();
            formData.append('avatar', compressedBlob, 'avatar.jpg');
            const response = await fetch('/web/profile/avatar', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: formData
            });

            if (response.ok) {
                const resData = await response.json();
                setCurrentUser(resData.user);
            }
        } catch (err) {
            console.error('Avatar upload failed:', err);
        } finally {
            setIsUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    // Start a chat with a friend
    const handleStartChat = async (friendId: number) => {
        try {
            const response = await fetch('/web/conversations/direct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ friend_id: friendId })
            });

            if (response.ok) {
                const newConv = await response.json();
                if (!conversations.some(c => c.id === newConv.id)) {
                    setConversations(prev => [newConv, ...prev]);
                }
                setActiveConversationId(newConv.id);
                setShowNewChatModal(false);
            }
        } catch (err) {
            console.error('Error starting chat:', err);
        }
    };

    // User Search inside Friends Modal
    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchedUsers([]);
            return;
        }
        try {
            const response = await fetch('/web/friends/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ query: query })
            });
            if (response.ok) {
                const data = await response.json();
                setSearchedUsers(data);
            }
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    // Send friend request
    const handleSendFriendRequest = async (receiverId: number) => {
        try {
            const response = await fetch('/web/friends/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ receiver_id: receiverId })
            });
            if (response.ok) {
                fetchSentRequests();
                searchUsers(friendsSearchQuery);
            }
        } catch (err) {
            console.error('Error sending friend request:', err);
        }
    };

    // Accept friend request
    const handleAcceptRequest = async (requestId: number) => {
        try {
            const response = await fetch('/web/friends/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ request_id: requestId })
            });
            if (response.ok) {
                fetchPendingRequests();
                fetchFriends();
                fetchConversations();
            }
        } catch (err) {
            console.error('Error accepting friend request:', err);
        }
    };

    // Reject friend request
    const handleRejectRequest = async (requestId: number) => {
        try {
            const response = await fetch('/web/friends/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ request_id: requestId })
            });
            if (response.ok) {
                fetchPendingRequests();
            }
        } catch (err) {
            console.error('Error rejecting friend request:', err);
        }
    };

    // Send typing status to backend
    const sendTypingIndicator = async (typing: boolean) => {
        if (!activeConversationId) return;
        try {
            await fetch('/web/messages/typing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    conversation_id: activeConversationId,
                    typing: typing
                })
            });
            setIsTyping(typing);
        } catch (err) {
            console.error('Error sending typing indicator:', err);
        }
    };

    // Handle input field keystrokes for typing indicator
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);

        if (!isTyping) {
            sendTypingIndicator(true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(false);
        }, 3000);
    };

    const showBrowserNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: body,
                    icon: '/notify-icon.png',
                    image: '/notify-icon.png',
                    badge: '/notify-icon.png',
                    silent: false
                });
            } catch (err) {
                console.error('Error displaying HTML5 notification:', err);
            }
        }
    };

    // Request browser notification permissions on load
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Listen on user-specific private channel for real-time friend updates
    useEffect(() => {
        if (!currentUser?.id) return;

        const echo = initEcho();
        const userChannel = `user.${currentUser.id}`;

        echo.private(userChannel)
            .listen('.FriendRequestUpdated', (e: any) => {
                if (e.type === 'received') {
                    showBrowserNotification('New Friend Request', `${e.senderName} sent you a friend request!`);
                    fetchPendingRequests();
                } else if (e.type === 'accepted') {
                    showBrowserNotification('Request Accepted', `${e.senderName} accepted your friend request!`);
                    fetchFriends();
                    fetchConversations();
                }
            });

        return () => {
            echo.leave(userChannel);
        };
    }, [currentUser]);

    const fetchContactProfile = async (partnerId: number) => {
        try {
            const response = await fetch(`/web/friends/profile/${partnerId}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveContactProfile(data);
            }
        } catch (err) {
            console.error('Error fetching contact profile:', err);
        }
    };

    const fetchSidebarUserProfile = async (userId: number) => {
        try {
            const response = await fetch(`/web/friends/profile/${userId}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setSidebarUserProfile(data);
            }
        } catch (err) {
            console.error('Error fetching sidebar user profile:', err);
        }
    };

    const formatLastSeen = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.round(diffMs / 60000);

            if (diffMin < 1) return 'just now';
            if (diffMin < 60) return `${diffMin}m ago`;

            const diffHrs = Math.round(diffMin / 60);
            if (diffHrs < 24) {
                return `${diffHrs}h ago`;
            }

            return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'recently';
        }
    };

    // Trigger contact profile details fetch on active chat changes
    useEffect(() => {
        if (activeConversationId) {
            const conv = conversations.find(c => c.id === activeConversationId);
            if (conv && conv.type === 'direct') {
                const partner = conv.members.find(m => m.id !== currentUser?.id);
                if (partner) {
                    fetchContactProfile(partner.id);
                    fetchSidebarUserProfile(partner.id);
                    setSidebarView('user');
                }
            } else {
                setActiveContactProfile(null);
                setSidebarUserProfile(null);
                setSidebarView('main');
            }
        } else {
            setActiveContactProfile(null);
            setSidebarUserProfile(null);
            setSidebarView('main');
            setShowContactSidebar(false);
        }
    }, [activeConversationId, conversations]);

    // Subscribing to Presence Channel for real-time online/offline statuses
    useEffect(() => {
        if (!currentUser?.id) return;

        const echo = initEcho();

        echo.join('online-users')
            .here((users: any[]) => {
                const onlineMap: Record<number, boolean> = {};
                users.forEach(u => {
                    onlineMap[u.id] = true;
                });
                setOnlineUsers(onlineMap);
            })
            .joining((user: any) => {
                setOnlineUsers(prev => ({ ...prev, [user.id]: true }));
            })
            .leaving((user: any) => {
                setOnlineUsers(prev => {
                    const copy = { ...prev };
                    delete copy[user.id];
                    return copy;
                });
            });

        return () => {
            echo.leave('online-users');
        };
    }, [currentUser]);

    // Handle outside clicks to close the three-dot menu dropdown
    useEffect(() => {
        if (!showThreeDotMenu) return;
        const handleOutsideClick = () => setShowThreeDotMenu(false);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [showThreeDotMenu]);

    // Handle tab visibility changes to mark active conversation as read when focusing back
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && activeConversationId) {
                markAsRead(activeConversationId);
                fetchMessages(activeConversationId);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeConversationId]);

    // Initialize list and setup WebSockets
    useEffect(() => {
        fetchConversations();
        fetchFriends();
        fetchPendingRequests();
        fetchSentRequests();

        const echo = initEcho();

        return () => {
            if (conversations.length > 0) {
                conversations.forEach(c => {
                    echo.leave(`conversation.${c.id}`);
                });
            }
        };
    }, []);

    // Setup Echo listener whenever conversations list changes
    useEffect(() => {
        if (conversations.length === 0) return;

        const echo = initEcho();

        conversations.forEach(conv => {
            const channelName = `conversation.${conv.id}`;

            // Join conversation private channel
            echo.private(channelName)
                .listen('MessageSent', (e: any) => {
                    const chatKey = deriveConversationKey(conv.id);
                    let body = e.body;
                    if (e.type === 'text' && e.body && e.iv) {
                        body = decryptText(e.body, chatKey, e.iv);
                    }

                    // Decrypt the reply parent if it's text and has iv
                    let decryptedReply = e.reply_to;
                    if (decryptedReply && chatKey && decryptedReply.iv && decryptedReply.type === 'text') {
                        try {
                            decryptedReply = {
                                ...decryptedReply,
                                body: decryptText(decryptedReply.body, chatKey, decryptedReply.iv)
                            };
                        } catch (_) {
                            decryptedReply = {
                                ...decryptedReply,
                                body: '[Decryption Failure]'
                            };
                        }
                    }

                    const incomingMsg: Message = {
                        id: e.id,
                        conversation_id: e.conversation_id,
                        sender_id: e.sender_id,
                        sender_name: e.sender_name,
                        type: e.type,
                        body: body,
                        is_edited: e.is_edited,
                        is_deleted: e.is_deleted,
                        created_at: e.created_at,
                        attachments: e.attachments,
                        reply_to_message_id: e.reply_to_message_id,
                        reply_to: decryptedReply
                    };

                    const currentActiveId = activeConversationIdRef.current;

                    // Always update the conversations list last message preview immediately
                    setConversations(prev => prev.map(c => {
                        if (c.id === conv.id) {
                            return {
                                ...c,
                                unread_count: currentActiveId === conv.id ? 0 : c.unread_count + 1,
                                messages: [incomingMsg]
                            };
                        }
                        return c;
                    }));

                    // Send delivery/read receipt for messages from others
                    if (incomingMsg.sender_id !== currentUserRef.current?.id) {
                        const isTabVisible = document.visibilityState === 'visible';
                        if (currentActiveId === conv.id && isTabVisible) {
                            sendMessageReceipt(incomingMsg.id, 'read');
                        } else {
                            sendMessageReceipt(incomingMsg.id, 'delivered');
                        }
                    }

                    // If it is the active conversation, append to messages list
                    if (currentActiveId === conv.id) {
                        setMessages(prev => {
                            if (prev.some(m => String(m.id) === String(incomingMsg.id))) return prev;
                            return [...prev, incomingMsg];
                        });
                        const isTabVisible = document.visibilityState === 'visible';
                        if (isTabVisible) {
                            markAsRead(conv.id);
                        }
                    }
                })
                .listen('TypingIndicator', (e: any) => {
                    const currentActiveId = activeConversationIdRef.current;
                    if (e.user_id !== currentUserRef.current?.id && conv.id === currentActiveId) {
                        setTypingUsers(prev => ({
                            ...prev,
                            [e.user_id]: e.typing
                        }));
                    }
                })
                .listen('MessageRead', (e: any) => {
                    // Update the read_by / delivered_by arrays on relevant messages
                    setMessages(prev => prev.map(m => {
                        if (String(m.id) !== String(e.message_id)) return m;
                        if (e.status === 'read') {
                            const alreadyRead = m.read_by?.includes(e.user_id);
                            return alreadyRead ? m : { ...m, read_by: [...(m.read_by || []), e.user_id] };
                        } else if (e.status === 'delivered') {
                            const alreadyDelivered = m.delivered_by?.includes(e.user_id);
                            return alreadyDelivered ? m : { ...m, delivered_by: [...(m.delivered_by || []), e.user_id] };
                        }
                        return m;
                    }));
                })
                .listen('MessageEdited', (e: any) => {
                    const chatKey = deriveConversationKey(conv.id);
                    let body = e.body;
                    if (e.iv) {
                        try {
                            body = decryptText(e.body, chatKey, e.iv);
                        } catch (err) {
                            console.error('Decryption error on edited message:', err);
                            body = '🔒 Decryption failed';
                        }
                    }

                    // Update local messages state
                    setMessages(prev => prev.map(m => {
                        if (String(m.id) === String(e.id)) {
                            return {
                                ...m,
                                body: body,
                                is_edited: true,
                                iv: e.iv,
                                updated_at: e.updated_at
                            };
                        }
                        return m;
                    }));

                    // Update last message in conversations state
                    setConversations(prev => prev.map(c => {
                        if (c.id === conv.id && c.messages && c.messages.length > 0) {
                            const lastMsg = c.messages[0];
                            if (String(lastMsg.id) === String(e.id)) {
                                return {
                                    ...c,
                                    messages: [{
                                        ...lastMsg,
                                        body: body,
                                        is_edited: true,
                                        iv: e.iv,
                                        updated_at: e.updated_at
                                    }]
                                };
                            }
                        }
                        return c;
                    }));
                })
                .listen('MessageDeleted', (e: any) => {
                    // Update local messages state
                    setMessages(prev => prev.map(m => {
                        if (String(m.id) === String(e.id)) {
                            return {
                                ...m,
                                body: '🚫 This message was deleted.',
                                is_deleted: true,
                                iv: null
                            };
                        }
                        return m;
                    }));

                    // Update last message in conversations state
                    setConversations(prev => prev.map(c => {
                        if (c.id === conv.id && c.messages && c.messages.length > 0) {
                            const lastMsg = c.messages[0];
                            if (String(lastMsg.id) === String(e.id)) {
                                return {
                                    ...c,
                                    messages: [{
                                        ...lastMsg,
                                        body: '🚫 This message was deleted.',
                                        is_deleted: true,
                                        iv: null
                                    }]
                                };
                            }
                        }
                        return c;
                    }));
                });
        });

        return () => {
            conversations.forEach(c => {
                echo.leave(`conversation.${c.id}`);
            });
        };
    }, [conversations]);

    // Periodic presence heartbeat: refresh conversations every 45s to keep online status fresh
    useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
        }, 45000);
        return () => clearInterval(interval);
    }, []);

    // Fetch messages when conversation changes
    useEffect(() => {
        if (activeConversationId) {
            fetchMessages(activeConversationId);
            setTypingUsers({});
        }
    }, [activeConversationId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Helpers to resolve metadata for chat UI
    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const getChatPartner = (conv: Conversation): User | undefined => {
        if (conv.type === 'group') return undefined;
        return conv.members.find(m => m.id !== currentUser?.id);
    };

    const getChatName = (conv: Conversation): string => {
        if (conv.type === 'group') return conv.name || 'Group Chat';
        const partner = getChatPartner(conv);
        return partner ? partner.name : 'Unknown Contact';
    };

    const getChatAvatarLetter = (conv: Conversation): string => {
        const name = getChatName(conv);
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    const getChatAvatarUrl = (conv: Conversation): string | undefined => {
        if (conv.type === 'group') return conv.avatar_url;
        return getChatPartner(conv)?.avatar_url;
    };

    const getChatAvatarThumbUrl = (conv: Conversation): string | undefined => {
        if (conv.type === 'group') return conv.avatar_thumb_url || conv.avatar_url;
        const partner = getChatPartner(conv) as any;
        return partner?.avatar_thumb_url || partner?.avatar_url;
    };

    // Use live WebSocket presence map — not stale DB field
    const isPartnerOnline = (conv: Conversation): boolean => {
        if (conv.type === 'group') return false;
        const partner = getChatPartner(conv);
        return partner ? onlineUsers[partner.id] === true : false;
    };

    // Filter conversations list based on tabs & search query
    const filteredConversations = conversations.filter(c => {
        const matchesSearch = getChatName(c).toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeTab === 'unread') {
            return c.unread_count > 0;
        }

        if (activeTab !== 'all') {
            const customTab = customTabs.find(t => t.id === activeTab);
            if (customTab) {
                return customTab.selectedIds.includes(c.id);
            }
        }

        return true;
    });

    // Sort conversations: pinned ones at the top, then by last message timestamp (or updated_at)
    const sortedConversations = [...filteredConversations].sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        const aTime = new Date(a.messages?.[0]?.created_at || a.created_at || 0).getTime();
        const bTime = new Date(b.messages?.[0]?.created_at || b.created_at || 0).getTime();
        return bTime - aTime;
    });

    const isSomeoneTyping = Object.values(typingUsers).some(status => status === true);

    return (
        <div className={`relative flex h-screen w-screen overflow-hidden font-sans selection:bg-[#C88B37]/30 selection:text-white transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-neutral-50 text-neutral-800'
            }`}>
            <Head title="Chat Workspace" />

            <div className={`flex h-full w-full overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0C0C0C]' : 'bg-white'
                }`}>

                {/* Left Side: Chat List */}
                <div className={`w-full flex-col border-r shrink-0 transition-colors duration-300 md:max-w-md ${activeConversationId ? 'hidden md:flex' : 'flex'
                    } ${isDark ? 'border-white/5 bg-[#0F0F0F]' : 'border-neutral-200 bg-white'
                    }`}>

                    {/* Header: App Brand Logo / Contacts / Settings / Create Chat */}
                    <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 border-neutral-200 transition-colors duration-300">
                        <div className="flex items-center gap-3">
                            <img src="/jklogo.png" alt="JK Logo" className="h-9 object-contain" />
                            <span className="font-bold tracking-tight dark:text-white text-neutral-800 text-sm transition-colors duration-300">
                                JK<span className="text-[#C88B37]">Chat</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Manage Friends Button */}
                            <button
                                onClick={() => {
                                    fetchPendingRequests();
                                    fetchSentRequests();
                                    setShowFriendsModal(true);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full border dark:border-white/10 border-neutral-200 dark:bg-white/5 bg-neutral-50 text-[#C88B37] hover:bg-[#C88B37]/15 hover:border-[#C88B37]/45 transition-all shadow-[0_0_10px_rgba(200,139,55,0.05)] cursor-pointer"
                                title="Manage Contacts & Invites"
                            >
                                <UserPlus className="h-4.5 w-4.5" />
                            </button>

                            {/* Profile Settings Button */}
                            <button
                                onClick={() => {
                                    setEditName(currentUser?.name || '');
                                    setEditAbout(currentUser?.about || '');
                                    setEditLastSeen(currentUser?.privacy_settings?.last_seen_visibility || 'everyone');
                                    setShowSettingsModal(true);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full border dark:border-white/10 border-neutral-200 dark:bg-white/5 bg-neutral-50 text-[#C88B37] hover:bg-[#C88B37]/15 hover:border-[#C88B37]/45 transition-all shadow-[0_0_10px_rgba(200,139,55,0.05)] cursor-pointer"
                                title="Profile Settings"
                            >
                                <Settings className="h-4.5 w-4.5" />
                            </button>

                            {/* Create Chat Button */}
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border dark:border-white/10 border-neutral-200 dark:bg-white/5 bg-neutral-50 text-[#C88B37] hover:bg-[#C88B37]/15 hover:border-[#C88B37]/45 transition-all shadow-[0_0_10px_rgba(200,139,55,0.05)] cursor-pointer"
                                title="New Conversation"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Glass Search Input */}
                    <div className="px-5 py-3">
                        <div className="relative flex h-10 w-full items-center rounded-full border dark:border-white/8 border-neutral-200/80 dark:bg-white/[0.02] bg-neutral-50/50 px-4 focus-within:border-[#C88B37]/60 focus-within:ring-1 focus-within:ring-[#C88B37]/60 focus-within:shadow-[0_0_12px_rgba(200,139,55,0.12)] transition-all duration-300">
                            <Search className="h-3.5 w-3.5 text-neutral-400 mr-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search users, groups, chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-xs dark:text-neutral-200 text-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none border-none focus:ring-0 p-0 transition-colors duration-300"
                            />
                        </div>
                    </div>

                    {/* Filter Navigation Shell */}
                    <div className="flex items-center gap-2 px-5 py-2 overflow-x-auto scrollbar-none transition-colors duration-300">
                        {/* Default Tab: All */}
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'all'
                                    ? 'bg-[#C88B37] text-white font-bold'
                                    : 'dark:bg-white/5 bg-neutral-100 dark:text-white/60 text-neutral-600 border dark:border-white/5 border-neutral-200'
                                }`}
                        >
                            All Chats
                        </button>

                        {/* Default Tab: Unread */}
                        <button
                            onClick={() => setActiveTab('unread')}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'unread'
                                    ? 'bg-[#C88B37] text-white font-bold'
                                    : 'dark:bg-white/5 bg-neutral-100 dark:text-white/60 text-neutral-600 border dark:border-white/5 border-neutral-200'
                                }`}
                        >
                            Unread
                        </button>

                        {/* Custom Tabs */}
                        {customTabs.map(tab => (
                            <div key={tab.id} className="relative group/tab flex items-center shrink-0">
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pl-3 pr-7 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id
                                            ? 'bg-[#C88B37] text-white font-bold'
                                            : 'dark:bg-white/5 bg-neutral-100 dark:text-white/60 text-neutral-600 border dark:border-white/5 border-neutral-200'
                                        }`}
                                >
                                    {tab.name}
                                </button>
                                <button
                                    onClick={(e) => handleDeleteTab(tab.id, e)}
                                    className={`absolute right-1.5 p-0.5 rounded-full cursor-pointer transition-colors ${activeTab === tab.id ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-neutral-500 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-white/10'
                                        }`}
                                    title="Delete custom tab"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}

                        {/* Add Custom Tab Button */}
                        <button
                            onClick={() => setShowNewTabModal(true)}
                            className="flex items-center justify-center p-1.5 rounded-full dark:bg-white/5 bg-neutral-100 dark:text-neutral-400 text-neutral-600 dark:hover:text-white hover:text-neutral-900 border dark:border-white/5 border-neutral-200 cursor-pointer shrink-0"
                            title="Add Custom Tab"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Conversations List Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {sortedConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
                                <MessageSquare className="h-8 w-8 mb-2 text-[#C88B37]/45" />
                                <span className="text-xs">No conversations found</span>
                            </div>
                        ) : (
                            sortedConversations.map(conv => {
                                const isSelected = conv.id === activeConversationId;
                                const chatName = getChatName(conv);
                                const lastMessage = conv.messages && conv.messages[0];
                                const partner = getChatPartner(conv);
                                const isOnline = partner && onlineUsers[partner.id] === true;

                                return (
                                    <div
                                        key={`conv-${conv.id}`}
                                        onClick={() => setActiveConversationId(conv.id)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                convId: conv.id
                                            });
                                        }}
                                        className={`group flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all border animate-chat-entry ${isSelected
                                                ? 'bg-[#C88B37]/10 border-[#C88B37]/35 shadow-[0_4px_12px_rgba(200,139,55,0.05)] text-white'
                                                : 'bg-transparent border-transparent dark:hover:bg-white/[0.02] hover:bg-neutral-50 dark:hover:border-white/5 hover:border-neutral-200'
                                            }`}
                                    >
                                        {/* Avatar Ring */}
                                        <div className="relative">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C88B37]/40 bg-[#C88B37]/10 text-[#C88B37] font-bold text-base shadow-[0_0_8px_rgba(200,139,55,0.1)] overflow-hidden">
                                                {getChatAvatarThumbUrl(conv) ? (
                                                    <img src={getChatAvatarThumbUrl(conv)} alt={chatName} className="h-full w-full object-cover" />
                                                ) : conv.type === 'group' ? (
                                                    <Users className="h-5 w-5" />
                                                ) : (
                                                    getChatAvatarLetter(conv)
                                                )}
                                            </div>
                                            {isOnline && (
                                                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0C0C0C] bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                                            )}
                                        </div>

                                        {/* Info Column */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-semibold dark:text-white text-neutral-900 text-sm truncate">{chatName}</span>
                                                <div className="flex items-center gap-1">
                                                    {pinnedIds.includes(conv.id) && (
                                                        <Pin className="h-3 w-3 text-[#C88B37] rotate-45 shrink-0" />
                                                    )}
                                                    {lastMessage && (
                                                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                                                            {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate min-w-0 flex-1 mr-2">
                                                    {lastMessage ? (
                                                        lastMessage.is_deleted ? (
                                                            <span className="truncate">🚫 This message was deleted</span>
                                                        ) : lastMessage.type === 'image' ? (
                                                            <>
                                                                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#C88B37]/80" />
                                                                <span className="truncate">Photo</span>
                                                            </>
                                                        ) : lastMessage.type === 'document' ? (
                                                            <>
                                                                <FileText className="h-3.5 w-3.5 shrink-0 text-[#C88B37]/80" />
                                                                <span className="truncate">Document</span>
                                                            </>
                                                        ) : (
                                                            <span className="truncate">{lastMessage.body}</span>
                                                        )
                                                    ) : (
                                                        <span className="truncate text-neutral-500/80">No messages yet</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin(conv.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded transition-opacity cursor-pointer shrink-0"
                                                        title={pinnedIds.includes(conv.id) ? "Unpin Chat" : "Pin Chat"}
                                                    >
                                                        <Pin className={`h-3 w-3 ${pinnedIds.includes(conv.id) ? 'text-[#C88B37] fill-[#C88B37]' : 'text-neutral-400'}`} />
                                                    </button>
                                                    {conv.unread_count > 0 && (
                                                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C88B37] px-1 text-[10px] font-bold text-black shadow-[0_0_8px_rgba(200,139,55,0.3)]">
                                                            {conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Active Chat Area */}
                <div className={`flex-1 flex-col relative transition-colors duration-300 ${activeConversationId ? 'flex' : 'hidden md:flex'
                    } ${isDark ? 'bg-[#080808]' : 'bg-neutral-100'
                    }`}>

                    {!activeConversation ? (
                        /* Empty Screen Placeholder: Premium Gold logo glass card */
                        <div className={`flex flex-1 flex-col items-center justify-center text-center p-6 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#080808]' : 'bg-neutral-50'
                            }`}>
                            {/* Premium Floating Glow Particles */}
                            <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-[#C88B37]/[0.02] dark:bg-[#C88B37]/[0.03] filter blur-[80px] animate-[pulse_6s_ease-in-out_infinite]" />
                            <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#C88B37]/[0.01] dark:bg-[#C88B37]/[0.02] filter blur-[100px] animate-[pulse_8s_ease-in-out_infinite_1s]" />

                            <div className={`rounded-3xl p-10 max-w-md flex flex-col items-center relative z-10 transition-all duration-300 ${isDark
                                    ? 'glass-panel shadow-[0_30px_70px_rgba(0,0,0,0.5),_0_0_50px_rgba(200,139,55,0.02)]'
                                    : 'light-glass-panel shadow-[0_30px_70px_rgba(0,0,0,0.04),_0_0_50px_rgba(200,139,55,0.01)]'
                                }`}>

                                {/* Dual Rotating Rings Outer Layout */}
                                <div className="relative h-28 w-28 flex items-center justify-center mb-8">
                                    {/* Pulse aura */}
                                    <div className="absolute inset-0 rounded-full bg-[#C88B37]/10 animate-ping opacity-75" />

                                    {/* Clockwise Outer Ring */}
                                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#C88B37]/40 animate-[spin_20s_linear_infinite]" />

                                    {/* Counter-Clockwise Inner Ring */}
                                    <div className="absolute inset-3 rounded-full border border-dashed border-[#C88B37]/25 animate-[spin_12s_linear_infinite_reverse]" />

                                    {/* Solid Core Shield Wrapper */}
                                    <div className="h-16 w-16 rounded-2xl border border-[#C88B37]/35 bg-[#C88B37]/10 flex items-center justify-center shadow-[0_0_30px_rgba(200,139,55,0.15)] relative z-10">
                                        <ShieldCheck className="h-8 w-8 text-[#C88B37] animate-[pulse_3s_ease-in-out_infinite]" />
                                    </div>
                                </div>

                                <img src="/jklogo.png" alt="JK Logo" className="h-10 object-contain mb-3 filter drop-shadow-[0_0_8px_rgba(200,139,55,0.2)]" />

                                <h3 className="text-xl font-bold mb-3 tracking-tight">
                                    <span className="bg-gradient-to-r from-[#C88B37] via-[#f3cb8c] to-[#ae7428] bg-clip-text text-transparent">
                                        JK Chat
                                    </span>
                                </h3>

                                <p className="text-xs dark:text-neutral-400 text-neutral-500 leading-relaxed max-w-xs mb-8 transition-colors duration-300">
                                    Select a contact from the sidebar or request a new friend invitation to begin secure, real-time end-to-end encrypted messaging.
                                </p>

                                {/* Feature Capabilities Badges Grid */}
                                <div className="grid grid-cols-2 gap-3 w-full border-t dark:border-white/5 border-neutral-200 pt-6">
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 hover:border-[#C88B37]/30 transition-all duration-300">
                                        <ShieldCheck className="h-4 w-4 text-[#C88B37]" />
                                        <span className="text-[10px] font-semibold dark:text-neutral-300 text-neutral-700">AES-256 E2EE</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 hover:border-[#C88B37]/30 transition-all duration-300">
                                        <ClockIcon className="h-4 w-4 text-[#C88B37]" />
                                        <span className="text-[10px] font-semibold dark:text-neutral-300 text-neutral-700">Instant Sync</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className="flex flex-1 flex-row h-full overflow-hidden relative"
                        >
                            {/* Drag & Drop Glass overlay */}
                            {isDragging && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-30 flex flex-col items-center justify-center transition-all duration-300 border-2 border-dashed border-[#C88B37]/60 m-4 rounded-3xl">
                                    <div className="flex flex-col items-center gap-4 text-center animate-pulse">
                                        <div className="h-16 w-16 rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 flex items-center justify-center text-[#C88B37] shadow-[0_0_15px_rgba(200,139,55,0.25)]">
                                            <UploadCloud className="h-8 w-8 text-[#C88B37]" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white tracking-tight leading-snug">Drag & Drop Secure File</h3>
                                            <p className="text-xs text-neutral-400 font-semibold mt-1">Release file here to instantly encrypt and share</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Chat Panel */}
                            <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">

                                {/* Chat View Header: Floating Liquid Glass Banner */}
                                <div className={`flex items-center justify-between px-6 py-3 border-b relative z-10 transition-all duration-300 ${isDark ? 'border-white/5 bg-[#0F0F0F]' : 'border-neutral-200 bg-white'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {/* Mobile Back Navigation Arrow */}
                                        <button
                                            onClick={() => setActiveConversationId(null)}
                                            className="mr-1 p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors md:hidden cursor-pointer"
                                            title="Back to List"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>

                                        <div
                                            className="flex items-center gap-3 cursor-pointer group/header"
                                            onClick={() => setShowContactSidebar(prev => !prev)}
                                            title="View contact info"
                                        >
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 text-[#C88B37] font-bold text-sm overflow-hidden shadow-[0_0_8px_rgba(200,139,55,0.1)] group-hover/header:border-[#C88B37] transition-all"
                                            >
                                                {getChatAvatarUrl(activeConversation) ? (
                                                    <img src={getChatAvatarUrl(activeConversation)} alt={getChatName(activeConversation)} className="h-full w-full object-cover" />
                                                ) : activeConversation.type === 'group' ? (
                                                    <Users className="h-5 w-5" />
                                                ) : (
                                                    getChatAvatarLetter(activeConversation)
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold dark:text-white text-neutral-900 text-sm group-hover/header:text-[#C88B37] transition-colors">{getChatName(activeConversation)}</h4>

                                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                                    {isSomeoneTyping ? (
                                                        <span className="text-[#C88B37] font-semibold animate-pulse">is typing...</span>
                                                    ) : (
                                                        (() => {
                                                            const partner = activeConversation.type === 'direct' ? getChatPartner(activeConversation) : null;
                                                            const isOnline = partner && onlineUsers[partner.id] === true;

                                                            if (isOnline) {
                                                                return (
                                                                    <>
                                                                        <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500 animate-ping" />
                                                                        Online
                                                                    </>
                                                                );
                                                            }

                                                            if (activeContactProfile?.last_seen_at) {
                                                                return `Last seen ${formatLastSeen(activeContactProfile.last_seen_at)}`;
                                                            }

                                                            return 'Offline';
                                                        })()
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowMessageSearch(prev => !prev)}
                                            className="p-2 rounded-full dark:hover:bg-white/5 hover:bg-neutral-100 text-neutral-400 dark:hover:text-white hover:text-neutral-900 transition-colors cursor-pointer"
                                            title="Search in chat"
                                        >
                                            <Search className="h-4 w-4" />
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowThreeDotMenu(prev => !prev);
                                                }}
                                                className="p-2 rounded-full dark:hover:bg-white/5 hover:bg-neutral-100 text-neutral-400 dark:hover:text-white hover:text-neutral-900 transition-colors cursor-pointer"
                                                title="More options"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>

                                            {showThreeDotMenu && (
                                                <div className="absolute right-0 mt-2 w-48 rounded-xl border dark:border-white/5 border-neutral-200 dark:bg-[#121212]/95 bg-white shadow-xl z-50 py-1.5 backdrop-blur-md">
                                                    <button
                                                        onClick={() => {
                                                            setShowContactSidebar(prev => !prev);
                                                            setShowThreeDotMenu(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs dark:text-neutral-300 text-neutral-700 dark:hover:bg-white/5 hover:bg-neutral-100 flex items-center gap-2"
                                                    >
                                                        <Info className="h-3.5 w-3.5 text-[#C88B37]" />
                                                        View Contact Info
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowMessageSearch(prev => !prev);
                                                            setShowThreeDotMenu(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs dark:text-neutral-300 text-neutral-700 dark:hover:bg-white/5 hover:bg-neutral-100 flex items-center gap-2"
                                                    >
                                                        <Search className="h-3.5 w-3.5 text-[#C88B37]" />
                                                        Search Messages
                                                    </button>
                                                    <div className="border-t dark:border-white/5 border-neutral-100 my-1" />
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Are you sure you want to clear this conversation history? An admin can restore it later if needed.')) {
                                                                try {
                                                                    const response = await fetch(`/web/conversations/${activeConversationId}/clear`, {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Accept': 'application/json',
                                                                            'Content-Type': 'application/json',
                                                                            'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                                                                        },
                                                                        body: JSON.stringify({ mode: 'clear' }),
                                                                    });
                                                                    if (response.ok) {
                                                                        setMessages([]);
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to clear chat:', err);
                                                                }
                                                            }
                                                            setShowThreeDotMenu(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                        Clear Chat History
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Message Search Bar */}
                                {showMessageSearch && (
                                    <div className="px-6 py-2 border-b dark:border-white/5 border-neutral-200 flex items-center gap-2 dark:bg-[#0F0F0F] bg-white relative z-10">
                                        <div className="flex-1 relative flex h-9 items-center rounded-full border dark:border-white/10 border-neutral-200 dark:bg-white/[0.02] bg-neutral-50 px-3.5 focus-within:border-[#C88B37]/60 focus-within:ring-1 focus-within:ring-[#C88B37]/60 focus-within:shadow-[0_0_10px_rgba(200,139,55,0.1)] transition-all duration-300">
                                            <Search className="h-3.5 w-3.5 text-neutral-400 mr-2" />
                                            <input
                                                type="text"
                                                placeholder="Search messages..."
                                                value={messageSearchQuery}
                                                onChange={(e) => setMessageSearchQuery(e.target.value)}
                                                className="flex-1 bg-transparent text-xs outline-none border-none dark:text-white text-neutral-800 dark:placeholder-neutral-500 placeholder-neutral-400 focus:ring-0 p-0"
                                                autoFocus
                                            />
                                            {messageSearchQuery && (
                                                <button
                                                    onClick={() => setMessageSearchQuery('')}
                                                    className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-white font-medium cursor-pointer ml-1"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowMessageSearch(false);
                                                setMessageSearchQuery('');
                                            }}
                                            className="text-xs text-neutral-500 dark:hover:text-white hover:text-neutral-900 ml-1 transition-colors cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                                <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 transition-all duration-300 relative ${isDark ? 'bg-gradient-to-b from-[#080808] via-[#0D0A08] to-[#0A0A0A]' : 'bg-[#FAF8F5]'
                                    }`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(200,139,55,0.04),transparent_50%)] pointer-events-none z-0" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,139,55,0.02),transparent_50%)] pointer-events-none z-0" />

                                    {messages.filter(msg =>
                                        !messageSearchQuery ||
                                        (msg.body && msg.body.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                                    ).map((msg, index) => {
                                        const isMe = msg.sender_id === currentUser?.id;
                                        const showName = !isMe && activeConversation.type === 'group';
                                        const hasAttachments = msg.attachments && msg.attachments.length > 0;

                                        return (
                                            <div
                                                key={`msg-${msg.id || 'temp'}-${index}`}
                                                id={`msg-${msg.id}`}
                                                className={`flex flex-col max-w-[70%] relative z-10 transition-all duration-350 rounded-2xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                            >
                                                {showName && (
                                                    <span className="text-[10px] text-[#C88B37] font-semibold mb-1 ml-2">{msg.sender_name}</span>
                                                )}

                                                {/* Chat Bubble */}
                                                <div className={`text-sm leading-relaxed relative group/msg ${msg.type === 'image'
                                                        ? 'p-1.5 rounded-2xl border dark:border-white/5 border-neutral-200/50 dark:bg-white/[0.01] bg-neutral-100 max-w-sm'
                                                        : isMe
                                                            ? 'p-3 bubble-sent text-white'
                                                            : 'p-3 bubble-received border dark:border-white/5 border-neutral-200/50 shadow-sm transition-all duration-200'
                                                    }`}>

                                                    {/* Hover Actions Menu */}
                                                    {!msg.is_deleted && (
                                                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 z-20 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                                            <button
                                                                onClick={() => {
                                                                    setReplyingToMessage(msg);
                                                                    setEditingMessage(null); // Clear editing when starting reply
                                                                }}
                                                                className="p-1 rounded-md dark:bg-black/50 bg-white dark:hover:bg-[#C88B37]/15 hover:bg-neutral-100 text-neutral-400 dark:hover:text-[#C88B37] hover:text-[#C88B37] transition-all cursor-pointer border dark:border-white/10 border-neutral-200 shadow-sm"
                                                                title="Reply"
                                                            >
                                                                <CornerUpLeft className="h-3.5 w-3.5" />
                                                            </button>
                                                            {isMe && msg.type === 'text' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingMessage(msg);
                                                                            setMessageInput(msg.body);
                                                                            setReplyingToMessage(null); // Clear reply when starting editing
                                                                        }}
                                                                        className="p-1 rounded-md dark:bg-black/50 bg-white dark:hover:bg-[#C88B37]/15 hover:bg-neutral-100 text-neutral-400 dark:hover:text-[#C88B37] hover:text-[#C88B37] transition-all cursor-pointer border dark:border-white/10 border-neutral-200 shadow-sm"
                                                                        title="Edit Message"
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                                        className="p-1 rounded-md dark:bg-black/50 bg-white dark:hover:bg-red-500/15 hover:bg-neutral-100 text-neutral-400 dark:hover:text-red-500 hover:text-red-600 transition-all cursor-pointer border dark:border-white/10 border-neutral-200 shadow-sm"
                                                                        title="Delete Message"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Quoted Reply Preview */}
                                                    {msg.reply_to && (
                                                        <div
                                                            className={`mb-2 p-2 rounded-lg border-l-[3px] text-xs transition-colors flex items-center justify-between gap-4 cursor-pointer select-none ${isMe
                                                                    ? 'bg-black/15 border-[#C88B37] text-neutral-200 hover:bg-black/25'
                                                                    : 'bg-neutral-100/60 dark:bg-white/5 border-[#C88B37] dark:text-neutral-300 text-neutral-600 hover:bg-[#C88B37]/10 dark:hover:bg-white/10'
                                                                }`}
                                                            onClick={() => {
                                                                const element = document.getElementById(`msg-${msg.reply_to!.id}`);
                                                                if (element) {
                                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    element.classList.add('pulse-highlight');
                                                                    setTimeout(() => {
                                                                        element.classList.remove('pulse-highlight');
                                                                    }, 1500);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-[#C88B37] text-[10px] mb-0.5">
                                                                    {msg.reply_to.sender_name || 'Staff'}
                                                                </span>
                                                                <p className="truncate opacity-80 max-w-[200px] flex items-center gap-1">
                                                                    {msg.reply_to.type === 'image' || msg.reply_to.body.includes('Photo') || msg.reply_to.body.includes('📷') ? (
                                                                        <>
                                                                            <ImageIcon className="h-3 w-3 inline text-[#C88B37] shrink-0" />
                                                                            <span>Photo</span>
                                                                        </>
                                                                    ) : msg.reply_to.type === 'document' || msg.reply_to.body.includes('Document') || msg.reply_to.body.includes('📄') || msg.reply_to.body.includes('File') ? (
                                                                        <>
                                                                            <FileText className="h-3 w-3 inline text-[#C88B37] shrink-0" />
                                                                            <span>Document</span>
                                                                        </>
                                                                    ) : (
                                                                        msg.reply_to.body
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <CornerUpLeft className="h-3 w-3 opacity-40 shrink-0" />
                                                        </div>
                                                    )}

                                                    {/* File Sharing Attachment rendering */}
                                                    {hasAttachments ? (
                                                        <div className="space-y-2">
                                                            {msg.attachments!.map((attach, aIdx) => (
                                                                <div key={`attach-${attach.id || aIdx}`} className="rounded-xl overflow-hidden max-w-sm">
                                                                    <DecryptedAttachment
                                                                        attach={attach}
                                                                        conversationId={activeConversationId!}
                                                                    />
                                                                </div>
                                                            ))}
                                                            <div className="flex items-center justify-between gap-4 mt-1">
                                                                {msg.type !== 'image' ? (
                                                                    <p className="text-xs opacity-90 break-all">{msg.body}</p>
                                                                ) : (
                                                                    <span />
                                                                )}
                                                                <div className="flex items-center gap-1 shrink-0 text-[9px] opacity-70 select-none ml-auto">
                                                                    {msg.is_edited && <span className="text-[#C88B37]/70 italic">edited</span>}
                                                                    <span>
                                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {isMe && (
                                                                        <MessageStatusTick
                                                                            readBy={msg.read_by || []}
                                                                            deliveredBy={msg.delivered_by || []}
                                                                            conversationMembers={activeConversation?.members || []}
                                                                            currentUserId={currentUser?.id}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap break-words text-sm">
                                                            {msg.body}
                                                            <span className="inline-flex items-center gap-1 ml-2 text-[9px] opacity-70 select-none align-bottom">
                                                                {msg.is_edited && <span className="text-[#C88B37]/70 italic mr-0.5">edited</span>}
                                                                <span>
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isMe && (
                                                                    <MessageStatusTick
                                                                        readBy={msg.read_by || []}
                                                                        deliveredBy={msg.delivered_by || []}
                                                                        conversationMembers={activeConversation?.members || []}
                                                                        currentUserId={currentUser?.id}
                                                                    />
                                                                )}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Real-time Typing Bubble indicator */}
                                    {isSomeoneTyping && (
                                        <div className="flex items-center gap-2 max-w-[70%] mr-auto items-start">
                                            <div className="p-3 rounded-2xl border dark:border-white/5 border-neutral-200 dark:bg-white/5 bg-white text-xs dark:text-neutral-400 text-neutral-500 flex items-center gap-1 px-4 py-2">
                                                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Upload Progress Loader Card */}
                                {isUploading && (
                                    <div className="mx-6 mb-3 p-3.5 rounded-xl border border-[#C88B37]/45 bg-[#C88B37]/5 backdrop-blur-md flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <LoaderCircle className="h-4.5 w-4.5 text-[#C88B37] animate-spin" />
                                            <span className="text-xs text-neutral-300 font-semibold">Uploading attachment...</span>
                                        </div>
                                        <span className="text-xs text-[#C88B37] font-bold">{uploadProgress}%</span>
                                    </div>
                                )}

                                {/* Editing Message Header */}
                                {editingMessage && (
                                    <div className={`px-6 py-2 border-t flex items-center justify-between text-xs transition-colors ${isDark ? 'bg-[#C88B37]/10 border-white/5 text-neutral-300' : 'bg-[#C88B37]/5 border-neutral-200 text-neutral-700'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <Edit2 className="h-3.5 w-3.5 text-[#C88B37]" />
                                            <span>Editing message: <strong className="dark:text-white text-neutral-900 font-semibold">"{editingMessage.body}"</strong></span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingMessage(null);
                                                setMessageInput('');
                                            }}
                                            className="text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {/* Replying Message Header */}
                                {replyingToMessage && (
                                    <div className={`px-6 py-2 border-t flex items-center justify-between text-xs transition-colors ${isDark ? 'bg-[#C88B37]/10 border-white/5 text-neutral-300' : 'bg-[#C88B37]/5 border-neutral-200 text-neutral-700'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <CornerUpLeft className="h-3.5 w-3.5 text-[#C88B37]" />
                                            <span>
                                                Replying to <strong className="text-[#C88B37] font-semibold">{replyingToMessage.sender_name}</strong>:{' '}
                                                {replyingToMessage.type === 'image' || replyingToMessage.body.includes('Photo') || replyingToMessage.body.includes('📷') ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] dark:text-neutral-400 text-neutral-600 italic">
                                                        <ImageIcon className="h-3 w-3 text-[#C88B37]" /> Photo
                                                    </span>
                                                ) : replyingToMessage.type === 'document' || replyingToMessage.body.includes('Document') || replyingToMessage.body.includes('📄') || replyingToMessage.body.includes('File') ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] dark:text-neutral-400 text-neutral-600 italic">
                                                        <FileText className="h-3 w-3 text-[#C88B37]" /> Document
                                                    </span>
                                                ) : (
                                                    <span className="dark:text-neutral-400 text-neutral-600 italic text-[11px]">"{replyingToMessage.body}"</span>
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReplyingToMessage(null);
                                            }}
                                            className="text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {/* Message Composer Panel */}
                                <div className="p-4 bg-transparent relative z-10 w-full shrink-0">
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="flex items-center gap-2 p-1.5 pl-3 rounded-full border dark:border-white/10 border-neutral-200 dark:bg-white/[0.03] bg-neutral-50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-lg max-w-4xl mx-auto w-full focus-within:border-[#C88B37]/60 focus-within:shadow-[0_8px_32px_rgba(200,139,55,0.08)] transition-all duration-300"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={triggerFileSelect}
                                            className="p-2 rounded-full text-neutral-400 dark:hover:text-white hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Upload File"
                                            disabled={isUploading}
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </button>

                                        <input
                                            type="text"
                                            placeholder="Type your secure message..."
                                            value={messageInput}
                                            onChange={handleInputChange}
                                            className="flex-1 bg-transparent outline-none border-none text-sm dark:text-neutral-100 text-neutral-800 dark:placeholder-neutral-500 placeholder-neutral-400 focus:ring-0 px-2 py-2.5 transition-colors duration-300 min-w-0"
                                            disabled={isUploading}
                                        />

                                        <button
                                            type="button"
                                            className="p-2 rounded-full text-neutral-400 hover:text-[#C88B37] hover:bg-neutral-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Add Emoji"
                                        >
                                            <Smile className="h-4.5 w-4.5" />
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={!messageInput.trim() || isUploading}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C88B37] hover:bg-[#ae7428] text-black shadow-[0_4px_12px_rgba(200,139,55,0.25)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none transition-all duration-200 cursor-pointer shrink-0"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Contact/Group Profile Sidebar */}
                            {showContactSidebar && (
                                <div className={`w-full md:w-80 lg:w-96 h-full shrink-0 border-l dark:border-white/5 border-neutral-200 flex flex-col z-20 absolute md:relative right-0 top-0 transition-all duration-300 shadow-2xl md:shadow-none ${isDark ? 'bg-[#0F0F0F]' : 'bg-white'
                                    }`}>
                                    {/* Sidebar Header */}
                                    <div className="h-16 flex items-center justify-between px-6 border-b dark:border-white/5 border-neutral-200">
                                        <div className="flex items-center gap-2">
                                            {sidebarView === 'user' && activeConversation.type === 'group' && (
                                                <button
                                                    onClick={() => {
                                                        setSidebarView('main');
                                                        setSidebarUserProfile(null);
                                                    }}
                                                    className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer mr-1"
                                                    title="Back to group members"
                                                >
                                                    <ArrowLeft className="h-4.5 w-4.5" />
                                                </button>
                                            )}
                                            <span className="font-bold text-sm tracking-wide dark:text-neutral-200 text-neutral-800">
                                                {activeConversation.type === 'group' && sidebarView === 'main' ? 'Group Details' : 'Contact Info'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowContactSidebar(false)}
                                            className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                                            title="Close panel"
                                        >
                                            <X className="h-4.5 w-4.5" />
                                        </button>
                                    </div>

                                    {/* Sidebar Content */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                        {activeConversation.type === 'group' && sidebarView === 'main' ? (
                                            /* Render Group details & Member list */
                                            <div className="space-y-6">
                                                {/* Group Avatar and Name */}
                                                <div className="flex flex-col items-center text-center">
                                                    <input
                                                        type="file"
                                                        ref={groupAvatarInputRef}
                                                        onChange={handleUploadGroupAvatar}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                    <div
                                                        onClick={() => groupAvatarInputRef.current?.click()}
                                                        className="relative h-28 w-28 flex items-center justify-center mb-4 cursor-pointer group/avatar"
                                                    >
                                                        <div className="absolute inset-0 rounded-full bg-[#C88B37]/10 animate-pulse group-hover/avatar:bg-[#C88B37]/20 transition-all" />
                                                        <div className="h-24 w-24 rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 flex items-center justify-center text-[#C88B37] font-bold text-2xl shadow-[0_0_15px_rgba(200,139,55,0.15)] relative z-10 overflow-hidden">
                                                            {getChatAvatarUrl(activeConversation) ? (
                                                                <img src={getChatAvatarUrl(activeConversation)} alt={getChatName(activeConversation)} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <Users className="h-8 w-8" />
                                                            )}
                                                            {/* Camera overlay */}
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20">
                                                                <Camera className="h-5 w-5 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {editingGroupName ? (
                                                        <div className="flex items-center gap-2 mt-2 w-full max-w-[220px] justify-center">
                                                            <input
                                                                type="text"
                                                                value={tempGroupName}
                                                                onChange={(e) => setTempGroupName(e.target.value)}
                                                                className="flex-1 bg-neutral-100 dark:bg-white/5 border dark:border-white/10 border-neutral-200 rounded-lg outline-none text-xs dark:text-white text-neutral-900 px-2.5 py-1 text-center focus:border-[#C88B37]/60 focus:ring-0"
                                                                maxLength={30}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    if (tempGroupName.trim() && tempGroupName.trim() !== getChatName(activeConversation)) {
                                                                        handleUpdateGroupDetails({ name: tempGroupName.trim() });
                                                                    }
                                                                    setEditingGroupName(false);
                                                                }}
                                                                className="text-green-500 hover:text-green-400 font-bold text-xs"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingGroupName(false)}
                                                                className="text-neutral-500 hover:text-neutral-400 text-xs"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 justify-center mt-1 group cursor-pointer" onClick={() => {
                                                            setTempGroupName(getChatName(activeConversation));
                                                            setEditingGroupName(true);
                                                        }}>
                                                            <h3 className="text-base font-bold dark:text-white text-neutral-900 tracking-tight leading-snug">
                                                                {getChatName(activeConversation)}
                                                            </h3>
                                                            <Edit2 className="h-3.5 w-3.5 text-[#C88B37] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}

                                                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold mt-1">
                                                        {activeConversation.members?.length || 0} Members
                                                    </span>
                                                </div>

                                                {/* Group Description */}
                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-4 transition-all duration-300 hover:border-[#C88B37]/20 relative group/desc cursor-pointer" onClick={() => {
                                                    if (!editingGroupDesc) {
                                                        setTempGroupDesc(activeConversation.description || '');
                                                        setEditingGroupDesc(true);
                                                    }
                                                }}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] uppercase tracking-wider text-[#C88B37] font-bold">Group Description</span>
                                                        {!editingGroupDesc && (
                                                            <Edit2 className="h-3 w-3 text-[#C88B37] opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    {editingGroupDesc ? (
                                                        <div className="space-y-2 mt-1" onClick={(e) => e.stopPropagation()}>
                                                            <textarea
                                                                value={tempGroupDesc}
                                                                onChange={(e) => setTempGroupDesc(e.target.value)}
                                                                className="w-full bg-transparent border border-neutral-200 dark:border-white/10 rounded-lg outline-none text-xs dark:text-white text-neutral-800 p-2 focus:border-[#C88B37]/60 focus:ring-0"
                                                                rows={3}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => setEditingGroupDesc(false)}
                                                                    className="text-neutral-500 hover:text-neutral-400 text-xs px-2 py-1 rounded"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleUpdateGroupDetails({ description: tempGroupDesc.trim() });
                                                                        setEditingGroupDesc(false);
                                                                    }}
                                                                    className="bg-[#C88B37] hover:bg-[#ae7428] text-black font-semibold text-xs px-3 py-1 rounded-lg"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs dark:text-white/80 text-neutral-600 leading-relaxed font-medium">
                                                            {activeConversation.description || 'No group description set.'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Creator + Date Row */}
                                                {(() => {
                                                    const adminMember = activeConversation.members?.find((m: any) => m.pivot?.role === 'admin')
                                                        ?? (activeConversation.creator ? { name: activeConversation.creator.name } : null);
                                                    const createdAt = activeConversation.created_at ? new Date(activeConversation.created_at) : null;
                                                    const dateStr = createdAt ? createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
                                                    if (!adminMember && !dateStr) return null;
                                                    return (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {adminMember && (
                                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-3.5 hover:border-[#C88B37]/20 transition-all">
                                                                    <span className="text-[9px] uppercase tracking-wider text-[#C88B37] font-bold block mb-1">Created by</span>
                                                                    <span className="text-xs dark:text-white text-neutral-900 font-semibold truncate block">{adminMember.name}</span>
                                                                </div>
                                                            )}
                                                            {dateStr && (
                                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-3.5 hover:border-[#C88B37]/20 transition-all">
                                                                    <span className="text-[9px] uppercase tracking-wider text-[#C88B37] font-bold block mb-1">Created</span>
                                                                    <span className="text-xs dark:text-white text-neutral-900 font-semibold">{dateStr}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Security Shield Card */}
                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-4 transition-all duration-300 hover:border-[#C88B37]/20 flex gap-3.5 items-start">
                                                    <ShieldCheck className="h-5 w-5 text-[#C88B37] shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-[#C88B37] font-bold block mb-1">Encrypted Room</span>
                                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
                                                            Messages in this group are secured with AES-256 end-to-end encryption.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Members List */}
                                                <div className="space-y-3.5">
                                                    <h4 className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold px-1">
                                                        Group Members
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {activeConversation.members?.map((member: any) => {
                                                            const isOnline = onlineUsers[member.id] === true;
                                                            const isAdmin = member.pivot?.role === 'admin';
                                                            const isMe = member.id === currentUser?.id;
                                                            return (
                                                                <div
                                                                    key={`member-${member.id}`}
                                                                    onClick={() => {
                                                                        if (isMe) return;
                                                                        fetchSidebarUserProfile(member.id);
                                                                        setSidebarView('user');
                                                                    }}
                                                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all border border-transparent ${isMe
                                                                            ? 'opacity-80'
                                                                            : 'cursor-pointer dark:hover:bg-white/5 hover:bg-neutral-100 hover:border-neutral-200 dark:hover:border-white/5'
                                                                        }`}
                                                                >
                                                                    <div className="relative">
                                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 dark:border-white/10 dark:bg-white/5 bg-neutral-100 text-neutral-600 dark:text-white font-bold text-xs overflow-hidden">
                                                                            {member.avatar_url ? (
                                                                                <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                member.name.charAt(0).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        {isOnline && (
                                                                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#0F0F0F] bg-green-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-semibold dark:text-white text-neutral-900 text-xs truncate">
                                                                                {member.name}{isMe ? ' (You)' : ''}
                                                                            </span>
                                                                            {isAdmin && (
                                                                                <span className="text-[9px] font-bold text-[#C88B37] border border-[#C88B37]/45 px-1.5 py-0.5 rounded bg-[#C88B37]/5 shrink-0">
                                                                                    Admin
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[10px] text-neutral-400 block truncate">
                                                                            {isOnline ? 'Online' : 'Offline'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Render User details */
                                            <div className="space-y-6">
                                                {/* Profile Photo and Header Info */}
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="relative h-32 w-32 flex items-center justify-center mb-4 group/avatar">
                                                        {/* Glowing ring wrapper */}
                                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#C88B37] via-[#f3cb8c] to-[#ae7428] opacity-70 animate-[spin_10s_linear_infinite] p-0.5" />
                                                        <div className="absolute inset-[3px] rounded-full dark:bg-[#0F0F0F] bg-white z-0" />

                                                        {/* Actual Avatar */}
                                                        <div className="h-28 w-28 rounded-full flex items-center justify-center dark:bg-white/5 bg-neutral-100 text-neutral-600 dark:text-white font-bold text-2xl shadow-[0_0_15px_rgba(200,139,55,0.05)] relative z-10 overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
                                                            {sidebarUserProfile?.avatar_url ? (
                                                                <img src={sidebarUserProfile.avatar_url} alt={sidebarUserProfile.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                sidebarUserProfile?.name?.charAt(0).toUpperCase() || '?'
                                                            )}
                                                            {sidebarUserProfile?.avatar_url && (
                                                                <div
                                                                    onClick={() => setShowFullAvatarUrl(sidebarUserProfile.avatar_url)}
                                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                                                    title="View full size"
                                                                >
                                                                    <Camera className="h-5 w-5 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <h3 className="text-base font-bold dark:text-white text-neutral-900 tracking-tight leading-snug">{sidebarUserProfile?.name || 'Loading Name...'}</h3>
                                                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
                                                        @{sidebarUserProfile?.username || 'username'}
                                                    </span>

                                                    {/* Status Badge */}
                                                    <div className="mt-3">
                                                        {sidebarUserProfile?.id && onlineUsers[sidebarUserProfile.id] === true ? (
                                                            <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                                <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500 animate-pulse" />
                                                                Online
                                                            </span>
                                                        ) : (
                                                            <span className="bg-neutral-500/10 text-neutral-400 border border-neutral-500/25 text-[10px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                                <Circle className="h-1.5 w-1.5 fill-neutral-500 text-neutral-500" />
                                                                {sidebarUserProfile?.last_seen_at ? `Seen ${formatLastSeen(sidebarUserProfile.last_seen_at)}` : 'Offline'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bio/About Card */}
                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-4 transition-all duration-300 hover:border-[#C88B37]/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Info className="h-4 w-4 text-[#C88B37]" />
                                                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold">
                                                            Bio / Status
                                                        </span>
                                                    </div>
                                                    <p className="text-xs dark:text-neutral-300 text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                                        {sidebarUserProfile?.status || sidebarUserProfile?.about || 'Hey! I use SecureChat.'}
                                                    </p>
                                                </div>

                                                {/* Contact Details Card */}
                                                <div className="dark:bg-white/[0.01] bg-neutral-50 border dark:border-white/5 border-neutral-100 rounded-2xl p-4 transition-all duration-300 hover:border-[#C88B37]/20 space-y-4">
                                                    <div className="flex items-start gap-3">
                                                        <Mail className="h-4 w-4 text-[#C88B37] shrink-0 mt-0.5" />
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">
                                                                Email Address
                                                            </span>
                                                            <span className="text-xs dark:text-white text-neutral-900 block truncate select-all">
                                                                {sidebarUserProfile?.email || 'email@domain.com'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="border-t dark:border-white/5 border-neutral-200/50 pt-3 flex items-start gap-3">
                                                        <ShieldCheck className="h-4 w-4 text-[#C88B37] shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">
                                                                E2EE Encryption
                                                            </span>
                                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                Keys verified & active.
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Start New Chat Drawer */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="w-full max-w-md rounded-2xl border dark:border-white/10 border-neutral-200 dark:bg-[#141414] bg-white p-6 shadow-[0_15px_40px_rgba(200,139,55,0.08)]">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold dark:text-white text-neutral-900 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-[#C88B37]" />
                                New Direct Chat
                            </h3>
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                className="p-1 rounded-full dark:hover:bg-white/10 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {friends.length === 0 ? (
                                <div className="text-center py-8 text-neutral-500">
                                    <span className="text-xs">No contacts available to chat. Add friends to start chatting.</span>
                                </div>
                            ) : (
                                friends.map((friend, fIdx) => (
                                    <div
                                        key={`friend-${friend.id || fIdx}`}
                                        onClick={() => handleStartChat(friend.id)}
                                        className="flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer dark:hover:bg-white/5 hover:bg-neutral-100 border border-transparent dark:hover:border-white/5 hover:border-neutral-200 transition-all"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 text-[#C88B37] font-bold text-xs overflow-hidden">
                                            {friend.avatar_url ? (
                                                <img src={friend.avatar_url} alt={friend.name} className="h-full w-full object-cover" />
                                            ) : (
                                                friend.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold dark:text-white text-neutral-900 text-sm block truncate">{friend.name}</span>
                                            <span className="text-[10px] text-neutral-500 block truncate">{friend.email}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Create Custom Tab */}
            {showNewTabModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl border dark:border-white/10 border-neutral-200 dark:bg-[#141414] bg-white p-6 shadow-[0_15px_40px_rgba(200,139,55,0.08)] animate-scale-in">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold dark:text-white text-neutral-900 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-[#C88B37]" />
                                Create Custom Tab
                            </h3>
                            <button
                                onClick={() => setShowNewTabModal(false)}
                                className="p-1 rounded-full dark:hover:bg-white/10 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Tab Name Input */}
                            <div className="grid gap-1.5">
                                <label className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider">Tab Name</label>
                                <input
                                    type="text"
                                    value={newTabName}
                                    onChange={(e) => setNewTabName(e.target.value)}
                                    maxLength={20}
                                    placeholder="e.g. Work, Favorites"
                                    className={`h-11 rounded-xl px-4 text-sm outline-none border transition-all ${isDark
                                            ? 'bg-white/[0.03] border-white/8 text-white placeholder-neutral-500 focus:border-[#C88B37]/60 focus:bg-white/5'
                                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-[#C88B37]/60'
                                        }`}
                                />
                            </div>

                            {/* Select Chats Header */}
                            <div className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider pt-2">
                                Select Chats to Include ({newTabSelectedIds.length} selected):
                            </div>

                            {/* Scrollable Conversations Checkbox List */}
                            <div className={`max-h-60 overflow-y-auto border rounded-xl p-2 space-y-1 ${isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-neutral-50'
                                }`}>
                                {conversations.length === 0 ? (
                                    <div className="text-center py-6 text-neutral-500 text-xs">
                                        No active chats found
                                    </div>
                                ) : (
                                    conversations.map(conv => {
                                        const convId = conv.id;
                                        const name = getChatName(conv);
                                        const isChecked = newTabSelectedIds.includes(convId);
                                        const thumb = getChatAvatarThumbUrl(conv);

                                        return (
                                            <label
                                                key={`tab-select-conv-${convId}`}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors ${isChecked ? 'bg-[#C88B37]/10 border border-transparent' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        setNewTabSelectedIds(prev =>
                                                            prev.includes(convId)
                                                                ? prev.filter(id => id !== convId)
                                                                : [...prev, convId]
                                                        );
                                                    }}
                                                    className="h-4 w-4 rounded border-neutral-300 text-[#C88B37] focus:ring-[#C88B37]"
                                                />
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 text-[#C88B37] font-bold text-xs overflow-hidden">
                                                    {thumb ? (
                                                        <img src={thumb} alt={name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        getChatAvatarLetter(conv)
                                                    )}
                                                </div>
                                                <span className="flex-1 text-sm dark:text-neutral-200 text-neutral-800 truncate">
                                                    {name}
                                                </span>
                                                <span className="text-[10px] uppercase font-semibold text-neutral-400">
                                                    {conv.type}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={handleCreateTab}
                                disabled={!newTabName.trim() || newTabSelectedIds.length === 0}
                                className="h-11 w-full bg-[#C88B37] hover:bg-[#ae7428] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(200,139,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                Create Tab
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Friends Manager */}
            {showFriendsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="w-full max-w-2xl rounded-2xl border dark:border-white/10 border-neutral-200 dark:bg-[#141414] bg-white p-6 shadow-[0_15px_40px_rgba(200,139,55,0.08)]">

                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold dark:text-white text-neutral-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#C88B37]" />
                                Contacts Manager
                            </h3>
                            <button
                                onClick={() => setShowFriendsModal(false)}
                                className="p-1 rounded-full dark:hover:bg-white/10 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex border-b dark:border-white/5 border-neutral-200 mb-5">
                            <button
                                onClick={() => setFriendsModalTab('search')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${friendsModalTab === 'search'
                                        ? 'border-[#C88B37] dark:text-white text-neutral-900'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                Find Users
                            </button>
                            <button
                                onClick={() => setFriendsModalTab('requests')}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${friendsModalTab === 'requests'
                                        ? 'border-[#C88B37] dark:text-white text-neutral-900'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                Incoming Invites
                                {pendingRequests.length > 0 && (
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                )}
                            </button>
                        </div>

                        {friendsModalTab === 'search' ? (
                            <div className="space-y-4">
                                <div className="relative flex h-10 w-full items-center rounded-full border dark:border-white/8 border-neutral-200/80 dark:bg-white/[0.02] bg-neutral-50 px-4 focus-within:border-[#C88B37]/60 focus-within:ring-1 focus-within:ring-[#C88B37]/60 focus-within:shadow-[0_0_12px_rgba(200,139,55,0.12)] transition-all duration-300">
                                    <Search className="h-3.5 w-3.5 text-neutral-400 mr-2 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, username, or email..."
                                        value={friendsSearchQuery}
                                        onChange={(e) => {
                                            setFriendsSearchQuery(e.target.value);
                                            searchUsers(e.target.value);
                                        }}
                                        className="flex-1 bg-transparent text-xs dark:text-neutral-200 text-neutral-900 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none border-none focus:ring-0 p-0 transition-colors duration-300"
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {searchedUsers.length === 0 ? (
                                        <div className="text-center py-8 text-neutral-500">
                                            <span className="text-xs">Type a query to search for users.</span>
                                        </div>
                                    ) : (
                                        searchedUsers.map((user, uIdx) => {
                                            const isFriend = friends.some(f => f.id === user.id);
                                            const isSentPending = sentRequests.some(r => r.receiver_id === user.id && r.status === 'pending');
                                            const isIncomingPending = pendingRequests.some(r => r.sender_id === user.id && r.status === 'pending');

                                            return (
                                                <div
                                                    key={`searched-user-${user.id || uIdx}`}
                                                    className="flex items-center justify-between p-2 rounded-xl dark:hover:bg-white/5 hover:bg-neutral-100 border border-transparent dark:hover:border-white/5 hover:border-neutral-200 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 text-[#C88B37] font-bold text-xs overflow-hidden">
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                user.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 pr-2">
                                                            <span className="font-semibold dark:text-white text-neutral-900 text-xs block truncate">{user.name}</span>
                                                            <span className="text-[10px] text-neutral-500 block truncate">{user.email}</span>
                                                        </div>
                                                    </div>

                                                    {isFriend ? (
                                                        <span className="px-3 py-1 dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 text-neutral-400 text-[10px] font-semibold uppercase rounded-full">
                                                            Connected
                                                        </span>
                                                    ) : isSentPending ? (
                                                        <span className="px-3 py-1 bg-[#C88B37]/10 border border-[#C88B37]/20 text-[#C88B37] text-[10px] font-semibold uppercase rounded-full flex items-center gap-1">
                                                            <ClockIcon className="h-3 w-3 animate-spin text-[#C88B37]" />
                                                            Sent
                                                        </span>
                                                    ) : isIncomingPending ? (
                                                        <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-semibold uppercase rounded-full">
                                                            Pending Invite
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSendFriendRequest(user.id)}
                                                            className="h-8 bg-[#C88B37]/15 hover:bg-[#C88B37] hover:text-black border border-[#C88B37]/45 text-[#C88B37] text-xs font-bold rounded-lg px-3 transition-all cursor-pointer"
                                                        >
                                                            Add Contact
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
                                {pendingRequests.length === 0 ? (
                                    <div className="text-center py-10 text-neutral-500 flex flex-col items-center">
                                        <AlertCircle className="h-7 w-7 text-neutral-500 mb-1.5" />
                                        <span className="text-xs">No pending incoming requests.</span>
                                    </div>
                                ) : (
                                    pendingRequests.map((req, rIdx) => (
                                        <div
                                            key={`pending-req-${req.id || rIdx}`}
                                            className="flex items-center justify-between p-3.5 rounded-xl border dark:border-white/5 border-neutral-200 dark:bg-white/[0.01] bg-neutral-50 dark:hover:bg-white/[0.03] hover:bg-neutral-100 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C88B37]/45 bg-[#C88B37]/10 text-[#C88B37] font-bold text-xs overflow-hidden">
                                                    {req.sender.avatar_url ? (
                                                        <img src={req.sender.avatar_url} alt={req.sender.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        req.sender.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <span className="font-semibold dark:text-white text-neutral-900 text-xs block truncate">{req.sender.name}</span>
                                                    <span className="text-[10px] text-neutral-500 block truncate">{req.sender.email}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAcceptRequest(req.id)}
                                                    className="flex h-8 w-8 items-center justify-center bg-[#C88B37] hover:bg-[#ae7428] text-black rounded-lg cursor-pointer transition-colors shadow-[0_0_8px_rgba(200,139,55,0.2)]"
                                                    title="Accept Request"
                                                >
                                                    <Check className="h-4.5 w-4.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(req.id)}
                                                    className="flex h-8 w-8 items-center justify-center bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 text-red-500 rounded-lg cursor-pointer transition-colors"
                                                    title="Ignore Request"
                                                >
                                                    <X className="h-4.5 w-4.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Premium Two-Panel Settings */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className={`w-full max-w-2xl rounded-2xl border overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.5),_0_0_40px_rgba(200,139,55,0.06)] flex transition-colors duration-300 ${isDark ? 'border-white/8 bg-[#111111]' : 'border-neutral-200 bg-white'
                        }`} style={{ maxHeight: '88vh' }}>

                        {/* Left Sidebar Nav */}
                        <div className={`w-52 shrink-0 flex flex-col border-r transition-colors duration-300 ${isDark ? 'border-white/5 bg-[#0D0D0D]' : 'border-neutral-100 bg-neutral-50'
                            }`}>
                            {/* Header */}
                            <div className="px-5 py-5 border-b dark:border-white/5 border-neutral-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-[#C88B37]/15 border border-[#C88B37]/30 flex items-center justify-center">
                                        <Settings className="h-4 w-4 text-[#C88B37]" />
                                    </div>
                                    <span className="font-bold text-sm dark:text-white text-neutral-900">Settings</span>
                                </div>
                            </div>

                            {/* Nav Items */}
                            <nav className="flex-1 p-3 space-y-1">
                                {([
                                    { id: 'profile', label: 'Profile', icon: User },
                                    { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
                                    { id: 'appearance', label: 'Appearance', icon: Sun },
                                    { id: 'account', label: 'Account', icon: AlertCircle },
                                ] as const).map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setSettingsTab(id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${settingsTab === id
                                                ? 'bg-[#C88B37]/15 text-[#C88B37] border border-[#C88B37]/30 shadow-[0_0_12px_rgba(200,139,55,0.08)]'
                                                : 'dark:text-neutral-400 text-neutral-600 dark:hover:bg-white/5 hover:bg-neutral-200/60 border border-transparent'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {label}
                                    </button>
                                ))}
                            </nav>

                            {/* Logout at bottom */}
                            <div className="p-3 border-t dark:border-white/5 border-neutral-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    Log Out
                                </button>
                            </div>
                        </div>

                        {/* Right Content Panel */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b dark:border-white/5 border-neutral-100">
                                <h3 className="font-bold dark:text-white text-neutral-900 text-base capitalize">
                                    {settingsTab === 'profile' && 'Edit Profile'}
                                    {settingsTab === 'privacy' && 'Privacy & Visibility'}
                                    {settingsTab === 'appearance' && 'Appearance'}
                                    {settingsTab === 'account' && 'Account Info'}
                                </h3>
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                                {/* === PROFILE TAB === */}
                                {settingsTab === 'profile' && (
                                    <form onSubmit={handleSaveProfile} className="space-y-5">
                                        {/* Avatar */}
                                        <div className={`flex items-center gap-5 p-5 rounded-xl border transition-colors ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <div className="relative group cursor-pointer shrink-0" onClick={() => avatarInputRef.current?.click()}>
                                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#C88B37]/60 bg-[#C88B37]/10 text-[#C88B37] font-bold text-2xl overflow-hidden shadow-[0_0_20px_rgba(200,139,55,0.2)]">
                                                    {isUploadingAvatar ? (
                                                        <LoaderCircle className="h-7 w-7 animate-spin text-[#C88B37]" />
                                                    ) : currentUser?.avatar_url ? (
                                                        <img src={currentUser.avatar_url} alt={currentUser.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        currentUser?.name?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                {!isUploadingAvatar && (
                                                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Camera className="h-5 w-5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                                            <div>
                                                <p className="font-semibold dark:text-white text-neutral-900 text-sm">{currentUser?.name}</p>
                                                <p className="text-xs dark:text-neutral-500 text-neutral-400 mt-0.5">{currentUser?.email}</p>
                                                <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-2 text-[11px] text-[#C88B37] hover:underline cursor-pointer">Change photo</button>
                                            </div>
                                        </div>

                                        <div className="grid gap-1.5">
                                            <label className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider">Display Name</label>
                                            <input
                                                type="text" required value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className={`h-11 rounded-xl px-4 text-sm outline-none border transition-all ${isDark ? 'bg-white/[0.03] border-white/8 text-white placeholder-neutral-500 focus:border-[#C88B37]/60 focus:bg-white/5' : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-[#C88B37]/60'
                                                    }`}
                                                placeholder="Your display name"
                                            />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <label className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider">About / Status</label>
                                            <input
                                                type="text" value={editAbout}
                                                onChange={e => setEditAbout(e.target.value)}
                                                className={`h-11 rounded-xl px-4 text-sm outline-none border transition-all ${isDark ? 'bg-white/[0.03] border-white/8 text-white placeholder-neutral-500 focus:border-[#C88B37]/60 focus:bg-white/5' : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-[#C88B37]/60'
                                                    }`}
                                                placeholder="Available, Busy, In a meeting..."
                                            />
                                        </div>

                                        <button
                                            type="submit" disabled={isSavingProfile}
                                            className="h-11 w-full bg-[#C88B37] hover:bg-[#ae7428] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(200,139,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {isSavingProfile && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                            Save Changes
                                        </button>
                                    </form>
                                )}

                                {/* === PRIVACY TAB === */}
                                {settingsTab === 'privacy' && (
                                    <form onSubmit={handleSaveProfile} className="space-y-5">
                                        <div className={`p-5 rounded-xl border space-y-4 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <div>
                                                <p className="font-semibold text-sm dark:text-white text-neutral-900 mb-0.5">Last Seen Visibility</p>
                                                <p className="text-xs dark:text-neutral-500 text-neutral-400">Control who can see when you were last active</p>
                                            </div>
                                            <div className="space-y-3">
                                                {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                                                    <label key={option} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${editLastSeen === option
                                                            ? 'border-[#C88B37]/40 bg-[#C88B37]/8'
                                                            : 'border-transparent dark:hover:bg-white/3 hover:bg-neutral-100'
                                                        }`}>
                                                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${editLastSeen === option ? 'border-[#C88B37]' : 'dark:border-white/20 border-neutral-300'
                                                            }`}>
                                                            {editLastSeen === option && <div className="h-2 w-2 rounded-full bg-[#C88B37]" />}
                                                        </div>
                                                        <input type="radio" name="last_seen" value={option} checked={editLastSeen === option} onChange={() => setEditLastSeen(option)} className="sr-only" />
                                                        <div>
                                                            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-800 capitalize">
                                                                {option === 'contacts' ? 'My Contacts Only' : option}
                                                            </span>
                                                            <p className="text-[11px] dark:text-neutral-500 text-neutral-400">
                                                                {option === 'everyone' && 'Anyone on JK Chat can see your last seen'}
                                                                {option === 'contacts' && 'Only friends you have added'}
                                                                {option === 'nobody' && 'No one can see when you were last active'}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="submit" disabled={isSavingProfile}
                                            className="h-11 w-full bg-[#C88B37] hover:bg-[#ae7428] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(200,139,55,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {isSavingProfile && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                            Save Privacy Settings
                                        </button>
                                    </form>
                                )}

                                {/* === APPEARANCE TAB === */}
                                {settingsTab === 'appearance' && (
                                    <div className="space-y-4">
                                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <div>
                                                <p className="font-semibold text-sm dark:text-white text-neutral-900">Theme</p>
                                                <p className="text-xs dark:text-neutral-500 text-neutral-400 mt-0.5">{isDark ? 'Dark mode active' : 'Light mode active'}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsDark(!isDark)}
                                                className={`relative h-7 w-14 rounded-full border transition-all cursor-pointer ${isDark ? 'bg-[#C88B37]/80 border-[#C88B37]/60' : 'bg-neutral-200 border-neutral-300'
                                                    }`}
                                            >
                                                <span className={`absolute top-0.5 h-6 w-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${isDark ? 'left-[calc(100%-26px)] bg-white' : 'left-0.5 bg-white'
                                                    }`}>
                                                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#C88B37]" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                                                </span>
                                            </button>
                                        </div>

                                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <div>
                                                <p className="font-semibold text-sm dark:text-white text-neutral-900">Notification Sound</p>
                                                <p className="text-xs dark:text-neutral-500 text-neutral-400 mt-0.5">{notifSound ? 'Sound enabled' : 'Sound muted'}</p>
                                            </div>
                                            <button
                                                onClick={() => { const n = !notifSound; setNotifSound(n); localStorage.setItem('notif_sound', n ? 'on' : 'off'); }}
                                                className={`relative h-7 w-14 rounded-full border transition-all cursor-pointer ${notifSound ? 'bg-[#C88B37]/80 border-[#C88B37]/60' : 'bg-neutral-200 dark:bg-white/10 border-neutral-300 dark:border-white/10'
                                                    }`}
                                            >
                                                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${notifSound ? 'left-[calc(100%-26px)]' : 'left-0.5'
                                                    }`} />
                                            </button>
                                        </div>

                                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.01] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <p className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider mb-3">Message Tick Legend</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <Check className="h-3.5 w-3.5 text-neutral-400" />
                                                    <span className="text-xs dark:text-neutral-300 text-neutral-600">Single grey tick — message sent</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CheckCheck className="h-3.5 w-3.5 text-neutral-400" />
                                                    <span className="text-xs dark:text-neutral-300 text-neutral-600">Double grey tick — delivered</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                                                    <span className="text-xs dark:text-neutral-300 text-neutral-600">Double blue tick — read</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === ACCOUNT TAB === */}
                                {settingsTab === 'account' && (
                                    <div className="space-y-4">
                                        <div className={`p-5 rounded-xl border space-y-3 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <p className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider">Account Details</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-[#C88B37] shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] dark:text-neutral-500 text-neutral-400">Display Name</p>
                                                        <p className="text-sm font-semibold dark:text-white text-neutral-900">{currentUser?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Bell className="h-4 w-4 text-[#C88B37] shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] dark:text-neutral-500 text-neutral-400">Email Address</p>
                                                        <p className="text-sm font-semibold dark:text-white text-neutral-900">{currentUser?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <ShieldCheck className="h-4 w-4 text-[#C88B37] shrink-0" />
                                                    <div>
                                                        <p className="text-[11px] dark:text-neutral-500 text-neutral-400">Account Status</p>
                                                        <p className="text-sm font-semibold text-green-500">Active & Verified</p>
                                                    </div>
                                                </div>
                                                {currentUser?.is_admin && (
                                                    <div className="flex items-center gap-3">
                                                        <Sparkles className="h-4 w-4 text-[#C88B37] shrink-0" />
                                                        <div>
                                                            <p className="text-[11px] dark:text-neutral-500 text-neutral-400">Role</p>
                                                            <p className="text-sm font-semibold text-[#C88B37]">Administrator</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.01] border-white/5' : 'bg-neutral-50 border-neutral-200'
                                            }`}>
                                            <p className="text-xs font-semibold dark:text-neutral-400 text-neutral-500 uppercase tracking-wider mb-2">Encryption</p>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                                <p className="text-xs dark:text-neutral-300 text-neutral-600">All messages are AES-256 end-to-end encrypted</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleLogout}
                                            className="h-11 w-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out of JK Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFullAvatarUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
                    onClick={() => setShowFullAvatarUrl(null)}
                >
                    <div className="relative max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/40">
                        <img
                            src={showFullAvatarUrl}
                            alt="Full Profile"
                            className="max-w-full max-h-[80vh] object-contain"
                        />
                        <button
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors cursor-pointer"
                            onClick={() => setShowFullAvatarUrl(null)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
            {contextMenu && (() => {
                const conv = conversations.find(c => c.id === contextMenu.convId);
                if (!conv) return null;
                const isPinned = pinnedIds.includes(conv.id);
                const isMuted = mutedIds.includes(conv.id);
                return (
                    <div
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        className="fixed z-50 w-44 rounded-xl border dark:border-white/5 border-neutral-200 dark:bg-[#121212]/95 bg-white shadow-xl py-1.5 backdrop-blur-md text-xs text-neutral-800 dark:text-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                togglePin(conv.id);
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 dark:text-neutral-300 text-neutral-700 dark:hover:bg-white/5 hover:bg-neutral-100 flex items-center gap-2"
                        >
                            <Pin className="h-3.5 w-3.5 text-[#C88B37] rotate-45" />
                            {isPinned ? 'Unpin Chat' : 'Pin Chat'}
                        </button>
                        <button
                            onClick={() => {
                                toggleMute(conv.id);
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 dark:text-neutral-300 text-neutral-700 dark:hover:bg-white/5 hover:bg-neutral-100 flex items-center gap-2"
                        >
                            {isMuted ? (
                                <>
                                    <Bell className="h-3.5 w-3.5 text-green-500" />
                                    Unmute Notifications
                                </>
                            ) : (
                                <>
                                    <BellOff className="h-3.5 w-3.5 text-orange-500" />
                                    Mute Notifications
                                </>
                            )}
                        </button>
                        <div className="border-t dark:border-white/5 border-neutral-100 my-1" />
                        <button
                            onClick={async () => {
                                if (confirm('Delete this chat from your list? History is soft-deleted and can be restored by an admin.')) {
                                    try {
                                        await fetch(`/web/conversations/${conv.id}/clear`, {
                                            method: 'POST',
                                            headers: {
                                                'Accept': 'application/json',
                                                'Content-Type': 'application/json',
                                                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                                            },
                                            body: JSON.stringify({ mode: 'delete' }),
                                        });
                                        setConversations(prev => prev.filter(c => c.id !== conv.id));
                                        if (activeConversationId === conv.id) {
                                            setActiveConversationId(null);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            Delete Chat
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}

// ClockIcon helper widget
function ClockIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

// Smart message delivery/read tick indicator
function MessageStatusTick({
    readBy,
    deliveredBy,
    conversationMembers,
    currentUserId,
}: {
    readBy: number[];
    deliveredBy: number[];
    conversationMembers: any[];
    currentUserId?: number;
}) {
    // Recipients = all members except the sender (current user)
    const recipients = conversationMembers.filter(m => m.id !== currentUserId);
    const recipientCount = recipients.length;

    if (recipientCount === 0) {
        // Just sent (single tick)
        return <Check className="h-3.5 w-3.5 dark:text-white/60 text-neutral-500" />;
    }

    // Check if ALL recipients have read
    const allRead = recipients.every(r => readBy.includes(r.id));
    if (allRead) {
        // Double blue tick = read by everyone
        return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
    }

    // Check if ALL recipients have at least received (delivered)
    const allDelivered = recipients.every(r => deliveredBy.includes(r.id));
    if (allDelivered) {
        // Double grey tick = delivered to all
        return <CheckCheck className="h-3.5 w-3.5 dark:text-white/60 text-neutral-500" />;
    }

    // Otherwise: single grey tick = sent (not yet delivered)
    return <Check className="h-3.5 w-3.5 dark:text-white/60 text-neutral-500" />;
}
