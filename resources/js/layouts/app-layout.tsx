import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import AdminLayoutTemplate from '@/layouts/admin-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth?.user?.is_admin === true;
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    if (isAdminRoute) {
        return (
            <AdminLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                {children}
            </AdminLayoutTemplate>
        );
    }

    if (isAdmin) {
        return (
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                {children}
            </AppLayoutTemplate>
        );
    }

    // Normal chat users see the full-screen chat application without outer sidebars or headers
    return (
        <div className="flex min-h-screen w-full flex-col bg-[#0C0C0C]">
            {children}
        </div>
    );
};
