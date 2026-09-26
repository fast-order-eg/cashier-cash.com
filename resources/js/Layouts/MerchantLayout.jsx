import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, 
    Scan, 
    Package, 
    FolderTree, 
    Warehouse, 
    Receipt, 
    FileText, 
    BarChart3, 
    Users, 
    Settings, 
    LogOut, 
    Menu, 
    X, 
    ChevronLeft,
    Truck,
    Clock,
    DollarSign,
    ExternalLink
} from 'lucide-react';

export default function MerchantLayout({ children, title = 'لوحة التحكم' }) {
    const { auth, tenant, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { name: 'الرئيسية والإحصائيات', href: route('admin.dashboard'), icon: LayoutDashboard },
        { name: 'الأصناف والمخزون', href: route('admin.products.index'), icon: Package },
        { name: 'أقسام المنتجات', href: route('admin.categories.index'), icon: FolderTree },
        { name: 'المخازن وسيارات التوزيع', href: route('admin.warehouses.index'), icon: Warehouse },
        { name: 'المصروفات اليومية', href: route('admin.expenses.index'), icon: Receipt },
        { name: 'فواتير المبيعات', href: route('admin.invoices.index'), icon: FileText },
        { name: 'الورديات ورحلات السيارات', href: route('admin.shifts.index'), icon: Clock },
        { name: 'التقارير والأرباح والخسائر', href: route('admin.reports.index'), icon: BarChart3 },
        { name: 'فريق العمل والموظفين', href: route('admin.staff.index'), icon: Users },
        { name: 'إعدادات المتجر والفواتير', href: route('admin.settings.index'), icon: Settings },
    ];

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)} 
                        className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
                            {tenant?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <span className="font-extrabold text-base text-white">{tenant?.name || 'متجري'}</span>
                            <span className="text-[11px] text-slate-400 block -mt-1 font-mono" dir="ltr">
                                {tenant?.slug}.casher.com
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Direct Launch POS Button */}
                    <a
                        href={route('cashier.pos')}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold transition shadow-sm"
                    >
                        <Scan size={15} />
                        <span>فتح شاشة الكاشير (POS)</span>
                        <ExternalLink size={12} className="opacity-70" />
                    </a>

                    <div className="text-left hidden md:block">
                        <div className="text-xs font-semibold text-white">{auth.user?.name}</div>
                        <div className="text-[11px] text-indigo-400">
                            {auth.user?.role === 'admin' ? 'مدير المتجر' : auth.user?.role}
                        </div>
                    </div>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="تسجيل الخروج"
                    >
                        <LogOut size={16} />
                    </Link>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:static top-14 bottom-0 right-0 z-20 w-64 bg-slate-900 border-l border-slate-800 p-4 transition-transform duration-200 overflow-y-auto
                    ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = window.location.pathname === new URL(item.href, window.location.origin).pathname;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={16} />
                                        <span>{item.name}</span>
                                    </div>
                                    <ChevronLeft size={14} className="opacity-40" />
                                </Link>
                            );
                        })}
                    </div>

                    {/* Quick POS Shortcut in Sidebar */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80">
                        <a
                            href={route('cashier.pos')}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
                        >
                            <Scan size={16} />
                            <span>شاشة الكاشير السريعة</span>
                        </a>
                    </div>
                </aside>

                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div 
                        onClick={() => setSidebarOpen(false)} 
                        className="fixed inset-0 bg-black/60 z-10 lg:hidden"
                    />
                )}

                {/* Main Content Area */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-xs font-semibold">
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-xs font-semibold">
                            <span>{flash.error}</span>
                        </div>
                    )}
                    {flash?.warning && (
                        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-between text-xs font-semibold">
                            <span>{flash.warning}</span>
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
