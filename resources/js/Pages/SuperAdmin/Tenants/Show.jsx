import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    Store, 
    ArrowRight, 
    Users, 
    CreditCard, 
    Package, 
    Truck, 
    UserCheck,
    CheckCircle,
    AlertCircle,
    Calendar,
    Phone,
    Mail,
    MapPin
} from 'lucide-react';

export default function Show({ tenant, plans, stats }) {
    const { data, setData, post, processing, errors } = useForm({
        plan_id: tenant.current_subscription?.plan_id || plans[0]?.id || '',
        months: 1,
        extra_employees: tenant.current_subscription?.extra_employees_count || 0,
    });

    const handleAssignSubscription = (e) => {
        e.preventDefault();
        post(route('superadmin.tenants.assign-subscription', tenant.id));
    };

    return (
        <SuperAdminLayout title={`تفاصيل متجر: ${tenant.name}`}>
            <Head title={`متجر ${tenant.name} - السوبر أدمن`} />

            <div className="space-y-6">
                {/* Back and Title */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('superadmin.tenants.index')}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                            <ArrowRight size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                            <div className="text-xs text-indigo-400 font-mono mt-0.5" dir="ltr">
                                {tenant.slug}.casher.com
                            </div>
                        </div>
                    </div>

                    <Link
                        href={route('superadmin.tenants.impersonate', tenant.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <UserCheck size={16} />
                        <span>دخول للمتجر كمدير</span>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">عدد الأصناف في المتجر</div>
                        <div className="text-2xl font-black text-white mt-2">{stats.products_count} صنف</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">إجمالي فواتير المبيعات</div>
                        <div className="text-2xl font-black text-white mt-2">{stats.invoices_count} فاتورة</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">إجمالي المبيعات المحققة</div>
                        <div className="text-2xl font-black text-emerald-400 mt-2">
                            {Number(stats.total_sales).toLocaleString('en-US')} ج.م
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Store Info & Users */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Details Card */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Store size={18} className="text-indigo-400" />
                                <span>بيانات المتجر والمالك</span>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3">
                                    <Phone size={16} className="text-slate-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">رقم الهاتف</div>
                                        <div className="text-white font-medium">{tenant.phone || 'غير مسجل'}</div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3">
                                    <Mail size={16} className="text-slate-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">البريد الإلكتروني</div>
                                        <div className="text-white font-medium">{tenant.email || 'غير مسجل'}</div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3 sm:col-span-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">العنوان</div>
                                        <div className="text-white font-medium">{tenant.address || 'غير محدد'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staff / Employees */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-indigo-400" />
                                <span>الموظفين المسجلين في المتجر ({tenant.users.length})</span>
                            </h2>

                            <div className="divide-y divide-slate-700/60">
                                {tenant.users.map((u) => (
                                    <div key={u.id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-white text-sm">{u.name}</div>
                                            <div className="text-xs text-slate-400">{u.email} • {u.phone}</div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' :
                                            u.role === 'cashier' ? 'bg-emerald-500/10 text-emerald-400' :
                                            'bg-amber-500/10 text-amber-400'
                                        }`}>
                                            {u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : 'مندوب جملة'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Subscription & Plans Management */}
                    <div className="space-y-6">
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <CreditCard size={18} className="text-indigo-400" />
                                <span>تعديل وتمديد الاشتراك</span>
                            </h2>

                            <form onSubmit={handleAssignSubscription} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">اختر الباقة</label>
                                    <select
                                        value={data.plan_id}
                                        onChange={(e) => setData('plan_id', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    >
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.price_monthly} ج.م - {p.max_employees} موظفين)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">المدة (بالشهور)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="36"
                                        value={data.months}
                                        onChange={(e) => setData('months', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">عدد الموظفين الإضافيين (مقاعد)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.extra_employees}
                                        onChange={(e) => setData('extra_employees', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                                >
                                    {processing ? 'جاري الحفظ...' : 'تحديث وتفعيل الاشتراك'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
