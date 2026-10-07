import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    Store, 
    ArrowRight, 
    Users, 
    CreditCard, 
    Package, 
    Truck, 
    UserCheck,
    Scan,
    CheckCircle, 
    AlertCircle, 
    Calendar, 
    Phone, 
    Mail, 
    MapPin, 
    ChevronDown,
    Copy,
    Check,
    Trash2,
    PauseCircle,
    PlayCircle,
    Plus,
    Minus,
    UserPlus,
    Clock,
    Edit3
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

const formatDateToInput = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

export default function Show({ tenant, plans, stats }) {
    const [copiedKey, setCopiedKey] = useState(null);
    const [seatsProcessing, setSeatsProcessing] = useState(false);

    const initialEndsAt = formatDateToInput(tenant.subscription_ends_at);

    const { data, setData, post, processing, errors } = useForm({
        plan_id: tenant.current_subscription?.plan_id || plans[0]?.id || '',
        ends_at: initialEndsAt,
        months: 1,
        extra_employees: tenant.current_subscription?.extra_employees_count || 0,
    });

    useEffect(() => {
        if (tenant) {
            setData((prev) => ({
                ...prev,
                plan_id: tenant.current_subscription?.plan_id || plans[0]?.id || '',
                ends_at: formatDateToInput(tenant.subscription_ends_at),
                extra_employees: tenant.current_subscription?.extra_employees_count || 0,
            }));
        }
    }, [tenant]);

    const handleAddMonths = (monthsToAdd) => {
        let baseDate = new Date();
        if (data.ends_at) {
            const parsed = new Date(data.ends_at + 'T00:00:00');
            if (!isNaN(parsed.getTime()) && parsed > baseDate) {
                baseDate = parsed;
            }
        }
        const targetDate = new Date(baseDate.getTime());
        targetDate.setMonth(targetDate.getMonth() + monthsToAdd);
        setData('ends_at', formatDateToInput(targetDate));
    };

    const handleAssignSubscription = (e) => {
        e.preventDefault();
        post(`/admin/tenants/${tenant.id}/assign-subscription`);
    };

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleToggleStatus = () => {
        const actionText = tenant.is_active ? 'إيقاف المتجر مؤقتاً ومنع دخول موظفيه' : 'تفعيل وتشغيل المتجر';
        if (confirm(`هل أنت متأكد من ${actionText}؟`)) {
            router.patch(`/admin/tenants/${tenant.id}/toggle-status`, {}, { preserveScroll: true });
        }
    };

    const handleDeleteTenant = () => {
        if (confirm(`هل أنت متأكد تماماً من حذف متجر (${tenant.name})؟\nسيتم نقله لسلة المحذوفات وإنهاء كافة جلسات موظفيه فوراً.`)) {
            router.delete(`/admin/tenants/${tenant.id}`);
        }
    };

    const handleUpdateSeats = (newCount) => {
        if (newCount < 0) return;
        setSeatsProcessing(true);
        router.post(
            `/admin/tenants/${tenant.id}/update-seats`,
            { extra_employees: newCount },
            { 
                preserveScroll: true,
                onFinish: () => setSeatsProcessing(false)
            }
        );
    };

    const remainingDays = tenant.subscription_ends_at 
        ? Math.ceil((new Date(tenant.subscription_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    const isTrial = tenant.subscription_status === 'trial';
    const activePlan = tenant.current_subscription?.plan || plans.find(p => p.id === tenant.current_subscription?.plan_id) || plans[0];
    const basePlanEmployees = isTrial ? 2 : (activePlan?.max_employees || 2);
    const currentExtraEmployees = isTrial ? 0 : (tenant.current_subscription?.extra_employees_count || 0);
    const totalAllowedEmployees = isTrial ? 2 : (basePlanEmployees + currentExtraEmployees);

    return (
        <SuperAdminLayout title={`تفاصيل متجر: ${tenant.name}`}>
            <Head title={`متجر ${tenant.name} - السوبر أدمن`} />

            <div className="space-y-6">
                {/* Back and Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('superadmin.tenants.index')}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                            <ArrowRight size={18} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    tenant.is_active 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                    {tenant.is_active ? 'نشط' : 'متوقف'}
                                </span>
                            </div>
                            <div className="text-xs text-indigo-400 font-mono mt-0.5" dir="ltr">
                                {tenant.slug}.casher.com
                            </div>
                        </div>
                    </div>

                    {/* Actions: Toggle Status & Delete (Buttons hidden as requested) */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* زر إيقاف مؤقت / تفعيل من الداخل */}
                        <button
                            type="button"
                            onClick={handleToggleStatus}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                                tenant.is_active
                                    ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30'
                                    : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30'
                            }`}
                            title={tenant.is_active ? 'إيقاف المتجر مؤقتاً' : 'تفعيل وتشغيل المتجر'}
                        >
                            {tenant.is_active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                            <span>{tenant.is_active ? 'إيقاف مؤقت للمتجر' : 'تفعيل وتشغيل المتجر'}</span>
                        </button>

                        {/* زر حذف المتجر من الداخل */}
                        <button
                            type="button"
                            onClick={handleDeleteTenant}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="حذف المتجر نهائياً"
                        >
                            <Trash2 size={15} />
                            <span>حذف المتجر</span>
                        </button>

                        {/* أزرار المعاينة والدخول - تم إخفاؤها مؤقتاً بناءً على الطلب مع الحفاظ على كودها للتشغيل لاحقاً */}
                        {/* 
                        <a
                            href={route('superadmin.tenants.impersonate', { tenant: tenant.id, role: 'admin' })}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                            title="دخول لوحة تحكم المتجر كمدير"
                        >
                            <UserCheck size={16} />
                            <span>دخول لوحة الإدارة</span>
                        </a>

                        <a
                            href={route('superadmin.tenants.impersonate', { tenant: tenant.id, role: 'cashier' })}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                            title="معاينة واجهة الكاشير ونقطة البيع"
                        >
                            <Scan size={16} />
                            <span>معاينة الكاشير (POS)</span>
                        </a>

                        <a
                            href={route('superadmin.tenants.impersonate', { tenant: tenant.id, role: 'sales_rep' })}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all active:scale-95"
                            title="معاينة واجهة مندوب التوزيع وسيارات الجملة"
                        >
                            <Truck size={16} />
                            <span>معاينة المندوب</span>
                        </a>
                        */}
                    </div>
                </div>

                {/* Subscription Expiry & Status Highlight Card (تاريخ انتهاء الاشتراك واضح وبارز) */}
                <div className="bg-gradient-to-r from-slate-850 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                            !tenant.is_active ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            (remainingDays !== null && remainingDays < 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            (remainingDays !== null && remainingDays <= 7 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'))
                        }`}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium">تاريخ انتهاء الاشتراك وحالة الصلاحية</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-lg font-black text-white font-mono" dir="ltr">
                                    {tenant.subscription_ends_at ? formatDate(tenant.subscription_ends_at) : 'فترة تجريبية / غير محدد'}
                                </span>
                                {remainingDays !== null && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                        remainingDays < 0 ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                                        (remainingDays <= 7 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30')
                                    }`}>
                                        {remainingDays < 0 ? `منتهي منذ ${Math.abs(remainingDays)} يوم` : (remainingDays === 0 ? 'ينتهي اليوم' : `متبقي ${remainingDays} يوم`)}
                                    </span>
                                )}
                                <span className="text-xs text-slate-400 font-medium">
                                    (حالة الاشتراك: <strong className="text-indigo-400">{tenant.subscription_status}</strong>)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                        <div>
                            <span className="text-slate-400 block text-[11px]">الباقة الحالية:</span>
                            <span className="font-bold text-indigo-400 text-sm">
                                {activePlan?.name || tenant.current_subscription?.plan?.name || 'الباقة الأساسية'}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                            <span className="text-slate-400 block text-[11px]">سعة الموظفين المسموحة:</span>
                            <span className="font-bold text-white text-sm">
                                {tenant.users?.length || 0} / {totalAllowedEmployees} موظف
                            </span>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <a
                            href="#subscription-card"
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-1 transition"
                            title="الانتقال لتعديل الباقة والتاريخ"
                        >
                            <Calendar size={13} />
                            <span>تعديل</span>
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">عدد الأصناف في المتجر</div>
                        <div className="text-2xl font-black text-white mt-2">{formatNumber(stats.products_count)} صنف</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">إجمالي فواتير المبيعات</div>
                        <div className="text-2xl font-black text-white mt-2">{formatNumber(stats.invoices_count)} فاتورة</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl">
                        <div className="text-slate-400 text-xs font-medium">إجمالي المبيعات المحققة</div>
                        <div className="text-2xl font-black text-emerald-400 mt-2">
                            {formatCurrency(stats.total_sales)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Store Info & Users */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Details Card With Copy Buttons */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Store size={18} className="text-indigo-400" />
                                <span>بيانات المتجر والمالك</span>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {/* Phone with Copy Button */}
                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Phone size={16} className="text-slate-400" />
                                        <div>
                                            <div className="text-xs text-slate-400">رقم الهاتف</div>
                                            <div className="text-white font-medium" dir="ltr">{tenant.phone || 'غير مسجل'}</div>
                                        </div>
                                    </div>
                                    {tenant.phone && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(tenant.phone, 'tenant-phone')}
                                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs cursor-pointer"
                                            title="نسخ رقم الهاتف"
                                        >
                                            {copiedKey === 'tenant-phone' ? (
                                                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                                    <Check size={13} /> تم النسخ
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Copy size={13} /> نسخ
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Email with Copy Button */}
                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 truncate">
                                        <Mail size={16} className="text-slate-400 flex-shrink-0" />
                                        <div className="truncate">
                                            <div className="text-xs text-slate-400">البريد الإلكتروني</div>
                                            <div className="text-white font-medium truncate">{tenant.email || 'غير مسجل'}</div>
                                        </div>
                                    </div>
                                    {tenant.email && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(tenant.email, 'tenant-email')}
                                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs flex-shrink-0 cursor-pointer"
                                            title="نسخ البريد الإلكتروني"
                                        >
                                            {copiedKey === 'tenant-email' ? (
                                                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                                    <Check size={13} /> تم النسخ
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Copy size={13} /> نسخ
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-3 sm:col-span-2">
                                    <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-slate-400">العنوان</div>
                                        <div className="text-white font-medium">{tenant.address || 'غير محدد'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staff / Employees */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users size={18} className="text-indigo-400" />
                                    <span>الموظفين المسجلين في المتجر ({formatNumber(tenant.users?.length || 0)})</span>
                                </h2>
                                <span className="text-xs text-slate-400">
                                    المسموح: <strong className="text-emerald-400">{totalAllowedEmployees}</strong> موظف
                                </span>
                            </div>

                            <div className="divide-y divide-slate-700/60">
                                {tenant.users?.map((u) => (
                                    <div key={u.id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-white text-sm">{u.name}</div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                <span>{u.email}</span>
                                                {u.phone && <span>• {u.phone}</span>}
                                            </div>
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

                    {/* Subscription & Plans Management & Quick Seats */}
                    <div className="space-y-6">
                        {/* كارت إضافة مقاعد موظفين سريعة (+1 موظف إضافي) */}
                        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <UserPlus size={18} className="text-emerald-400" />
                                    <span>إضافة مقاعد موظفين سريعة</span>
                                </h2>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono">
                                    +{currentExtraEmployees} إضافي
                                </span>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                                الباقة الأساسية تشمل <strong className="text-slate-200">{basePlanEmployees} موظفين</strong>. 
                                يمكنك زيادة مقاعد الموظفين لهذا المتجر بنقرة واحدة دون الحاجة لتغيير مدة الاشتراك:
                            </p>

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateSeats(currentExtraEmployees + 1)}
                                    disabled={seatsProcessing}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                    <span>+1 إضافة موظف زيادة</span>
                                </button>

                                {currentExtraEmployees > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateSeats(currentExtraEmployees - 1)}
                                        disabled={seatsProcessing}
                                        className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                        title="إنقاص مقعد إضافي"
                                    >
                                        <Minus size={15} />
                                        <span>-1</span>
                                    </button>
                                )}
                            </div>

                            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                                الإجمالي المسموح للمتجر حالياً: <strong className="text-white">{totalAllowedEmployees} موظف</strong> (مسجل منهم: {tenant.users?.length || 0})
                            </div>
                        </div>

                        {/* كارت تعديل وتمديد الاشتراك بالكامل */}
                        <div id="subscription-card" className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <CreditCard size={18} className="text-indigo-400" />
                                    <span>تعديل وتمديد الاشتراك</span>
                                </h2>
                                <span className="text-xs text-indigo-400 font-medium">تحكم بالباقة والتاريخ</span>
                            </div>

                            <form onSubmit={handleAssignSubscription} className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">اختر الباقة</label>
                                    <div className="relative">
                                        <select
                                            value={data.plan_id}
                                            onChange={(e) => setData('plan_id', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {plans.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({formatNumber(p.price_monthly)} ج.م - {formatNumber(p.max_employees)} موظفين)
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {errors.plan_id && <div className="text-rose-400 text-xs mt-1">{errors.plan_id}</div>}
                                </div>

                                {/* تاريخ انتهاء الاشتراك مع التحكم المباشر وأزرار التمديد السريع */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-slate-300">
                                            تاريخ انتهاء الاشتراك المحدد
                                        </label>
                                        <span className="text-[11px] text-slate-400">حدد التاريخ مباشرة</span>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={data.ends_at}
                                            onChange={(e) => setData('ends_at', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                                            dir="ltr"
                                        />
                                    </div>
                                    {errors.ends_at && <div className="text-rose-400 text-xs mt-1">{errors.ends_at}</div>}

                                    {data.ends_at && (
                                        <div className="text-[11px] text-indigo-300 mt-1.5 flex items-center justify-between px-1">
                                            <span>التاريخ: <strong>{formatDate(data.ends_at)}</strong></span>
                                            <span className="text-slate-400">
                                                {Math.ceil((new Date(data.ends_at + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24)) > 0
                                                    ? `(متبقي ${Math.ceil((new Date(data.ends_at + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))} يوم)`
                                                    : '(منتهي)'}
                                            </span>
                                        </div>
                                    )}

                                    {/* أزرار التمديد السريع بالشهور */}
                                    <div className="mt-2.5">
                                        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">تمديد سريع يضاف للتاريخ:</span>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleAddMonths(1)}
                                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs text-slate-200 hover:text-white transition font-medium cursor-pointer text-center"
                                                title="إضافة شهر واحد"
                                            >
                                                + شهر
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAddMonths(3)}
                                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs text-slate-200 hover:text-white transition font-medium cursor-pointer text-center"
                                                title="إضافة 3 شهور"
                                            >
                                                + 3 شهور
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAddMonths(6)}
                                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs text-slate-200 hover:text-white transition font-medium cursor-pointer text-center"
                                                title="إضافة 6 شهور"
                                            >
                                                + 6 شهور
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAddMonths(12)}
                                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-700 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-xs transition font-medium cursor-pointer text-center"
                                                title="إضافة سنة كاملة"
                                            >
                                                + سنة
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-slate-300">
                                            عدد الموظفين الإضافيين (مقاعد)
                                        </label>
                                        <span className="text-[11px] text-indigo-400">زيادة سعة المحل</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.extra_employees}
                                        onChange={(e) => setData('extra_employees', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                                    />
                                    {errors.extra_employees && <div className="text-rose-400 text-xs mt-1">{errors.extra_employees}</div>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                                >
                                    {processing ? 'جاري الحفظ...' : 'حفظ وتحديث الاشتراك والتاريخ'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
