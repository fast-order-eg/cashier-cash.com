import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import SubscriptionExpiredModal from '@/Components/SubscriptionExpiredModal';
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
    ChevronDown,
    Truck,
    Clock,
    DollarSign,
    User,
    CreditCard,
    AlertTriangle
} from 'lucide-react';

export default function MerchantLayout({ children, title = 'لوحة التحكم' }) {
    const { auth, tenant, flash, impersonation } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [expiredModalOpen, setExpiredModalOpen] = useState(false);

    // Global interception for add/create actions when subscription is expired
    useEffect(() => {
        if (!tenant?.is_subscription_expired) return;

        const handleInterceptClick = (e) => {
            const target = e.target.closest('a, button');
            if (!target) return;

            const href = target.getAttribute('href') || '';
            // Allow navigating to subscriptions, logout, impersonate, and modal dismiss buttons
            if (
                href.includes('/admin/subscriptions') ||
                href.includes('/logout') ||
                href.includes('/impersonate') ||
                target.closest('#subscription-expired-modal') ||
                target.innerText?.includes('إغلاق') ||
                target.innerText?.includes('تجديد الاشتراك')
            ) {
                return;
            }

            // Check if this click is an addition / creation / action
            const text = (target.innerText || '').trim();
            const isAddOrAction =
                href.endsWith('/create') ||
                href.includes('/create?') ||
                href.includes('/pos') ||
                href.includes('/van-sales') ||
                href.includes('/import') ||
                text.includes('إضافة') ||
                text.includes('فتح الكاشير') ||
                text.includes('صرف بضاعة') ||
                text.includes('تسجيل مصروف') ||
                text.includes('رفع جماعي') ||
                text.includes('استيراد') ||
                target.dataset.action === 'add' ||
                target.classList.contains('require-subscription');

            if (isAddOrAction) {
                e.preventDefault();
                e.stopPropagation();
                setExpiredModalOpen(true);
            }
        };

        document.addEventListener('click', handleInterceptClick, true);
        return () => document.removeEventListener('click', handleInterceptClick, true);
    }, [tenant?.is_subscription_expired]);

    const navItems = [
        { name: 'الرئيسية والإحصائيات', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'الأصناف والمخزون', href: '/admin/products', icon: Package },
        { name: 'أقسام المنتجات', href: '/admin/categories', icon: FolderTree },
        { name: 'المخازن وسيارات التوزيع', href: '/admin/warehouses', icon: Warehouse },
        { name: 'المصروفات اليومية', href: '/admin/expenses', icon: Receipt },
        { name: 'فواتير المبيعات', href: '/admin/invoices', icon: FileText },
        { name: 'ورديات الكاشير', href: '/admin/shifts', icon: Clock },
        { name: 'سيارات المناديب', href: '/admin/van-trips', icon: Truck },
        { name: 'التقارير', href: '/admin/reports', icon: BarChart3 },
        { name: 'فريق العمل', href: '/admin/staff', icon: Users },
        { name: 'الاشتراكات', href: '/admin/subscriptions', icon: CreditCard },
        { name: 'الإعدادات', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Impersonation Banner */}
            {impersonation?.active && (
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-amber-600">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-950 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold shadow-sm">
                            وضع السوبر أدمن
                        </span>
                        <span className="text-slate-900 font-extrabold">
                            أنت الآن تتصفح المتجر منتحلاً هوية: <span className="underline">{impersonation.user_name || 'مدير المتجر'}</span> ({impersonation.user_role === 'cashier' ? 'كاشير' : (impersonation.user_role === 'sales_rep' ? 'مندوب' : 'مدير')})
                        </span>
                    </div>
                    <a 
                        href={impersonation.leave_url || '/admin/impersonate-leave'} 
                        className="bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                        <span>إنهاء المعاينة والعودة للسوبر أدمن</span>
                        <ChevronLeft size={15} />
                    </a>
                </div>
            )}

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
                    {/* User Dropdown Profile & Logout */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-2.5 p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 hover:border-slate-700 transition cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                {auth.user?.name ? auth.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="text-right hidden sm:block">
                                <div className="text-xs font-bold text-white leading-tight">
                                    {auth.user?.name}
                                </div>
                                <div className="text-[11px] text-indigo-400 font-medium">
                                    {auth.user?.role === 'super_admin' ? 'سوبر أدمن المنصة' : (auth.user?.role === 'admin' ? 'مدير المتجر' : (auth.user?.role === 'cashier' ? 'كاشير' : 'مندوب مبيعات'))}
                                </div>
                            </div>
                            <ChevronDown 
                                size={15} 
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
                                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="px-4 py-2.5 border-b border-slate-800">
                                        <div className="text-xs text-slate-400">حساب المتجر</div>
                                        <div className="text-sm font-bold text-white truncate">{auth.user?.name}</div>
                                        <div className="text-xs text-indigo-400 font-mono truncate">{auth.user?.email}</div>
                                    </div>

                                    <div className="p-1 space-y-1">
                                        <Link
                                            href="/profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                                <User size={15} />
                                            </div>
                                            <span className="flex-1 text-right font-medium">الملف الشخصي</span>
                                        </Link>

                                        <div className="border-t border-slate-800 my-1" />

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
                </div>
            </header>

            {/* Trial Notification Banner */}
            {tenant?.subscription_status === 'trial' && !tenant?.is_subscription_expired && (
                <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-b border-indigo-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-inner sticky top-14 z-20">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40 text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            فترة تجريبية مجانية (7 أيام)
                        </span>
                        <span className="text-slate-300">
                            متبقي <b>{tenant.trial_days_remaining ?? 7} أيام</b> • السعة المسموحة: <b>2 موظف فقط</b> • لتفعيل كافة العمليات وسعة أكبر:
                        </span>
                    </div>
                    <Link
                        href="/admin/subscriptions"
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1 active:scale-95"
                    >
                        <span>ترقية واشتراك في باقة الآن</span>
                        <ChevronLeft size={13} />
                    </Link>
                </div>
            )}

            {/* Subscription Expired Sticky Alert Banner - Always Visible at the top of every page */}
            {tenant?.is_subscription_expired && (
                <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/40 px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-xl sticky top-14 z-20 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                            <AlertTriangle size={16} className="text-rose-400 animate-bounce" />
                            <span className="font-extrabold">تنبيه: انتهت فترة اشتراك المتجر!</span>
                        </span>
                        <span className="text-rose-100 font-medium leading-relaxed">
                            انتهت فترة اشتراك متجرك (أو انتهت التجربة المجانية 7 أيام). جميع عمليات البيع وإضافة البيانات معلقة حالياً لحين التجديد.
                        </span>
                    </div>
                    <Link
                        href="/admin/subscriptions"
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/40 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <span>تجديد الاشتراك الآن</span>
                        <ChevronLeft size={15} />
                    </Link>
                </div>
            )}

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:static top-14 bottom-0 right-0 z-20 w-64 bg-slate-900 border-l border-slate-800 p-4 transition-transform duration-200 overflow-y-auto
                    ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    {/* Brand Logo at the top of Sidebar */}
                    <div className="pb-3.5 mb-3 border-b border-slate-800/80 px-1 flex items-center justify-between">
                        <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-90 transition">
                            <ApplicationLogo className="w-8 h-8" withText={true} />
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

            {/* Global Subscription Expired Modal */}
            <SubscriptionExpiredModal
                isOpen={expiredModalOpen}
                onClose={() => setExpiredModalOpen(false)}
            />
        </div>
    );
}
