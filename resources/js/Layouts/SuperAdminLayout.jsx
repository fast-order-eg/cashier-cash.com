import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, 
    Store, 
    CreditCard, 
    LogOut, 
    Menu, 
    X, 
    ShieldCheck, 
    ChevronLeft,
    DollarSign,
    Users
} from 'lucide-react';

export default function SuperAdminLayout({ children, title = 'لوحة تحكم المنصة' }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { name: 'الرئيسية والإحصائيات', href: route('superadmin.dashboard'), icon: LayoutDashboard },
        { name: 'إدارة المتاجر والعملاء', href: route('superadmin.tenants.index'), icon: Store },
        { name: 'باقات الاشتراك والأسعار', href: route('superadmin.plans.index'), icon: CreditCard },
    ];

    return (
        <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)} 
                        className="lg:hidden p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
                            C
                        </div>
                        <div>
                            <span className="font-extrabold text-lg tracking-wide text-white">Casher</span>
                            <span className="text-xs px-2 py-0.5 mr-2 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium">سوبر أدمن</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-left hidden sm:block">
                        <div className="text-sm font-semibold text-white">{auth.user?.name}</div>
                        <div className="text-xs text-slate-400">{auth.user?.email}</div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition text-xs font-semibold"
                    >
                        <LogOut size={16} />
                        <span>خروج</span>
                    </Link>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:static top-14 bottom-0 right-0 z-20 w-64 bg-slate-800/95 lg:bg-slate-800 border-l border-slate-700 p-4 transition-transform duration-200
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
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                            : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={18} />
                                        <span>{item.name}</span>
                                    </div>
                                    <ChevronLeft size={16} className="opacity-40" />
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700/60 px-3">
                        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40 text-xs text-slate-400 space-y-1">
                            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                                <ShieldCheck size={16} />
                                <span>حماية النظام</span>
                            </div>
                            <p>جميع العمليات الإدارية وتغييرات الاشتراكات مسجلة ومؤمنة.</p>
                        </div>
                    </div>
                </aside>

                {/* Overlay for mobile sidebar */}
                {sidebarOpen && (
                    <div 
                        onClick={() => setSidebarOpen(false)} 
                        className="fixed inset-0 bg-black/60 z-10 lg:hidden"
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-sm">
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-sm">
                            <span>{flash.error}</span>
                        </div>
                    )}
                    {flash?.info && (
                        <div className="mb-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-between text-sm">
                            <span>{flash.info}</span>
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
