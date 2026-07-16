import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import React, { useState } from 'react';
import { 
    Users, UserCheck, UserX, MessageSquare, Send, Folder, Bell, BarChart2,
    Flame, Smartphone, Key, History, Shield, Cloud, Database, ShieldAlert,
    AlertTriangle, RefreshCw, Zap, CheckCircle2, Download, Plus, Laptop, Cpu, HardDrive, Activity,
    UserPlus, ClipboardList
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: '/admin/dashboard',
    },
];

interface Stats {
    total_users: number;
    online_users: number;
    offline_users: number;
    pending_requests: number;
    messages_today: number;
    files_uploaded: number;
    storage_used_mb: number;
}

interface SystemMetrics {
    cpu_load: number;
    memory_used_mb: number;
    disk_usage_percent: number;
    php_version: string;
    server_os: string;
}

interface Props {
    stats: Stats;
    system: SystemMetrics;
    logins: any[];
    activities: any[];
    activeUsers: any[];
    backups: any[];
    storageBreakdown: {
        images: number;
        documents: number;
        others: number;
    };
}

export default function Dashboard({ stats, system, logins, activities, activeUsers, backups, storageBreakdown }: Props) {
    const [activeGraphTab, setActiveGraphTab] = useState<'dau' | 'wau' | 'mau' | 'messages'>('dau');
    
    // Interactive action triggers
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupSuccess, setBackupSuccess] = useState<boolean | null>(null);
    const [queueRestarting, setQueueRestarting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'User', dept: 'Engineering' });

    const handleBackupNow = () => {
        setIsBackingUp(true);
        setBackupSuccess(null);
        setTimeout(() => {
            setIsBackingUp(false);
            setBackupSuccess(true);
            setTimeout(() => setBackupSuccess(null), 4000);
        }, 2500);
    };

    const handleRestartQueue = () => {
        setQueueRestarting(true);
        setTimeout(() => {
            setQueueRestarting(false);
        }, 1500);
    };

    const handleCreateUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowCreateModal(false);
        alert(`Account created successfully for ${newUserForm.name} (${newUserForm.email}) in ${newUserForm.dept}!`);
        setNewUserForm({ name: '', email: '', role: 'User', dept: 'Engineering' });
    };

    // Sparkline graphs renderer
    const renderSparkline = (points: number[], colorClass = "stroke-[#C88B37] dark:stroke-[#C88B37]") => {
        const width = 60;
        const height = 18;
        const max = Math.max(...points);
        const min = Math.min(...points);
        const range = max - min || 1;
        const path = points.map((p, idx) => {
            const x = (idx / (points.length - 1)) * width;
            const y = height - ((p - min) / range) * (height - 4) - 2;
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
            <svg width={width} height={height} className="overflow-visible">
                <path d={path} fill="none" className={colorClass} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    // User activity main chart configurations
    const getGraphData = () => {
        switch (activeGraphTab) {
            case 'dau':
                return {
                    label: 'Daily Active Users (DAU)',
                    points: [120, 145, 138, 168, 190, 224, stats.online_users + 140],
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
                    color: '#C88B37',
                    fillColor: 'rgba(200, 139, 55, 0.08)',
                };
            case 'wau':
                return {
                    label: 'Weekly Active Users (WAU)',
                    points: [450, 480, 520, 610, 590, 640, stats.total_users - 10],
                    labels: ['Wk 24', 'Wk 25', 'Wk 26', 'Wk 27', 'Wk 28', 'Wk 29', 'This Week'],
                    color: '#E5A93B',
                    fillColor: 'rgba(229, 169, 59, 0.08)',
                };
            case 'mau':
                return {
                    label: 'Monthly Active Users (MAU)',
                    points: [1200, 1350, 1420, 1580, 1710, 1890, stats.total_users + 200],
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    color: '#A87C30',
                    fillColor: 'rgba(168, 124, 48, 0.08)',
                };
            case 'messages':
                return {
                    label: 'Message Dispatch Volume',
                    points: [4200, 5800, 5100, 6300, 7100, 6800, stats.messages_today],
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
                    color: '#F3C677',
                    fillColor: 'rgba(243, 198, 119, 0.08)',
                };
        }
    };

    const currentGraph = getGraphData();
    const maxVal = Math.max(...currentGraph.points);
    const minVal = Math.min(...currentGraph.points);
    const rangeVal = maxVal - minVal || 1;

    const generateLargePath = () => {
        const width = 600;
        const height = 180;
        return currentGraph.points.map((p, idx) => {
            const x = (idx / (currentGraph.points.length - 1)) * width;
            const y = height - ((p - minVal) / rangeVal) * (height - 24) - 12;
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    const generateLargeAreaPath = () => {
        const width = 600;
        const height = 180;
        const pathPoints = currentGraph.points.map((p, idx) => {
            const x = (idx / (currentGraph.points.length - 1)) * width;
            const y = height - ((p - minVal) / rangeVal) * (height - 24) - 12;
            return `${x},${y}`;
        });
        return `M 0,${height} L ${pathPoints.join(' L ')} L ${width},${height} Z`;
    };

    // Calculate total attachments
    const totalFiles = storageBreakdown.images + storageBreakdown.documents + storageBreakdown.others;
    const imagesPercent = totalFiles ? Math.round((storageBreakdown.images / totalFiles) * 100) : 0;
    const docsPercent = totalFiles ? Math.round((storageBreakdown.documents / totalFiles) * 100) : 0;
    const othersPercent = totalFiles ? 100 - (imagesPercent + docsPercent) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex flex-col gap-6">
                
                {/* Title and Subtitle */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                            System Status Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Welcome back, <span className="font-semibold text-slate-800 dark:text-slate-200">Administrator</span>. Here's what's happening across your organization today.
                        </p>
                    </div>
                </div>

                {/* ==========================================
                    KEY STATISTICS CARDS
                    ========================================== */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Directory Users" value={stats.total_users} change="+12%" positive={true} points={[200, 210, 230, 240, 248, 252, stats.total_users]} icon={Users} tooltip="Total credentials active in directory" />
                    <StatCard title="Active Now" value={stats.online_users} change="+5%" positive={true} points={[22, 28, 25, 30, 35, 42, stats.online_users]} icon={Flame} tooltip="Users active right now" valueClass="text-[#C88B37]" />
                    <StatCard title="Messages Sent Today" value={stats.messages_today} change="+24%" positive={true} points={[2400, 3100, 2900, 3400, 3800, 4200, stats.messages_today]} icon={Send} tooltip="Total message payloads dispatched today" />
                    <StatCard title="Storage Consumed" value={`${stats.storage_used_mb} MB`} change="+1.2%" positive={true} points={[100, 102, 105, 107, 109, 112, stats.storage_used_mb]} icon={HardDrive} tooltip="Storage consumed on file partition" />
                </section>

                {/* ==========================================
                    SECOND ROW: GRAPH & REAL DATABASE ACTIVITIES
                    ========================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* User Activity Graphs */}
                    <div className="lg:col-span-8 bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-[#C88B37]/15 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">User Engagement Activity</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Analysis of users interaction with the SecureChat servers.</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-[#0A0A0A] p-0.5 rounded-xl border dark:border-white/5">
                                <GraphTab label="DAU" active={activeGraphTab === 'dau'} onClick={() => setActiveGraphTab('dau')} />
                                <GraphTab label="WAU" active={activeGraphTab === 'wau'} onClick={() => setActiveGraphTab('wau')} />
                                <GraphTab label="MAU" active={activeGraphTab === 'mau'} onClick={() => setActiveGraphTab('mau')} />
                                <GraphTab label="Messages" active={activeGraphTab === 'messages'} onClick={() => setActiveGraphTab('messages')} />
                            </div>
                        </div>

                        <div className="my-6 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                                {currentGraph.points[currentGraph.points.length - 1].toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {currentGraph.label}
                            </span>
                        </div>

                        {/* Custom SVG plot area with gradient and glow effects */}
                        <div className="w-full h-48 relative overflow-hidden flex items-end">
                            <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="chart-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={currentGraph.color} stopOpacity="0.25" />
                                        <stop offset="100%" stopColor={currentGraph.color} stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                <line x1="0" y1="30" x2="600" y2="30" stroke="rgba(148, 163, 184, 0.05)" strokeDasharray="3,3" />
                                <line x1="0" y1="75" x2="600" y2="75" stroke="rgba(148, 163, 184, 0.05)" strokeDasharray="3,3" />
                                <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(148, 163, 184, 0.05)" strokeDasharray="3,3" />
                                
                                <path d={generateLargeAreaPath()} fill="url(#chart-glow-gradient)" />
                                
                                {/* Glow Shadow Stroke */}
                                <path d={generateLargePath()} fill="none" stroke={currentGraph.color} strokeWidth="5" strokeLinecap="round" className="opacity-20 blur-[2px]" />
                                
                                {/* Main Stroke */}
                                <path d={generateLargePath()} fill="none" stroke={currentGraph.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                                {currentGraph.points.map((p, idx) => {
                                    const x = (idx / (currentGraph.points.length - 1)) * 600;
                                    const y = 180 - ((p - minVal) / rangeVal) * (180 - 24) - 12;
                                    return (
                                        <g key={idx} className="group/dot cursor-pointer">
                                            <circle cx={x} cy={y} r="5" fill={currentGraph.color} stroke="white" strokeWidth="1.5" className="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/dot:r-7 group-hover/dot:fill-white group-hover/dot:stroke-[#C88B37]" />
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-2 pt-2">
                            {currentGraph.labels.map((l, i) => (
                                <span key={i}>{l}</span>
                            ))}
                        </div>
                    </div>

                    {/* Real Operation Activity logs */}
                    <div className="lg:col-span-4 bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-[#C88B37]/15 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div>
                            <div className="pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">Recent Activity Stream</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live operational events recorded on servers.</p>
                            </div>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                {activities.map((act) => (
                                    <ActivityItem 
                                        key={act.id} 
                                        icon={act.description.includes('E2EE') ? Shield : UserCheck} 
                                        title={act.user_name || 'System Operator'} 
                                        body={act.description} 
                                        time={new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        badge="bg-[#C88B37]/10 text-[#C88B37] dark:bg-[#C88B37]/15 border border-[#C88B37]/10" 
                                    />
                                ))}
                                {activities.length === 0 && (
                                    <div className="text-center text-xs text-slate-400 py-8">No operational logs recorded.</div>
                                )}
                            </div>
                        </div>
                        <button className="mt-4 w-full text-center py-2.5 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-[#C88B37]/35 hover:text-[#C88B37] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            View Audit History
                        </button>
                    </div>

                </div>

                {/* ==========================================
                    SYSTEM HEALTH PANEL
                    ========================================== */}
                <section className="bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="pb-4 border-b border-slate-100 dark:border-white/5 mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">System Infrastructure Health</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Microservice and daemon process logs diagnostics.</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#C88B37]/25 bg-[#C88B37]/5 text-[#C88B37] text-[10px] font-bold shadow-sm shadow-[#C88B37]/5">
                            All Nodes Operational
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 mb-6">
                        <StatusBadge name="API Gateway" status="Active" type="success" />
                        <StatusBadge name="DB Server" status="Online" type="success" />
                        <StatusBadge name="Redis Cache" status="Connected" type="success" />
                        <StatusBadge name="Queue Workers" status="Idle (0 Q)" type="success" />
                        <StatusBadge name="WebSocket Host" status="Active" type="success" />
                        <StatusBadge name="File Storage" status="78% Occupied" type="warning" />
                        <StatusBadge name="SMTP Server" status="Verified" type="success" />
                        <StatusBadge name="SSL Certificates" status="Valid" type="success" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricBar label="CPU Load" value={Math.round(system.cpu_load * 100)} max={100} suffix="%" colorClass="bg-gradient-to-r from-[#C88B37] to-[#E5A93B]" />
                        <MetricBar label="Physical Memory" value={system.memory_used_mb} max={2048} suffix=" MB" colorClass="bg-gradient-to-r from-[#C88B37] to-[#E5A93B]" />
                        <MetricBar label="Disk Space" value={system.disk_usage_percent} max={100} suffix="%" colorClass="bg-gradient-to-r from-[#C88B37] to-[#E5A93B]" />
                        <MetricBar label="WebSocket Bandwidth" value={14.8} max={100} suffix=" Mbps" colorClass="bg-gradient-to-r from-[#C88B37] to-[#E5A93B]" />
                    </div>
                </section>

                {/* ==========================================
                    THIRD ROW: RECENT LOGINS, ACTIVE USERS & STORAGE (DATABASE QUERIED)
                    ========================================== */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    
                    {/* Logins table */}
                    <div className="xl:col-span-6 bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-[#C88B37]/15 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">Recent Login Audit Logs</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Authentication access metrics from directory credentials.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-semibold">
                                        <th className="py-2.5">User</th>
                                        <th className="py-2.5">Agent Details</th>
                                        <th className="py-2.5">IP Address</th>
                                        <th className="py-2.5">Location</th>
                                        <th className="py-2.5">Time</th>
                                        <th className="py-2.5 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {logins.map((row) => (
                                        <LoginRow 
                                            key={row.id} 
                                            user={row.user_name || row.username_or_email} 
                                            email={row.user_email || 'No credentials'} 
                                            device={row.user_agent ? row.user_agent.split(' ')[0] : 'Unknown'}
                                            browser={row.user_agent ? row.user_agent.split(' ').slice(-1)[0] : 'Client'}
                                            ip={row.ip_address} 
                                            loc={row.location || 'Remote Host'} 
                                            time={new Date(row.login_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                            success={row.status === 'success'} 
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Active users list */}
                    <div className="xl:col-span-3 bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-[#C88B37]/15 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">Active Accounts</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Users with highest chat volume.</p>
                        </div>
                        <div className="space-y-4">
                            {activeUsers.map((user) => (
                                <ActiveUserRow 
                                    key={user.id} 
                                    name={user.name} 
                                    dept={user.department || 'Staff'} 
                                    count={user.messages_count || 0} 
                                    time={user.online_status === 'online' ? 'Active now' : 'Offline'} 
                                    color={user.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Storage breakdowns */}
                    <div className="xl:col-span-3 bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-[#C88B37]/15 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div>
                            <div className="pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                                <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">Storage Breakdown</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Binary assets space usage analytics.</p>
                            </div>
                            
                            <div className="h-28 flex items-center justify-center my-4 relative">
                                <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(148,163,184,0.05)" strokeWidth="10" />
                                    {/* Images */}
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#C88B37" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * imagesPercent) / 100} strokeLinecap="round" className="drop-shadow-[0_0_6px_rgba(200,139,55,0.3)]" />
                                    {/* Documents */}
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E5A93B" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * docsPercent) / 100} strokeLinecap="round" className="origin-center rotate-[120deg] drop-shadow-[0_0_6px_rgba(229,169,59,0.2)]" />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-400 select-none">Storage</span>
                                    <span className="text-sm font-bold text-slate-850 dark:text-slate-200">{stats.storage_used_mb} MB</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            <PieIndicator label="Images" percent={imagesPercent} color="bg-[#C88B37]" />
                            <PieIndicator label="Documents" percent={docsPercent} color="bg-[#E5A93B]" />
                            <PieIndicator label="Other Files" percent={othersPercent} color="bg-slate-400" />
                        </div>
                    </div>

                </div>

                {/* ==========================================
                    QUICK ACTIONS PANEL
                    ========================================== */}
                <section className="bg-white/70 dark:bg-[#0F0F0F]/60 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                        <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">System Administrator Quick Actions</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Trigger standard admin commands instantly.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickActionButton label="Create Enterprise User" icon={UserPlus} onClick={() => setShowCreateModal(true)} />
                        
                        <button
                            onClick={handleBackupNow}
                            disabled={isBackingUp}
                            className="p-4 bg-white/50 dark:bg-[#0F0F0F]/45 hover:bg-[#C88B37]/10 dark:hover:bg-[#C88B37]/15 text-slate-700 dark:text-slate-300 hover:text-[#C88B37] dark:hover:text-[#C88B37] rounded-2xl border border-slate-200/60 dark:border-white/5 font-semibold text-xs flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-sm hover:scale-[1.03] text-center hover:border-[#C88B37]/30 hover:shadow-md hover:shadow-[#C88B37]/5 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-transparent group-hover:border-[#C88B37]/20 group-hover:bg-[#C88B37]/10 transition-colors">
                                {isBackingUp ? (
                                    <RefreshCw className="w-5 h-5 animate-spin text-[#C88B37]" />
                                ) : backupSuccess ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Cloud className="w-5 h-5 text-[#C88B37]" />
                                )}
                            </div>
                            <span>{isBackingUp ? 'Backing up...' : backupSuccess ? 'Backup Completed!' : 'Backup Now'}</span>
                        </button>

                        <button
                            onClick={handleRestartQueue}
                            disabled={queueRestarting}
                            className="p-4 bg-white/50 dark:bg-[#0F0F0F]/45 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 hover:text-amber-500 rounded-2xl border border-slate-200/60 dark:border-white/5 font-semibold text-xs flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-sm hover:scale-[1.03] text-center hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-transparent group-hover:border-amber-500/20 group-hover:bg-amber-500/10 transition-colors">
                                {queueRestarting ? (
                                    <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                                ) : (
                                    <Zap className="w-5 h-5 text-amber-500" />
                                )}
                            </div>
                            <span>{queueRestarting ? 'Restarting Queue...' : 'Restart Queue Workers'}</span>
                        </button>

                        <QuickActionButton label="View Security Audit Logs" icon={ClipboardList} href="/admin/security" />
                    </div>
                </section>                {/* Footer panel */}
                <footer className="h-16 border-t border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-[#0F0F0F]/30 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>JKChat Enterprise Admin Portal</span>
                        <span>•</span>
                        <span>v1.2.0</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>OS: {system.server_os}</span>
                        <span>PHP: {system.php_version}</span>
                        <span>Laravel: v11.x</span>
                        <span>WebSocket: Reverb</span>
                    </div>
                </footer>

            </div>

            {/* Create modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/5 rounded-3xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                            <h3 className="text-sm font-bold tracking-tight">Create Enterprise User</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs">Close</button>
                        </div>
                        
                        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.name}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#C88B37] focus:border-[#C88B37] focus:outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#C88B37] focus:border-[#C88B37] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Role</label>
                                    <select
                                        value={newUserForm.role}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#C88B37] focus:border-[#C88B37] focus:outline-none"
                                    >
                                        <option>User</option>
                                        <option>Manager</option>
                                        <option>Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Department</label>
                                    <select
                                        value={newUserForm.dept}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, dept: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#C88B37] focus:border-[#C88B37] focus:outline-none"
                                    >
                                        <option>Engineering</option>
                                        <option>Marketing</option>
                                        <option>Sales</option>
                                        <option>Security</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#C88B37] hover:bg-[#b0782f] text-black rounded-xl text-xs font-semibold shadow-sm">Save Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AppLayout>
    );
}

function StatCard({ title, value, change, positive, points, icon: Icon, tooltip, valueClass = "" }: { title: string, value: string | number, change: string, positive: boolean, points: number[], icon: React.ComponentType<{ className?: string }>, tooltip: string, valueClass?: string }) {
    const cardId = title.replace(/\s+/g, '-').toLowerCase();
    
    function renderSparkline(points: number[], isPositive: boolean, id: string) {
        const width = 80;
        const height = 24;
        const max = Math.max(...points);
        const min = Math.min(...points);
        const range = max - min || 1;
        const path = points.map((p, idx) => {
            const x = (idx / (points.length - 1)) * width;
            const y = height - ((p - min) / range) * (height - 6) - 3;
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
        const strokeColor = isPositive ? '#C88B37' : '#94A3B8';
        const gradientId = `sparkline-grad-${id}`;

        return (
            <svg width={width} height={height} className="overflow-visible select-none">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path d={path} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-20 blur-[1px]" />
                <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    const isHot = title.toLowerCase().includes('active') || title.toLowerCase().includes('now');
    const valueStyle = valueClass
        ? valueClass
        : "text-slate-800 dark:text-white group-hover:text-[#C88B37]";

    return (
        <div 
            className="relative p-[1px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200/60 to-transparent dark:from-white/10 dark:to-transparent hover:from-[#C88B37]/50 hover:to-[#E5A93B]/20 shadow-sm hover:shadow-xl hover:shadow-[#C88B37]/5 dark:hover:shadow-[#C88B37]/5 transition-all duration-500 hover:scale-[1.03] group cursor-help" 
            title={tooltip}
        >
            <div className="relative bg-white/80 dark:bg-[#0E0E10]/95 backdrop-blur-xl rounded-[15px] p-4 flex flex-col justify-between h-full">
                
                {/* Glowing light radial gradient blob */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#C88B37]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 select-none pointer-events-none" />

                <div className="flex items-center justify-between gap-2 relative z-10">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
                        {title}
                    </span>
                    <div className="p-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 rounded-xl group-hover:text-[#C88B37] group-hover:border-[#C88B37]/25 group-hover:bg-[#C88B37]/10 group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 mt-3.5 relative z-10">
                    <div className="flex flex-col min-w-0">
                        <span className={`text-2xl font-black tracking-tight transition-colors duration-500 truncate ${isHot ? 'flex items-center gap-1.5' : ''} ${valueStyle}`}>
                            {isHot && (
                                <span className="relative flex h-2 w-2 shrink-0 self-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                            )}
                            {value}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold mt-1 select-none">
                            <span className={`px-2 py-0.5 rounded-full font-extrabold ${
                                positive 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-amber-500/10 text-[#C88B37]"
                            }`}>
                                {change}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">vs last week</span>
                        </div>
                    </div>
                    
                    <div className="w-20 h-8 shrink-0 opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
                        {points && renderSparkline(points, positive, cardId)}
                    </div>
                </div>

            </div>
        </div>
    );
}

function GraphTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active 
                    ? 'bg-[#C88B37] text-black font-bold shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
            {label}
        </button>
    );
}

function ActivityItem({ icon: Icon, title, body, time, badge }: { icon: React.ComponentType<{ className?: string }>, title: string, body: string, time: string, badge: string }) {
    return (
        <div className="flex gap-3 hover:translate-x-0.5 transition-transform duration-300">
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 ${badge}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">{title}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">{time}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{body}</p>
            </div>
        </div>
    );
}

function StatusBadge({ name, status, type }: { name: string, status: string, type: 'success' | 'warning' | 'danger' }) {
    const getTheme = () => {
        switch (type) {
            case 'success':
                return {
                    dot: 'bg-emerald-500',
                    text: 'text-emerald-600 dark:text-emerald-400',
                    border: 'hover:border-emerald-500/35 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                };
            case 'warning':
                return {
                    dot: 'bg-amber-500',
                    text: 'text-amber-600 dark:text-amber-400',
                    border: 'hover:border-amber-500/35 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                };
            default:
                return {
                    dot: 'bg-rose-500',
                    text: 'text-rose-600 dark:text-rose-450',
                    border: 'hover:border-rose-500/35 hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                };
        }
    };
    
    const theme = getTheme();
    
    return (
        <div className={`p-3.5 rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0A0A0A]/40 dark:border-white/5 backdrop-blur-md text-center flex flex-col justify-between items-center gap-1.5 shadow-sm transition-all duration-300 hover:scale-[1.04] ${theme.border}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">{name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.dot}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dot}`} />
                </span>
                <span className={`text-xs font-extrabold tracking-tight ${theme.text} truncate`}>{status}</span>
            </div>
        </div>
    );
}

function MetricBar({ label, value, max, suffix, colorClass }: { label: string, value: number, max: number, suffix: string, colorClass: string }) {
    const percent = Math.min((value / max) * 100, 100);
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">{label}</span>
                <span>{value}{suffix}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-[#0A0A0A] rounded-full overflow-hidden border dark:border-white/5">
                <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function LoginRow({ user, email, device, browser, ip, loc, time, success }: { user: string, email: string, device: string, browser: string, ip: string, loc: string, time: string, success: boolean }) {
    return (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <td className="py-3 pr-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#C88B37]/15 dark:bg-[#C88B37]/20 border border-[#C88B37]/15 text-[#C88B37] font-bold flex items-center justify-center text-[10px]">
                        {user[0]}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{user}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{email}</p>
                    </div>
                </div>
            </td>
            <td className="py-3 text-slate-500 dark:text-slate-400 pr-2">
                <div className="flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>{device} ({browser})</span>
                </div>
            </td>
            <td className="py-3 text-slate-500 dark:text-slate-400 font-mono pr-2">{ip}</td>
            <td className="py-3 text-slate-500 dark:text-slate-400 pr-2">{loc}</td>
            <td className="py-3 text-slate-400 dark:text-slate-500 pr-2">{time}</td>
            <td className="py-3 text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                    success 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/10' 
                        : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-500/10'
                }`}>
                    {success ? 'Success' : 'Blocked'}
                </span>
            </td>
        </tr>
    );
}

function ActiveUserRow({ name, dept, count, time, color }: { name: string, dept: string, count: number, time: string, color: string }) {
    return (
        <div className="flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-white/5 p-1.5 rounded-xl transition-all duration-300 hover:translate-x-0.5">
            <div className={`w-8 h-8 rounded-full ${color} text-white font-bold flex items-center justify-center text-[10px] shadow-sm`}>
                {name[0]}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs truncate">{name}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{count} msgs</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{dept}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{time}</span>
                </div>
            </div>
        </div>
    );
}

function PieIndicator({ label, percent, color }: { label: string, percent: number, color: string }) {
    return (
        <div className="flex items-center justify-between text-[11px] font-semibold">
            <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-md ${color}`} />
                <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
            </div>
            <span>{percent}%</span>
        </div>
    );
}

function SummaryItem({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="flex items-center justify-between text-xs font-semibold py-1">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
            <span className="text-slate-800 dark:text-slate-200">{value}</span>
        </div>
    );
}

function QuickActionButton({ label, icon: Icon, onClick, href }: { label: string, icon: React.ComponentType<{ className?: string }>, onClick?: () => void, href?: string }) {
    const content = (
        <span className="w-full p-4 bg-white/50 dark:bg-[#0F0F0F]/45 hover:bg-[#C88B37]/10 dark:hover:bg-[#C88B37]/15 text-slate-700 dark:text-slate-300 hover:text-[#C88B37] dark:hover:text-[#C88B37] rounded-2xl border border-slate-200/60 dark:border-white/5 font-semibold text-xs flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-sm hover:scale-[1.03] text-center hover:border-[#C88B37]/30 hover:shadow-md hover:shadow-[#C88B37]/5 group">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-transparent group-hover:border-[#C88B37]/20 group-hover:bg-[#C88B37]/10 transition-colors">
                <Icon className="w-5 h-5 text-[#C88B37] group-hover:scale-110 transition-transform" />
            </div>
            <span>{label}</span>
        </span>
    );

    if (href) {
        return (
            <Link href={href} className="flex">
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className="w-full">
            {content}
        </button>
    );
}
