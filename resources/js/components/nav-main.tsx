import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-3 py-2">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                Platform Navigation
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
                {items.map((item) => {
                    const isActive = page.url === item.url || (item.url !== '/dashboard' && page.url.startsWith(item.url));
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive} className="h-10 rounded-xl px-3 transition-all duration-200">
                                <Link 
                                    href={item.url} 
                                    prefetch
                                    className={
                                        isActive
                                            ? '!bg-gradient-to-r !from-[#2788E8] !to-[#32C2A3] !text-white font-bold shadow-md shadow-[#2788E8]/20 flex items-center gap-3'
                                            : 'flex items-center gap-3 text-[#64748B] hover:bg-[#EAF4FF] hover:text-[#2788E8] dark:text-neutral-300 dark:hover:bg-[#1E293B] dark:hover:text-[#32C2A3] font-medium'
                                    }
                                >
                                    {item.icon && <item.icon className={isActive ? '!text-white h-4 w-4 shrink-0' : 'h-4 w-4 shrink-0 text-[#94A3B8] group-hover:text-[#2788E8]'} />}
                                    <span className={isActive ? '!text-white text-sm tracking-tight' : 'text-sm tracking-tight'}>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
