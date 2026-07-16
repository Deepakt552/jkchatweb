import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { 
    Settings, 
    Save, 
    Shield, 
    FileUp, 
    Mail, 
    Server,
    Loader2
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Global Settings',
        href: '/admin/settings',
    },
];

interface Props {
    settings: {
        app_name: string;
        file_upload_limit: string;
        allowed_file_types: string;
        privacy_mode_enabled: string;
        backup_schedule: string;
        maintenance_mode: string;
        smtp_host?: string;
        smtp_port?: string;
        smtp_username?: string;
        smtp_password?: string;
        smtp_encryption?: string;
    };
}

export default function SettingsPage({ settings }: Props) {
    const form = useForm({
        app_name: settings.app_name || 'SecureChat Enterprise',
        file_upload_limit: Number(settings.file_upload_limit || 104857600),
        allowed_file_types: settings.allowed_file_types || '',
        privacy_mode_enabled: settings.privacy_mode_enabled === '1',
        backup_schedule: settings.backup_schedule || 'daily',
        maintenance_mode: settings.maintenance_mode === '1',
        smtp_host: settings.smtp_host || '',
        smtp_port: Number(settings.smtp_port || 2525),
        smtp_username: settings.smtp_username || '',
        smtp_password: settings.smtp_password || '',
        smtp_encryption: settings.smtp_encryption || 'tls',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Global Settings" />
            <form onSubmit={handleSubmit} className="flex h-full flex-1 flex-col gap-6 p-6">
                
                {/* Header Action */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Global Settings</h1>
                        <p className="text-neutral-500">Configure application preferences, security policies, mail routing, and system parameters.</p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={form.processing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#C88B37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#b0782f] shadow-sm hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    >
                        {form.processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save Config
                    </button>
                </div>

                {/* settings Form groups */}
                <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* General Setup */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-6 shadow-sm dark:border-white/5 space-y-4 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
                            <Server className="h-5 w-5 text-[#C88B37]" />
                            General Application Setup
                        </h2>
                        
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Application Branding Name</label>
                            <input 
                                type="text" 
                                required
                                value={form.data.app_name}
                                onChange={(e) => form.setData('app_name', e.target.value)}
                                className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Backup Sync Interval</label>
                            <select 
                                value={form.data.backup_schedule}
                                onChange={(e) => form.setData('backup_schedule', e.target.value)}
                                className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            >
                                <option value="manual">Manual Archive Sync Only</option>
                                <option value="daily">Daily Cron Sync</option>
                                <option value="weekly">Weekly Cron Sync</option>
                                <option value="monthly">Monthly Cron Sync</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input 
                                type="checkbox" 
                                id="maintenanceMode" 
                                checked={form.data.maintenance_mode}
                                onChange={(e) => form.setData('maintenance_mode', e.target.checked)}
                                className="rounded border-neutral-350 dark:border-white/10 dark:bg-[#0A0A0A] text-[#C88B37] focus:ring-[#C88B37]"
                            />
                            <label htmlFor="maintenanceMode" className="text-sm font-medium">
                                Maintenance Lock (Lock active chat features for users)
                            </label>
                        </div>
                    </div>

                    {/* Encryption & Security Policies */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-6 shadow-sm dark:border-white/5 space-y-4 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
                            <Shield className="h-5 w-5 text-[#C88B37]" />
                            Security & Cryptographic Policies
                        </h2>

                        <div className="flex items-start gap-3 p-3 bg-[#C88B37]/10 rounded-xl text-xs text-[#C88B37] dark:bg-[#C88B37]/15 dark:text-[#C88B37] border border-[#C88B37]/10 backdrop-blur-md">
                            <Shield className="h-4.5 w-4.5 shrink-0 mt-0.5 text-[#C88B37]" />
                            <div>
                                <div className="font-semibold mb-0.5">End-to-End Chat Encryption (E2EE)</div>
                                When active, all message payloads and file contents are fully encrypted client-side using AES-256 keys. Cyphertexts are uploaded to database. 
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input 
                                type="checkbox" 
                                id="privacyMode" 
                                checked={form.data.privacy_mode_enabled}
                                onChange={(e) => form.setData('privacy_mode_enabled', e.target.checked)}
                                className="rounded border-neutral-350 dark:border-white/10 dark:bg-[#0A0A0A] text-[#C88B37] focus:ring-[#C88B37]"
                            />
                            <label htmlFor="privacyMode" className="text-sm font-medium">
                                Enforce Privacy Policy (Hide chat transcripts from Administrators)
                            </label>
                        </div>
                    </div>

                    {/* Upload Limits */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-6 shadow-sm dark:border-white/5 space-y-4 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
                            <FileUp className="h-5 w-5 text-[#C88B37]" />
                            File Size & Format Policies
                        </h2>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Maximum Upload Limit (Bytes)</label>
                            <input 
                                type="number" 
                                required
                                value={form.data.file_upload_limit}
                                onChange={(e) => form.setData('file_upload_limit', Number(e.target.value))}
                                className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                            />
                            <span className="text-xxs text-neutral-400 mt-1 block">
                                Configured value: {roundBytesToMB(form.data.file_upload_limit)} MB
                            </span>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Permitted Extension list (Comma separated)</label>
                            <textarea 
                                rows={3}
                                value={form.data.allowed_file_types}
                                onChange={(e) => form.setData('allowed_file_types', e.target.value)}
                                className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            />
                        </div>
                    </div>

                    {/* SMTP Configuration */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md p-6 shadow-sm dark:border-white/5 space-y-4 hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
                            <Mail className="h-5 w-5 text-[#C88B37]" />
                            SMTP Email Delivery Service
                        </h2>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-neutral-500 uppercase">SMTP Host Address</label>
                                <input 
                                    type="text" 
                                    value={form.data.smtp_host}
                                    onChange={(e) => form.setData('smtp_host', e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase">Port</label>
                                <input 
                                    type="number" 
                                    value={form.data.smtp_port}
                                    onChange={(e) => form.setData('smtp_port', Number(e.target.value))}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase">SMTP Auth Username</label>
                                <input 
                                    type="text" 
                                    value={form.data.smtp_username}
                                    onChange={(e) => form.setData('smtp_username', e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase">SMTP Auth Password</label>
                                <input 
                                    type="password" 
                                    value={form.data.smtp_password}
                                    onChange={(e) => form.setData('smtp_password', e.target.value)}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Transport Security Layer</label>
                            <input 
                                type="text" 
                                value={form.data.smtp_encryption}
                                onChange={(e) => form.setData('smtp_encryption', e.target.value)}
                                className="w-full mt-1 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                            />
                        </div>
                    </div>

                </div>

            </form>
        </AppLayout>
    );
}

function roundBytesToMB(bytes: number) {
    return roundToTwo(bytes / 1024 / 1024);
}

function roundToTwo(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
