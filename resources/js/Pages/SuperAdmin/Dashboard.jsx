import React from 'react';
import { Head, Link } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    Store, 
    Users, 
    DollarSign, 
    FileText, 
    ArrowUpRight, 
    ExternalLink,
    CheckCircle,
    Clock,
    AlertCircle,
    UserCheck
} from 'lucide-react';

export default function Dashboard({ stats, recent_tenants, recent_transactions, plans_summary }) {
    return (
        <SuperAdminLayout title="لوحة السوبر أدمن">
            <Head title="لوحة التحكم - السوبر أدمن" />

            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">نظرة عامة على المنصة</h1>
                    <p className="text-slate-400 text-sm mt-1">متابعة الاشتراكات والمتاجر والإيرادات ومبيعات الكاشير</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">إجمالي المتاجر</span>
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Store size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{stats.total_tenants}</span>
                            <span className="text-xs text-emerald-400 font-medium">{stats.active_tenants} نشط</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">المتاجر في فترة التجربة</span>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <Clock size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{stats.trial_tenants}</span>
                            <span className="text-xs text-amber-400 font-medium">تجربة مجانية</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">إيرادات الاشتراكات (Kashier)</span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{Number(stats.total_revenue).toLocaleString('en-US')}</span>
                            <span className="text-xs text-slate-400 font-medium">ج.م</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">إجمالي فواتير الكاشير المنفذة</span>
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{Number(stats.total_invoices_count).toLocaleString('en-US')}</span>
                            <span className="text-xs text-sky-400 font-medium">فاتورة</span>
                        </div>
                    </div>
                </div>

                {/* Plans Overview & Quick Add */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">أحدث المتاجر المشتركة</h2>
                            <Link href={route('superadmin.tenants.index')} className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1">
                                <span>عرض كل المتاجر</span>
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                                        <th className="pb-3 font-semibold">المتجر</th>
                                        <th className="pb-3 font-semibold">المالك</th>
                                        <th className="pb-3 font-semibold">الباقة الحالية</th>
                                        <th className="pb-3 font-semibold">الحالة</th>
                                        <th className="pb-3 font-semibold text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/60">
                                    {recent_tenants.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-750/50 transition">
                                            <td className="py-3.5">
                                                <div className="font-semibold text-white">{t.name}</div>
                                                <div className="text-xs text-indigo-400 font-mono" dir="ltr">
                                                    {t.slug}.casher.com
                                                </div>
                                            </td>
                                            <td className="py-3.5">
                                                <div className="text-slate-300">{t.owner?.name || 'غير محدد'}</div>
                                                <div className="text-xs text-slate-400">{t.owner?.phone}</div>
                                            </td>
                                            <td className="py-3.5">
                                                <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-200 text-xs font-medium">
                                                    {t.current_subscription?.plan?.name || 'بدون باقة'}
                                                </span>
                                            </td>
                                            <td className="py-3.5">
                                                {t.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle size={12} />
                                                        <span>نشط</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                        <AlertCircle size={12} />
                                                        <span>معطل</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={route('superadmin.tenants.show', t.id)}
                                                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
                                                        title="تفاصيل المتجر"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>
                                                    <Link
                                                        href={route('superadmin.tenants.impersonate', t.id)}
                                                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition"
                                                        title="تسجيل دخول كمدير المتجر"
                                                    >
                                                        <UserCheck size={15} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Plans Distribution */}
                    <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">توزيع الباقات</h2>
                            <Link href={route('superadmin.plans.index')} className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold">
                                تعديل الأسعار
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {plans_summary.map((plan) => (
                                <div key={plan.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-white text-sm">{plan.name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {Number(plan.price_monthly)} ج.م/شهرياً • {plan.max_employees} موظفين أساسي
                                        </div>
                                        <div className="text-xs text-indigo-400 mt-0.5">
                                            +{plan.extra_employee_price} ج.م لكل موظف زيادة
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-indigo-400">{plan.subscriptions_count}</div>
                                        <div className="text-[11px] text-slate-400">مشترك</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
