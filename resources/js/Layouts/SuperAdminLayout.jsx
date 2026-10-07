import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { 
    LayoutDashboard, 
    Store, 
    CreditCard, 
    LogOut, 
    Menu, 
    X, 
    ShieldCheck, 
    ChevronLeft,
    ChevronDown,
    DollarSign,
    Users,
    User,
    Settings
} from 'lucide-react';

export default function SuperAdminLayout({ children, title = 'لوحة تحكم المنصة' }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const navItems = [
        { name: 'الرئيسية والإحصائيات', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'إدارة المتاجر والعملاء', href: '/admin/tenants', icon: Store },
        { name: 'باقات الاشتراك والأسعار', href: '/admin/plans', icon: CreditCard },
        { name: 'إعدادات بوابات الدفع', href: '/admin/payment-settings', icon: Settings },
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
                    <Link href="/admin/dashboard" className="flex items-center gap-3 group">
                        <div className="p-1 rounded-xl bg-slate-900/80 border border-indigo-500/30 shadow-md shadow-indigo-600/10 group-hover:scale-105 transition">
                            <ApplicationLogo className="w-9 h-9" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg tracking-wide text-white">Casher</span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">سوبر أدمن</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* User Dropdown Profile & Logout */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-3 p-1.5 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 transition cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            {auth.user?.name ? auth.user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-white leading-tight">
                                {auth.user?.name || 'سوبر أدمن المنصة'}
                            </div>
                        </div>
                        <ChevronDown 
                            size={16} 
                            className={`text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} 
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setUserMenuOpen(false)} 
                            />
                            <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="px-4 py-2.5 border-b border-slate-700/70">
                                    <div className="text-xs text-slate-400">مسجل الدخول كـ</div>
                                    <div className="text-sm font-bold text-white truncate">{auth.user?.name}</div>
                                    <div className="text-xs text-indigo-400 font-mono truncate">{auth.user?.email}</div>
                                </div>

                                <div className="p-1 space-y-1">
                                    <Link
                                        href="/profile"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-700/70 hover:text-white transition"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                            <User size={15} />
                                        </div>
                                        <span className="flex-1 text-right font-medium">الملف الشخصي</span>
                                    </Link>

                                    <div className="border-t border-slate-700/60 my-1" />

                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-right"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                                            <LogOut size={15} />
                                        </div>
                                        <span className="flex-1 text-right font-medium">تسجيل الخروج</span>
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:static top-14 bottom-0 right-0 z-20 w-68 bg-slate-800/95 lg:bg-slate-800 border-l border-slate-700 p-4 transition-transform duration-200 overflow-y-auto
                    ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    {/* اللوجو في المنيو بشكل كبير وواضح وجميل */}
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-indigo-950/70 via-slate-900/90 to-slate-850/60 border border-indigo-500/25 shadow-xl shadow-indigo-950/40 text-center relative overflow-hidden group">
                        {/* إضاءة خلفية ناعمة وديكورية */}
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

                        <Link href="/admin/dashboard" className="flex flex-col items-center gap-3 relative z-10">
                            <div className="p-3 rounded-2xl bg-slate-900/90 border border-indigo-500/35 shadow-xl shadow-indigo-600/25 group-hover:scale-105 group-hover:border-indigo-400 transition-all duration-300">
                                <ApplicationLogo className="w-16 h-16" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-black text-2xl text-white tracking-tight">
                                        Casher <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">ERP</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                                        <ShieldCheck size={13} className="text-indigo-400" />
                                        <span>لوحة تحكم المنصة</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>

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
