import { Outlet } from 'react-router';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

export default function AdminLayout() {
    return (
        <div className="min-h-screen flex flex-col bg-muted/30">
            {/* Header: mobile-first, đơn giản */}
            {/* <header className="sticky top-0 z-40 shrink-0 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
                <div className="flex h-14 items-center px-4">
                    <Link
                        to="/admin"
                        className="flex items-center gap-2 font-semibold"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <LayoutDashboard className="h-4 w-4" />
                        </div>
                        <span className="text-base">Admin</span>
                    </Link>
                </div>
            </header> */}

            {/* Main content – padding bottom để không bị navbar che */}
            <main className="flex-1 overflow-auto pb-20">
                <div className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Navbar cố định ở dưới (mobile-first) */}
            <AdminNavbar />
        </div>
    );
}
