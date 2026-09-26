import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    Search, 
    Filter, 
    Store, 
    ExternalLink, 
    UserCheck, 
    Power, 
    CheckCircle, 
    AlertCircle,
    Calendar,
    Users
} from 'lucide-react';

export default function Index({ tenants, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('superadmin.tenants.index'), { search, status }, { preserveState: true });
    };

    const handleToggleStatus = (tenantId) => {
        if (confirm('هل أنت متأكد من تغيير حالة هذا المتجر؟')) {
            router.patch(route('superadmin.tenants.toggle-status', tenantId));
        }
    };

    return (
        <SuperAdminLayout title="إدارة المتاجر والشركات">
            <Head title="إدارة المتاجر - السوبر أدمن" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">إدارة المتاجر والعملاء</h1>
                        <p className="text-slate-400 text-sm mt-1">التحكم في المتاجر المشتركة، تفعيل الحسابات، وإدارة الاشتراكات</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-2xl">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-3.5 top-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="البحث باسم المتجر، الرابط، الهاتف، أو البريد..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">جميع الحالات</option>
                            <option value="active">نشط</option>
                            <option value="trial">فترة تجريبية</option>
                            <option value="expired">منتهي الاشتراك</option>
                        </select>

                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                        >
                            تصفية
                        </button>
                    </form>
                </div>

                {/* Tenants Table */}
                <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-850 text-slate-400 text-xs">
                                    <th className="p-4 font-semibold">المتجر</th>
                                    <th className="p-4 font-semibold">المالك وبيانات التواصل</th>
                                    <th className="p-4 font-semibold">الباقة الحالية</th>
                                    <th className="p-4 font-semibold">حالة الاشتراك</th>
                                    <th className="p-4 font-semibold">تاريخ الانتهاء</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/60">
                                {tenants.data.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-750/40 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-white text-base">{t.name}</div>
                                            <div className="text-xs text-indigo-400 font-mono mt-0.5" dir="ltr">
                                                {t.slug}.casher.com
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-200 font-medium">{t.owner?.name || 'غير مسجل'}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{t.owner?.email} • {t.phone}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                                                {t.current_subscription?.plan?.name || 'لا يوجد باقة'}
                                            </span>
                                            {t.current_subscription?.extra_employees_count > 0 && (
                                                <div className="text-[11px] text-slate-400 mt-1">
                                                    +{t.current_subscription.extra_employees_count} موظف إضافي
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {t.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle size={13} />
                                                    <span>نشط ({t.subscription_status})</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                    <AlertCircle size={13} />
                                                    <span>معطل</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-300 text-xs">
                                            {t.subscription_ends_at ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span>{new Date(t.subscription_ends_at).toLocaleDateString('ar-EG')}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">غير محدد</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={route('superadmin.tenants.show', t.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition flex items-center gap-1"
                                                >
                                                    <ExternalLink size={14} />
                                                    <span>تفاصيل</span>
                                                </Link>

                                                <Link
                                                    href={route('superadmin.tenants.impersonate', t.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                                                    title="دخول لحساب المتجر كمدير"
                                                >
                                                    <UserCheck size={14} />
                                                    <span>دخول</span>
                                                </Link>

                                                <button
                                                    onClick={() => handleToggleStatus(t.id)}
                                                    className={`p-1.5 rounded-xl transition ${
                                                        t.is_active 
                                                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white' 
                                                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                                    title={t.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                                >
                                                    <Power size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tenants.links && tenants.links.length > 3 && (
                        <div className="p-4 border-t border-slate-700/60 flex items-center justify-center gap-1">
                            {tenants.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        link.active 
                                            ? 'bg-indigo-600 text-white' 
                                            : link.url 
                                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                                : 'text-slate-500 cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
