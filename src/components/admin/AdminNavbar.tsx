import { Link, useLocation } from 'react-router';
import { Flag, Monitor, Users, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/admin/control', label: 'Control', icon: Monitor },
    { to: '/admin/teams', label: 'Teams', icon: Flag },
    { to: '/admin/players', label: 'Players', icon: Users },
    { to: '/admin', label: 'Account', icon: UserCircle2 },
] as const;

export function AdminNavbar() {
    const { pathname } = useLocation();

    return (
        <nav
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50',
                'flex flex-row items-center justify-around',
                'border-t bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80',
                'pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                'shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.1)]',
            )}
        >
            {navItems.map(({ to, label, icon: Icon }) => {
                const isActive =
                    pathname === to ||
                    (to !== '/admin' && pathname.startsWith(to));
                return (
                    <Link
                        key={to}
                        to={to}
                        className={cn(
                            'flex flex-col items-center gap-1 min-w-16 py-1 rounded-lg',
                            'transition-colors active:scale-95',
                            isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Icon
                            className={cn(
                                'size-6 shrink-0',
                                isActive && 'stroke-[2.5]',
                            )}
                            aria-hidden
                        />
                        <span className="text-xs font-medium">{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
