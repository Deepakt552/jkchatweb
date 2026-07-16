import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { 
    Plus, 
    Search, 
    UserX, 
    Key, 
    Power, 
    Download, 
    Upload, 
    Edit2, 
    Trash2, 
    Loader2,
    ShieldAlert,
    Smartphone
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Directory',
        href: '/admin/users',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    username: string;
    department: string | null;
    designation: string | null;
    is_admin: boolean;
    is_enabled: boolean;
    is_suspended: boolean;
    temp_password: string | null;
}

interface Pagination<T> {
    data: T[];
    links: any[];
    current_page: number;
    last_page: number;
}

interface Props {
    users: Pagination<User>;
    filters: { search?: string };
}

export default function Users({ users, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const addForm = useForm({
        name: '',
        email: '',
        username: '',
        department: '',
        designation: '',
        is_admin: false,
        password: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        username: '',
        department: '',
        designation: '',
        is_admin: false,
        password: '',
    });

    const importForm = useForm({
        file: null as File | null,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/users', { search }, { preserveState: true });
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/admin/users', {
            onSuccess: () => {
                addForm.reset();
                setIsAddOpen(false);
            }
        });
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            username: user.username,
            department: user.department || '',
            designation: user.designation || '',
            is_admin: user.is_admin,
            password: '',
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        editForm.patch(`/admin/users/${editingUser.id}`, {
            onSuccess: () => setEditingUser(null),
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to permanently delete this user?')) {
            router.delete(`/admin/users/${id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.post(`/admin/users/${id}/toggle-status`);
    };

    const handleToggleSuspension = (id: number) => {
        router.post(`/admin/users/${id}/toggle-suspension`);
    };

    const handleForceReset = (id: number) => {
        if (confirm('Force password reset for this user? This will log them out from all devices and generate a new temp password.')) {
            router.post(`/admin/users/${id}/force-reset`);
        }
    };

    const handleLogoutRemote = (id: number) => {
        if (confirm('Logout user from all active devices remotely?')) {
            router.post(`/admin/users/${id}/logout-remote`);
        }
    };

    const handleResetDevices = (id: number) => {
        if (confirm('Reset all device records for this user? This allows their devices to be registered by other users.')) {
            router.post(`/admin/users/${id}/reset-devices`);
        }
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importForm.setData('file', file);
            router.post('/admin/users/import', {
                file: file
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Directory" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                
                {/* Header Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Directory</h1>
                        <p className="text-neutral-500">Manage employee messaging credentials, directory listings, and permissions.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => setIsAddOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C88B37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#b0782f] shadow-sm hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                            <Plus className="h-4 w-4" />
                            Add Account
                        </button>

                        <a 
                            href="/admin/users/export"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/5 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </a>

                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/5 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            <Upload className="h-4 w-4" />
                            Import CSV
                            <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleImportCSV} 
                                className="hidden" 
                            />
                        </label>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, username or department..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-[#C88B37]/80 focus:shadow-[0_0_15px_rgba(200,139,55,0.15)] focus:ring-4 focus:ring-[#C88B37]/10 dark:border-white/5 dark:bg-[#0A0A0A] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        />
                    </div>
                    <button type="submit" className="rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white/5 dark:text-[#C88B37] dark:border dark:border-[#C88B37]/20 dark:hover:bg-[#C88B37]/10 hover:scale-[1.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        Search
                    </button>
                </form>

                {/* Users Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-[#0F0F0F]/65 backdrop-blur-md dark:border-white/5 shadow-sm hover:border-[#C88B37]/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A]">
                            <tr>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Name / Profile</th>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Contact Address</th>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Org Details</th>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Status Roles</th>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">System Code</th>
                                <th className="px-6 py-3.5 font-bold tracking-wider text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                            {users.data.map((user) => (
                                <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C88B37]/20 to-[#E5A93B]/10 border border-[#C88B37]/35 text-[#C88B37] font-bold text-xs flex items-center justify-center select-none shadow-sm uppercase">
                                                {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-850 dark:text-white truncate">{user.name}</span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 truncate">@{user.username}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-350">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.designation || 'Staff'}</div>
                                        <div className="text-xs text-slate-400">{user.department || 'No Dept'}</div>
                                    </td>
                                    <td className="px-6 py-4 space-y-1">
                                        <div className="flex gap-1 flex-wrap">
                                            {user.is_admin ? (
                                                <span className="rounded bg-[#C88B37]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#C88B37] dark:bg-[#C88B37]/15 dark:text-[#C88B37]">Admin</span>
                                            ) : (
                                                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">User</span>
                                            )}
                                            {user.is_enabled ? (
                                                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-450">Active</span>
                                            ) : (
                                                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-455">Disabled</span>
                                            )}
                                            {user.is_suspended && (
                                                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-450">Suspended</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.temp_password ? (
                                            <span className="font-mono text-xs text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/30 dark:text-amber-450 px-2 py-1 rounded">
                                                {user.temp_password}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-neutral-400 select-none">Secure</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                                        <ActionButton 
                                            title={user.is_enabled ? "Disable Account" : "Enable Account"} 
                                            icon={Power} 
                                            onClick={() => handleToggleStatus(user.id)}
                                            colorClass={user.is_enabled ? 'text-rose-600 dark:text-rose-400 hover:border-rose-400/30 hover:bg-rose-500/10' : 'text-emerald-600 dark:text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-500/10'}
                                        />
                                        <ActionButton 
                                            title={user.is_suspended ? "Unsuspend Account" : "Suspend Account"} 
                                            icon={UserX} 
                                            onClick={() => handleToggleSuspension(user.id)}
                                            colorClass={user.is_suspended ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' : 'text-amber-600 dark:text-amber-400 hover:border-amber-400/30 hover:bg-amber-500/10'}
                                        />
                                        <ActionButton 
                                            title="Force PW Reset" 
                                            icon={Key} 
                                            onClick={() => handleForceReset(user.id)}
                                        />
                                        <ActionButton 
                                            title="Remote Logout" 
                                            icon={ShieldAlert} 
                                            onClick={() => handleLogoutRemote(user.id)}
                                            colorClass="text-sky-600 dark:text-sky-400 hover:border-sky-400/30 hover:bg-sky-500/10"
                                        />
                                        <ActionButton 
                                            title="Reset Devices" 
                                            icon={Smartphone} 
                                            onClick={() => handleResetDevices(user.id)}
                                        />
                                        <ActionButton 
                                            title="Edit Profile" 
                                            icon={Edit2} 
                                            onClick={() => handleEditClick(user)}
                                            colorClass="text-[#C88B37] hover:border-[#C88B37]/35 hover:bg-[#C88B37]/10"
                                        />
                                        <ActionButton 
                                            title="Delete Account" 
                                            icon={Trash2} 
                                            onClick={() => handleDelete(user.id)}
                                            colorClass="text-rose-600 dark:text-rose-400 hover:border-rose-400/30 hover:bg-rose-500/10"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add User Modal */}
                {isAddOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-[#0F0F0F] border border-neutral-200 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold tracking-tight mb-4">Create Account</h2>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase">Full Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={addForm.data.name}
                                        onChange={(e) => addForm.setData('name', e.target.value)}
                                        className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Username</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={addForm.data.username}
                                            onChange={(e) => addForm.setData('username', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Email</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={addForm.data.email}
                                            onChange={(e) => addForm.setData('email', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase">Password (Optional)</label>
                                    <input 
                                        type="password" 
                                        placeholder="Leave blank to auto-generate temporary password"
                                        value={addForm.data.password}
                                        onChange={(e) => addForm.setData('password', e.target.value)}
                                        className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                    />
                                    {addForm.errors.password && <div className="text-xs text-rose-500 mt-1">{addForm.errors.password}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Department</label>
                                        <input 
                                            type="text" 
                                            value={addForm.data.department}
                                            onChange={(e) => addForm.setData('department', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Designation</label>
                                        <input 
                                            type="text" 
                                            value={addForm.data.designation}
                                            onChange={(e) => addForm.setData('designation', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="isAdmin" 
                                        checked={addForm.data.is_admin}
                                        onChange={(e) => addForm.setData('is_admin', e.target.checked)}
                                        className="rounded border-neutral-350 dark:border-white/10 dark:bg-[#0A0A0A] text-[#C88B37] focus:ring-[#C88B37]"
                                    />
                                    <label htmlFor="isAdmin" className="text-sm font-medium">Assign Administrator Privileges</label>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddOpen(false)}
                                        className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A] dark:text-neutral-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={addForm.processing}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#C88B37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#b0782f] shadow-sm"
                                    >
                                        {addForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-[#0F0F0F] border border-neutral-200 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold tracking-tight mb-4">Edit Profile</h2>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase">Full Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Username</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={editForm.data.username}
                                            onChange={(e) => editForm.setData('username', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Email</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={editForm.data.email}
                                            onChange={(e) => editForm.setData('email', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase">New Password (Optional)</label>
                                    <input 
                                        type="password" 
                                        placeholder="Leave blank to keep current password"
                                        value={editForm.data.password}
                                        onChange={(e) => editForm.setData('password', e.target.value)}
                                        className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                    />
                                    {editForm.errors.password && <div className="text-xs text-rose-500 mt-1">{editForm.errors.password}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Department</label>
                                        <input 
                                            type="text" 
                                            value={editForm.data.department}
                                            onChange={(e) => editForm.setData('department', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 uppercase">Designation</label>
                                        <input 
                                            type="text" 
                                            value={editForm.data.designation}
                                            onChange={(e) => editForm.setData('designation', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:border-[#C88B37] focus:ring-1 focus:ring-[#C88B37] outline-none dark:border-white/5 dark:bg-[#0A0A0A]" 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="editIsAdmin" 
                                        checked={editForm.data.is_admin}
                                        onChange={(e) => editForm.setData('is_admin', e.target.checked)}
                                        className="rounded border-neutral-350 dark:border-white/10 dark:bg-[#0A0A0A] text-[#C88B37] focus:ring-[#C88B37]"
                                    />
                                    <label htmlFor="editIsAdmin" className="text-sm font-medium">Assign Administrator Privileges</label>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setEditingUser(null)}
                                        className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/5 dark:bg-[#0A0A0A] dark:text-neutral-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={editForm.processing}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#C88B37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#b0782f] shadow-sm"
                                    >
                                        {editForm.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}

interface ActionButtonProps {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    colorClass?: string;
}

function ActionButton({ title, icon: Icon, onClick, colorClass = "text-slate-500 hover:text-[#C88B37] dark:text-slate-400 hover:border-[#C88B37]/35 dark:hover:bg-white/5 hover:bg-[#C88B37]/10" }: ActionButtonProps) {
    return (
        <div className="relative group/tooltip inline-block">
            <button 
                onClick={onClick}
                className={`p-2 rounded-xl border border-neutral-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0A0A0C]/50 transition-all duration-300 hover:scale-105 ${colorClass}`}
            >
                <Icon className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-30 px-2.5 py-1 text-[10px] font-bold text-white bg-slate-900/95 dark:bg-black/95 backdrop-blur-md rounded-lg shadow-md whitespace-nowrap pointer-events-none border border-slate-700/30 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
                {title}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95 dark:border-t-black/95" />
            </div>
        </div>
    );
}
