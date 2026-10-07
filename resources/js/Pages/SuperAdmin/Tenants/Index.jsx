import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    Search, 
    Filter, 
    Store, 
    ExternalLink, 
    UserCheck, 
    Scan,
    Truck,
    Power, 
    CheckCircle, 
    AlertCircle,
    Calendar,
    Users,
    ChevronDown,
    Copy,
    Check
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ tenants, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('superadmin.tenants.index'), { search, status }, { preserveState: true });
    };

    const handleToggleStatus = (tenantId) => {
        if (confirm('هل أنت متأكد من تغيير حالة هذا المتجر؟')) {
            router.patch(`/admin/tenants/${tenantId}/toggle-status`);
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

                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500"
                                style={{ backgroundImage: 'none' }}
                            >
                                <option value="">جميع الحالات</option>
                                <option value="active">نشط</option>
                                <option value="trial">فترة تجريبية</option>
                                <option value="expired">منتهي الاشتراك</option>
                            </select>
                            <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

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
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
                                                {t.phone && (
                                                    <div className="inline-flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/70">
                                                        <span dir="ltr">{t.phone}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(t.phone, `phone-${t.id}`)}
                                                            className="text-slate-400 hover:text-white transition p-0.5"
                                                            title="نسخ رقم الهاتف"
                                                        >
                                                            {copiedKey === `phone-${t.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                )}
                                                {t.owner?.email && (
                                                    <div className="inline-flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/70">
                                                        <span>{t.owner.email}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(t.owner.email, `email-${t.id}`)}
                                                            className="text-slate-400 hover:text-white transition p-0.5"
                                                            title="نسخ البريد الإلكتروني"
                                                        >
                                                            {copiedKey === `email-${t.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
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
                                        <td className="p-4">
                                            {t.subscription_ends_at ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-white font-mono text-xs">
                                                        <Calendar size={13} className="text-indigo-400" />
                                                        <span>{formatDate(t.subscription_ends_at)}</span>
                                                    </div>
                                                    {(() => {
                                                        const diff = Math.ceil((new Date(t.subscription_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
                                                        if (diff < 0) {
                                                            return (
                                                                <span className="inline-block text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                                                    منتهي منذ {Math.abs(diff)} يوم
                                                                </span>
                                                            );
                                                        }
                                                        if (diff <= 7) {
                                                            return (
                                                                <span className="inline-block text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                                    متبقي {diff} أيام
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="inline-block text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                                متبقي {diff} يوم
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-xs">غير محدد</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                href={`/admin/tenants/${t.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-bold transition shadow-sm"
                                                title="عرض تفاصيل المتجر والاشتراك"
                                            >
                                                <ExternalLink size={13} />
                                                <span>تفاصيل</span>
                                            </Link>
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
