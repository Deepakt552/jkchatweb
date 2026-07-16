import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Users, UserPlus, MessageSquare, Send, Folder, Bell, BarChart2,
    UserCheck, UserX, Flame, Smartphone, Key, History, Building2, ShieldAlert,
    Shield, KeyRound, Globe, Lock, ClipboardList, AlertTriangle, Cloud, RefreshCw,
    Package, Database, Settings, Mail, Server, Zap, Activity, HardDrive, PlaySquare,
    Construction, User, Moon, Sun, LogOut, Menu, Search, Plus,
    ChevronLeft, ChevronRight, Globe2, ChevronDown, Check, CheckCircle2, Laptop
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface AdminLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AdminLayout({ children, breadcrumbs = [] }: AdminLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    // Interactive Dropdowns
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showOrgSelector, setShowOrgSelector] = useState(false);
    const [showLangSelector, setShowLangSelector] = useState(false);

    const { url } = usePage();

    useEffect(() => {
        const storedTheme = localStorage.getItem('admin-theme');
        if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            setTheme('light');
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('admin-theme', nextTheme);
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const isLinkActive = (href: string) => {
        if (href === '#' || href === '') return false;
        return url === href || url.startsWith(href);
    };

    return (
        <div className={theme === 'dark' ? 'dark' : ''}>
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0A0A] text-slate-800 dark:text-slate-100 font-sans flex transition-colors duration-300 selection:bg-[#C88B37]/30 selection:text-white">
                
                {/* Mobile Sidebar overlay backdrop */}
                {isMobileOpen && (
                    <div 
                        onClick={() => setIsMobileOpen(false)} 
                        className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200" 
                    />
                )}

                {/* ==========================================
                    LEFT SIDEBAR
                    ========================================== */}
                <aside 
                    className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-200/60 dark:border-white/5 bg-white/90 dark:bg-[#0F0F0F]/90 backdrop-blur-lg transition-all duration-300 
                        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
                        ${isCollapsed ? 'md:w-20' : 'md:w-68'} w-68`}
                >
                    {/* Header Logo */}
                    <div className="h-16 px-5 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C88B37] to-[#E5A93B] flex items-center justify-center text-black shadow-md shadow-[#C88B37]/20 transition-all duration-300 hover:scale-105">
                                <Shield className="w-5 h-5 animate-pulse" />
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col select-none">
                                    <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                                        JK<span className="text-[#C88B37]">Chat</span>
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#C88B37] uppercase tracking-widest leading-none">
                                        Admin Panel
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden md:block p-1.5 rounded-lg border border-slate-100 dark:border-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Navigation Groups */}
                    <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {!isCollapsed && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-3">Administration</p>}
                        <SidebarLink name="Dashboard" icon={LayoutDashboard} active={isLinkActive('/admin/dashboard')} isCollapsed={isCollapsed} href="/admin/dashboard" onClick={() => setIsMobileOpen(false)} />
                        <SidebarLink name="User Directory" icon={Users} active={isLinkActive('/admin/users')} isCollapsed={isCollapsed} href="/admin/users" onClick={() => setIsMobileOpen(false)} />
                        <SidebarLink name="Chat Conversations" icon={MessageSquare} active={isLinkActive('/admin/chats')} isCollapsed={isCollapsed} href="/admin/chats" onClick={() => setIsMobileOpen(false)} />
                        <SidebarLink name="Security Center" icon={Shield} active={isLinkActive('/admin/security')} isCollapsed={isCollapsed} href="/admin/security" onClick={() => setIsMobileOpen(false)} />
                        <SidebarLink name="System Settings" icon={Settings} active={isLinkActive('/admin/settings')} isCollapsed={isCollapsed} href="/admin/settings" onClick={() => setIsMobileOpen(false)} />
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-3 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F0F0F]/50">
                        <div className="space-y-1 mb-2">
                            <SidebarLink name="My Profile" icon={User} active={false} isCollapsed={isCollapsed} href="#" />
                        </div>

                        <Link 
                            href="/logout" 
                            method="post" 
                            as="button"
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            {!isCollapsed && <span>Logout</span>}
                        </Link>
                    </div>
                </aside>

                {/* ==========================================
                    MAIN CONTENT WRAPPER
                    ========================================== */}
                <div 
                    className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 pl-0 
                        ${isCollapsed ? 'md:pl-20' : 'md:pl-68'}`}
                >
                    
                    {/* ==========================================
                        TOP STICKY NAVBAR
                        ========================================== */}
                    <header className="sticky top-0 z-20 h-16 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-[#0E0E12]/85 backdrop-blur-lg px-6 flex items-center justify-between transition-colors duration-300">
                        
                        {/* Search and Sidebar Toggle */}
                        <div className="flex items-center gap-4 flex-1 max-w-lg">
                            <button 
                                onClick={() => {
                                    if (window.innerWidth < 768) {
                                        setIsMobileOpen(!isMobileOpen);
                                    } else {
                                        setIsCollapsed(!isCollapsed);
                                    }
                                }}
                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-colors duration-300"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search users, chats, files, messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#08080A]/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs rounded-xl border border-transparent focus:border-[#C88B37]/80 focus:bg-white dark:focus:bg-[#08080A] focus:ring-4 focus:ring-[#C88B37]/10 focus:outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-inner"
                                />

                                {searchFocused && (
                                    <div className="absolute top-12 left-0 right-0 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-md rounded-xl shadow-2xl p-3.5 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 mb-2 select-none tracking-wider">Recent Searches</p>
                                        <div className="space-y-1">
                                            <button className="w-full text-left px-2 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center gap-2 transition-colors">
                                                <History className="w-3.5 h-3.5 text-slate-400" />
                                                <span>audit logs department_marketing</span>
                                            </button>
                                            <button className="w-full text-left px-2 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center gap-2 transition-colors">
                                                <History className="w-3.5 h-3.5 text-slate-400" />
                                                <span>user: alice.vance</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Navbar Actions */}
                        <div className="flex items-center gap-3">

                            {/* Notifications Bell Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2.5 rounded-xl border border-slate-200/60 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#C88B37]/30 transition-all duration-300 relative"
                                >
                                    <Bell className="w-4 h-4" />
                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-[#0A0A0A] animate-pulse" />
                                </button>

                                {showNotifications && (
                                    <div className="absolute top-12 right-0 w-80 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-md rounded-2xl shadow-2xl p-4.5 z-40 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5 mb-3">
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">Unread Alerts (4)</span>
                                            <button className="text-[10px] text-[#C88B37] font-semibold hover:underline">Mark all read</button>
                                        </div>
                                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                                            <AlertItem title="Friend Request Pending" body="Bob Vance requested to connect with Alice Vance." type="friend" time="2m ago" />
                                            <AlertItem title="Failed Login Attempts" body="3 failed logins from IP 192.168.1.109." type="security" time="15m ago" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Messages Icon */}
                            <button className="p-2.5 rounded-xl border border-slate-200/60 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#C88B37]/30 transition-all duration-300 relative">
                                <MessageSquare className="w-4 h-4" />
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C88B37] border border-white dark:border-[#0A0A0A] animate-pulse" />
                            </button>

                            {/* Theme Selector */}
                            <button 
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl border border-slate-200/60 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#C88B37]/30 transition-all duration-300"
                            >
                                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" /> : <Moon className="w-4 h-4 text-[#C88B37]" />}
                            </button>

                            {/* Language Selector */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowLangSelector(!showLangSelector)}
                                    className="p-2.5 rounded-xl border border-slate-200/60 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#C88B37]/30 transition-all duration-300"
                                >
                                    <Globe className="w-4 h-4" />
                                </button>
                                {showLangSelector && (
                                    <div className="absolute top-12 right-0 w-32 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-md rounded-xl shadow-2xl p-1 z-40 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                        <button className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-[#C88B37]/10 hover:text-[#C88B37] dark:hover:text-white transition-colors duration-300">English</button>
                                    </div>
                                )}
                            </div>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="w-9.5 h-9.5 rounded-xl overflow-hidden border border-slate-200/60 dark:border-white/[0.08] hover:ring-2 hover:ring-[#C88B37]/35 transition-all duration-300"
                                >
                                    <div className="w-full h-full bg-gradient-to-br from-[#C88B37] to-[#E5A93B] text-black font-bold text-sm flex items-center justify-center select-none shadow-inner">
                                        AD
                                    </div>
                                </button>
                                {showProfileMenu && (
                                    <div className="absolute top-12 right-0 w-52 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-md rounded-2xl shadow-2xl p-2 z-40 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5 mb-1.5">
                                            <p className="text-xs font-bold leading-none text-slate-800 dark:text-white">Admin Directory</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">admin@securechat.io</p>
                                        </div>
                                        <button className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                                            <User className="w-3.5 h-3.5" />
                                            <span>Profile Settings</span>
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-white/5 my-1.5" />
                                        <Link 
                                            href="/logout" 
                                            method="post" 
                                            as="button"
                                            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 flex items-center gap-2 transition-colors"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>Logout</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                        </div>
                    </header>

                    {/* Content render */}
                    <div className="flex-1 p-6 space-y-6">
                        {children}
                    </div>

                </div>
            </div>
        </div>
    );
}

// SidebarLink helper
interface SidebarLinkProps {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
    isCollapsed: boolean;
    badge?: string | null;
    badgeColor?: string;
    href: string;
    onClick?: () => void;
}

function SidebarLink({ name, icon: Icon, active, isCollapsed, badge = null, badgeColor = "bg-slate-100 text-slate-700", href, onClick }: SidebarLinkProps) {
    const content = (
        <span 
            className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative ${
                active 
                    ? 'bg-gradient-to-r from-[#C88B37] to-[#E5A93B] text-black font-bold shadow-md shadow-[#C88B37]/15 scale-[1.02]' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-[#C88B37]/10 hover:text-[#C88B37] dark:hover:bg-white/5 dark:hover:text-white hover:translate-x-1'
            }`}
        >
            <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${active ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`} />
            {!isCollapsed && (
                <span className="ml-3 truncate animate-in fade-in duration-200">
                    {name}
                </span>
            )}
            {!isCollapsed && badge && (
                <span className={`ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-md leading-none ${active ? 'bg-black/20 text-black' : badgeColor}`}>
                    {badge}
                </span>
            )}
            {isCollapsed && badge && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
        </span>
    );

    return href === '#' ? (
        <span onClick={onClick}>{content}</span>
    ) : (
        <Link href={href} onClick={onClick} className="block">
            {content}
        </Link>
    );
}

function AlertItem({ title, body, type, time }: { title: string, body: string, type: string, time: string }) {
    const getTheme = () => {
        switch (type) {
            case 'friend': return 'bg-[#C88B37]/10 dark:bg-[#C88B37]/15 text-[#C88B37]';
            case 'security': return 'bg-red-50 dark:bg-red-950/20 text-red-600';
            default: return 'bg-slate-50 dark:bg-slate-800 text-slate-500';
        }
    };
    return (
        <div className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 flex items-start gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getTheme()}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">{title}</p>
                    <span className="text-[9px] text-slate-400 font-medium">{time}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{body}</p>
            </div>
        </div>
    );
}
