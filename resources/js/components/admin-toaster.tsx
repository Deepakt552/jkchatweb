import React, { useEffect, useState, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { LogIn, LogOut, ShieldAlert, X, Bell } from 'lucide-react';

interface SecurityEvent {
    id: string;
    type: 'login' | 'logout' | 'login_failed' | 'audit';
    title: string;
    user: string;
    detail: string;
    time: string;
}

interface ToastNotification {
    id: string;
    type: 'login' | 'logout' | 'login_failed' | 'audit';
    title: string;
    user: string;
    detail: string;
    time: string;
}

export function AdminToaster() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth?.user?.is_admin === true;
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const seenEventIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef<boolean>(true);

    useEffect(() => {
        if (!isAdmin) return;

        const fetchEvents = async () => {
            try {
                const res = await fetch('/admin/security/live-events', {
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) return;
                const data = await res.json();
                const events: SecurityEvent[] = data.events || [];

                if (isInitialLoadRef.current) {
                    // Populate seen events without triggering notifications on first page render
                    events.forEach(e => seenEventIdsRef.current.add(e.id));
                    isInitialLoadRef.current = false;
                    return;
                }

                // Identify new incoming events
                const newEvents = events.filter(e => !seenEventIdsRef.current.has(e.id));
                if (newEvents.length > 0) {
                    newEvents.forEach(e => seenEventIdsRef.current.add(e.id));
                    
                    // Trigger toasts for new events (limit to top 3)
                    const newToasts: ToastNotification[] = newEvents.slice(0, 3).map(e => ({
                        id: `${e.id}_${Date.now()}`,
                        type: e.type,
                        title: e.title,
                        user: e.user,
                        detail: e.detail,
                        time: new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    }));

                    setToasts(prev => [...newToasts, ...prev].slice(0, 5));
                }
            } catch (err) {
                // Silent fail
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 4000);
        return () => clearInterval(interval);
    }, [isAdmin]);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (!isAdmin || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => {
                const isLogin = toast.type === 'login';
                const isLogout = toast.type === 'logout';
                const isFailed = toast.type === 'login_failed';

                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
                            isLogin
                                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/30 dark:bg-emerald-950/95'
                                : isLogout
                                ? 'bg-rose-950/90 text-rose-100 border-rose-500/30 dark:bg-rose-950/95'
                                : isFailed
                                ? 'bg-amber-950/90 text-amber-100 border-amber-500/30 dark:bg-amber-950/95'
                                : 'bg-slate-900/90 text-slate-100 border-slate-700/50 dark:bg-slate-900/95'
                        }`}
                    >
                        <div
                            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isLogin
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isLogout
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : isFailed
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-amber-500/20 text-amber-400'
                            }`}
                        >
                            {isLogin ? (
                                <LogIn className="w-4 h-4" />
                            ) : isLogout ? (
                                <LogOut className="w-4 h-4" />
                            ) : isFailed ? (
                                <ShieldAlert className="w-4 h-4" />
                            ) : (
                                <Bell className="w-4 h-4" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs tracking-tight leading-tight">
                                    {toast.title}
                                </span>
                                <span className="text-[10px] opacity-60 font-mono">
                                    {toast.time}
                                </span>
                            </div>
                            <p className="text-xs font-medium mt-0.5 truncate opacity-90">
                                {toast.user}
                            </p>
                            <p className="text-[10px] opacity-70 truncate mt-0.5 font-mono">
                                {toast.detail}
                            </p>
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-opacity shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
