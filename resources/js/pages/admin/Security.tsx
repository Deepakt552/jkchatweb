import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { 
    ShieldCheck, 
    History, 
    Smartphone, 
    AlertTriangle,
    Eye
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Security & Audits',
        href: '/admin/security',
    },
];

interface LoginLog {
    id: number;
    user_id: number | null;
    username_or_email: string;
    ip_address: string;
    user_agent: string | null;
    status: 'success' | 'failed';
    failed_reason: string | null;
    login_at: string;
    user?: { name: string } | null;
}

interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    resource_type: string;
    resource_id: string;
    ip_address: string;
    user_agent: string | null;
    created_at: string;
    user?: { name: string } | null;
}

interface Pagination<T> {
    data: T[];
    links: any[];
}

interface Props {
    loginHistory: Pagination<LoginLog>;
    auditLogs: Pagination<AuditLog>;
    activeDevicesCount: number;
}

export default function Security({ loginHistory, auditLogs, activeDevicesCount }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security & Audits" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                
                {/* Header and stats */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Security & Audits</h1>
                        <p className="text-neutral-500">Monitor organizational authentication patterns and administrative logs.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-4 shadow-sm dark:border-white/5 flex items-center gap-3 hover:border-[#C88B37]/15 hover:scale-[1.01] transition-all duration-300">
                        <Smartphone className="h-8 w-8 text-[#C88B37]" />
                        <div>
                            <div className="text-2xl font-bold">{activeDevicesCount}</div>
                            <div className="text-xs text-neutral-500">Active tokens/devices</div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    
                    {/* Left: Login History */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                            <History className="h-5 w-5 text-[#C88B37]" />
                            Access Login History
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md shadow-sm dark:border-white/5 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A]">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Identity Details</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">IP / Host</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                    {loginHistory.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                            <td className="px-6 py-3">
                                                <div className="font-semibold text-slate-800 dark:text-white">
                                                    {log.user ? log.user.name : log.username_or_email}
                                                </div>
                                                <div className="text-xxs text-neutral-400 max-w-[200px] truncate" title={log.user_agent || ''}>
                                                    {log.user_agent}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 font-mono">{log.ip_address}</td>
                                            <td className="px-6 py-3">
                                                {log.status === 'success' ? (
                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xxs font-medium text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-500/10">Success</span>
                                                ) : (
                                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-xxs font-medium text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-500/10" title={log.failed_reason || ''}>
                                                        Failed: {log.failed_reason || 'Unknown'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-neutral-400">{new Date(log.login_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Administrative Audit Log */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-[#C88B37]" />
                            Administrative Audit Trails
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md shadow-sm dark:border-white/5 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A]">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Admin User</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Action Type</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Resource Target</th>
                                        <th className="px-6 py-3.5 font-semibold text-neutral-500">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                    {auditLogs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                            <td className="px-6 py-3">
                                                <div className="font-semibold text-slate-800 dark:text-white">
                                                    {log.user ? log.user.name : 'System/Scheduler'}
                                                </div>
                                                <div className="text-xxs text-neutral-400">{log.ip_address}</div>
                                            </td>
                                            <td className="px-6 py-3 font-semibold text-[#C88B37]">{log.action}</td>
                                            <td className="px-6 py-3 text-neutral-500">
                                                {log.resource_type} (ID: {log.resource_id})
                                            </td>
                                            <td className="px-6 py-3 text-neutral-400">{new Date(log.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}
