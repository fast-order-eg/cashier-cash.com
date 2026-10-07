import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    CreditCard, 
    Calendar, 
    Clock, 
    Users, 
    Check, 
    Sparkles, 
    AlertTriangle, 
    ArrowUpRight, 
    ShieldCheck, 
    X, 
    Plus, 
    RefreshCw,
    CheckCircle2,
    Zap,
    TrendingUp
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/utils/formatters';

export default function Index({ currentSubscription, currentPlan, plans = [], stats, history = [] }) {
    // Modals
    const [renewModalOpen, setRenewModalOpen] = useState(false);
    const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
    const [upgradePlanModal, setUpgradePlanModal] = useState(null);

    // Form: Renew Subscription
    const { 
        data: renewData, 
        setData: setRenewData, 
        post: postRenew, 
        processing: processingRenew, 
        errors: renewErrors 
    } = useForm({
        months: 1,
    });

    // Form: Add Staff
    const { 
        data: staffData, 
        setData: setStaffData, 
        post: postStaff, 
        processing: processingStaff, 
        errors: staffErrors 
    } = useForm({
        extra_count: 1,
    });

    // Form: Change Plan
    const { 
        data: planData, 
        setData: setPlanData, 
        post: postChangePlan, 
        processing: processingChangePlan 
    } = useForm({
        plan_id: null,
        billing_cycle: 'monthly',
    });

    const handleRenewSubmit = (e) => {
        e.preventDefault();
        postRenew('/admin/subscriptions/renew', {
            onSuccess: () => setRenewModalOpen(false),
        });
    };

    const handleAddStaffSubmit = (e) => {
        e.preventDefault();
        postStaff('/admin/subscriptions/add-staff', {
            onSuccess: () => setAddStaffModalOpen(false),
        });
    };

    const handleOpenUpgradeModal = (plan) => {
        setUpgradePlanModal(plan);
        setPlanData({
            plan_id: plan.id,
            billing_cycle: 'monthly',
        });
    };

    const handleUpgradeSubmit = (e) => {
        e.preventDefault();
        postChangePlan('/admin/subscriptions/change-plan', {
            onSuccess: () => setUpgradePlanModal(null),
        });
    };

    // Calculate Renew Estimated Cost
    const getRenewCost = (months) => {
        if (!currentPlan) return 0;
        const extraCost = (stats.extra_employees || 0) * (currentPlan.extra_employee_price || 0);
        if (months === 12 && currentPlan.price_yearly > 0) {
            return Number(currentPlan.price_yearly) + (extraCost * 12);
        }
        return (Number(currentPlan.price_monthly) + extraCost) * months;
    };

    return (
        <MerchantLayout title="الاشتراكات والباقات">
            <Head title="الاشتراكات والباقات" />

            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <CreditCard className="w-7 h-7 text-indigo-400" />
                            <span>باقات واشتراكات المتجر</span>
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة تفاصيل باقتك الحالية، موعد التجديد، وإضافة موظفين جدد لسعة النظام
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setRenewModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                        >
                            <RefreshCw size={15} />
                            <span>تجديد / تمديد الاشتراك</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAddStaffModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center gap-2"
                        >
                            <Plus size={15} />
                            <span>إضافة مقاعد موظفين</span>
                        </button>
                    </div>
                </div>

                {/* Expiration or Trial Alert */}
                {stats.is_expired ? (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-rose-400 shrink-0" />
                            <div>
                                <span className="font-bold text-white text-sm block">
                                    {stats.status === 'trial' ? 'انتهت الفترة التجريبية المجانية (7 أيام)!' : 'اشتراك المتجر منتهي الصلاحية!'}
                                </span>
                                <span className="text-slate-300 text-xs mt-0.5 block">
                                    {stats.status === 'trial' 
                                        ? `انتهت فترة التجربة المجانية بتاريخ ${formatDate(stats.ends_at)}. يرجى الاشتراك في إحدى الباقات لتفعيل كافة العمليات ونقاط البيع واستمرار العمل.`
                                        : `انتهى اشتراكك بتاريخ ${formatDate(stats.ends_at)}. يرجى التجديد لاستمرار عمل النظام ونقاط البيع بدون انقطاع.`}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const plansSection = document.getElementById('plans-section');
                                if (plansSection) plansSection.scrollIntoView({ behavior: 'smooth' });
                                else setRenewModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shrink-0 shadow-md shadow-rose-600/30"
                        >
                            الاشتراك في باقة الآن
                        </button>
                    </div>
                ) : stats.status === 'trial' ? (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-amber-400 shrink-0" />
                            <div>
                                <span className="font-bold text-white text-sm block">
                                    فترة تجريبية مجانية (متبقي {stats.days_remaining} أيام - بحد أقصى 2 موظف)
                                </span>
                                <span className="text-slate-300 text-xs mt-0.5 block">
                                    أنت تستخدم المتجر حالياً في فترة التجربة المجانية المحددة بـ 2 موظف. للاستمرار بعد انتهاء الأسبوع ولتفعيل كافة العمليات بدون قيود، اختر باقتك المفضلة واشترك الآن.
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const plansSection = document.getElementById('plans-section');
                                if (plansSection) plansSection.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shrink-0 shadow-md shadow-indigo-600/30"
                        >
                            ترقية واشتراك في باقة
                        </button>
                    </div>
                ) : stats.days_remaining <= 7 ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <Clock size={20} className="text-amber-400 shrink-0" />
                            <div>
                                <span className="font-bold text-white text-sm block">الاشتراك يقترب من الانتهاء</span>
                                <span className="text-slate-300 text-xs mt-0.5 block">
                                    متبقي {stats.days_remaining} أيام فقط على انتهاء فترة الاشتراك الحالية (ينتهي في {formatDate(stats.ends_at)}).
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setRenewModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shrink-0"
                        >
                            تجديد مبكر
                        </button>
                    </div>
                ) : null}

                {/* 3 Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Current Plan Details */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">الباقة الحالية للمتجر</span>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {stats.status === 'active' ? 'نشط' : (stats.status === 'trial' ? 'فترة تجريبية' : 'غير نشط')}
                            </span>
                        </div>
                        <div className="mt-3">
                            <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                <span>{currentPlan?.name || 'الباقة الأساسية'}</span>
                            </h2>
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                                {currentPlan?.description || 'نظام كاشير وإدارة متكامل'}
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400">سعر الباقة الأساسي:</span>
                            <span className="font-bold text-white font-mono">
                                {formatCurrency(currentPlan?.price_monthly || 0)} / شهرياً
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Subscription Expiration & Remaining Days */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-semibold">تاريخ انتهاء الاشتراك</span>
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl font-black text-white font-mono">
                                    {stats.ends_at ? formatDate(stats.ends_at) : 'غير محدد'}
                                </div>
                                <div className="text-xs text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                                    <Clock size={13} />
                                    <span>متبقي: {formatNumber(stats.days_remaining)} يوم</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setRenewModalOpen(true)}
                                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                <RefreshCw size={13} />
                                <span>تجديد أو إضافة مدة للباقتك</span>
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Employees Capacity & Seats */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-semibold">سعة الموظفين المشولة</span>
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                                    <Users size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white font-mono">
                                        {formatNumber(stats.current_employees_count)}
                                    </span>
                                    <span className="text-slate-400 text-xs font-semibold">
                                        من أصل {formatNumber(stats.max_allowed_employees)} موظف متاح
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                    <span>أساسي: {stats.base_employees}</span>
                                    <span>•</span>
                                    <span className="text-cyan-400 font-semibold">إضافي: +{stats.extra_employees}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setAddStaffModalOpen(true)}
                                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                <Plus size={13} />
                                <span>شراء مقاعد موظفين (+{formatNumber(stats.extra_employee_price)} ج.م/شهرياً)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Available Plans Section */}
                <div id="plans-section" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <span>باقات المنصة المتاحة والترقية</span>
                            </h2>
                            <p className="text-slate-400 text-xs mt-0.5">
                                يمكنك الترقية إلى باقة أعلى في أي وقت للاستفادة من مميزات متقدمة وسعة موظفين أكبر
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = currentPlan?.id === plan.id;

                            return (
                                <div 
                                    key={plan.id}
                                    className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                                        isCurrent 
                                            ? 'bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                                            : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
                                            <CheckCircle2 size={13} />
                                            <span>باقتك الحالية</span>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-xl font-black text-white mt-1">{plan.name}</h3>
                                        <p className="text-slate-400 text-xs mt-2 leading-relaxed min-h-[36px]">
                                            {plan.description}
                                        </p>

                                        {/* Pricing */}
                                        <div className="my-5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white font-mono">
                                                    {formatNumber(plan.price_monthly)}
                                                </span>
                                                <span className="text-xs text-slate-400">ج.م / شهرياً</span>
                                            </div>
                                            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                                                أو {formatNumber(plan.price_yearly)} ج.م / سنوياً (خصم شهرين مجاناً)
                                            </div>
                                        </div>

                                        {/* Plan Specs */}
                                        <div className="space-y-2.5 text-xs">
                                            <div className="flex items-center gap-2 text-slate-300 font-medium">
                                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span>تشمل حتى <b>{plan.max_employees} موظفين</b> (كاشير/مناديب/إدارة)</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300 font-medium">
                                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span>الموظف الإضافي بسعر <b>{formatNumber(plan.extra_employee_price)} ج.م</b> / شهرياً</span>
                                            </div>

                                            {plan.features && Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-slate-300">
                                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="mt-6 pt-4 border-t border-slate-800">
                                        {isCurrent ? (
                                            <button
                                                type="button"
                                                onClick={() => setRenewModalOpen(true)}
                                                className="w-full py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
                                            >
                                                <RefreshCw size={14} />
                                                <span>تجديد نفس الباقة</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenUpgradeModal(plan)}
                                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                                            >
                                                <Zap size={14} />
                                                <span>اختيار والترقية لهذه الباقة</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Subscriptions History Table */}
                {history && history.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-base font-black text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <span>سجل الاشتراكات والفواتير السابقة</span>
                        </h2>

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                            <th className="p-4 font-semibold">الباقة</th>
                                            <th className="p-4 font-semibold">دورة الفوترة</th>
                                            <th className="p-4 font-semibold">تاريخ البدء</th>
                                            <th className="p-4 font-semibold">تاريخ الانتهاء</th>
                                            <th className="p-4 font-semibold">موظفون إضافيون</th>
                                            <th className="p-4 font-semibold">المبلغ الإجمالي</th>
                                            <th className="p-4 font-semibold text-center">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850">
                                        {history.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-slate-850/40 transition">
                                                <td className="p-4 font-bold text-white">
                                                    {sub.plan?.name || 'الباقة الأساسية'}
                                                </td>
                                                <td className="p-4 text-slate-300">
                                                    {sub.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}
                                                </td>
                                                <td className="p-4 font-mono text-slate-300">
                                                    {sub.starts_at ? formatDate(sub.starts_at) : '-'}
                                                </td>
                                                <td className="p-4 font-mono text-slate-300">
                                                    {sub.ends_at ? formatDate(sub.ends_at) : '-'}
                                                </td>
                                                <td className="p-4 font-mono text-slate-300">
                                                    {sub.extra_employees_count > 0 ? `+${sub.extra_employees_count} موظف` : '-'}
                                                </td>
                                                <td className="p-4 font-mono font-bold text-emerald-400">
                                                    {formatCurrency(sub.total_price)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {sub.status === 'active' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            ساري حالياً
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                            سابق
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Renew Subscription */}
            {renewModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <RefreshCw size={18} className="text-indigo-400" />
                                <span>تجديد / تمديد اشتراك المتجر</span>
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setRenewModalOpen(false)} 
                                className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRenewSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    اختر مدة التجديد:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { months: 1, label: 'شهر واحد', desc: 'تجديد شهري' },
                                        { months: 3, label: '3 شهور', desc: 'ربع سنوي' },
                                        { months: 6, label: '6 شهور', desc: 'نصف سنوي' },
                                        { months: 12, label: 'سنة كاملة', desc: 'خصم شهرين مجاناً' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.months}
                                            type="button"
                                            onClick={() => setRenewData('months', opt.months)}
                                            className={`p-3.5 rounded-2xl border text-right transition ${
                                                renewData.months === opt.months 
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="font-bold text-sm">{opt.label}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                                            <div className="text-xs font-mono font-bold text-emerald-400 mt-2">
                                                {formatCurrency(getRenewCost(opt.months))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>الباقة:</span>
                                    <span className="font-bold text-white">{currentPlan?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>المقاعد الإضافية الحالية:</span>
                                    <span className="font-bold text-white">+{stats.extra_employees} موظف</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                                    <span className="font-bold text-slate-200">إجمالي مبلغ التجديد:</span>
                                    <span className="font-black text-emerald-400 font-mono text-base">
                                        {formatCurrency(getRenewCost(renewData.months))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRenewModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingRenew}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <span>{processingRenew ? 'جاري التحويل...' : 'متابعة الدفع والتجديد'}</span>
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Extra Staff Seats */}
            {addStaffModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Users size={18} className="text-cyan-400" />
                                <span>شراء مقاعد موظفين إضافية</span>
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setAddStaffModalOpen(false)} 
                                className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {stats.status === 'trial' ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                        <AlertTriangle size={16} className="text-amber-400" />
                                        <span>غير متاح أثناء الفترة التجريبية</span>
                                    </div>
                                    <p className="leading-relaxed text-slate-300">
                                        أنت تستخدم المتجر حالياً في فترة التجربة المجانية (الحد الأقصى للتجربة هو 2 موظف). لإضافة موظفين أكثر وشراء مقاعد إضافية وتفعيل كافة مميزات المتجر، يرجى الاشتراك في إحدى الباقات المدفوعة أولاً.
                                    </p>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setAddStaffModalOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                    >
                                        إغلاق
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddStaffModalOpen(false);
                                            const plansSection = document.getElementById('plans-section');
                                            if (plansSection) plansSection.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                                    >
                                        <span>استعراض الباقات والاشتراك</span>
                                        <ArrowUpRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        عدد الموظفين الإضافيين المطلوب إضافتهم:
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {[1, 2, 3, 5].map((cnt) => (
                                            <button
                                                key={cnt}
                                                type="button"
                                                onClick={() => setStaffData('extra_count', cnt)}
                                                className={`flex-1 py-2.5 rounded-xl border text-center font-bold text-xs transition ${
                                                    staffData.extra_count === cnt 
                                                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                +{cnt} موظف
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={staffData.extra_count}
                                        onChange={(e) => setStaffData('extra_count', Math.max(1, parseInt(e.target.value) || 1))}
                                        className="mt-3 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                                        placeholder="أو اكتب العدد يدوياً"
                                    />
                                </div>

                                {/* Cost Breakdown */}
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>سعر الموظف الإضافي شهرياً:</span>
                                        <span className="font-bold text-white font-mono">
                                            {formatCurrency(stats.extra_employee_price)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>السعة الإجمالية الجديدة بعد الإضافة:</span>
                                        <span className="font-bold text-cyan-400 font-mono">
                                            {stats.max_allowed_employees + Number(staffData.extra_count)} موظف
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                                        <span className="font-bold text-slate-200">التكلفة الشهرية المضافة:</span>
                                        <span className="font-black text-emerald-400 font-mono text-base">
                                            +{formatCurrency(Number(staffData.extra_count) * stats.extra_employee_price)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setAddStaffModalOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingStaff}
                                        className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <span>{processingStaff ? 'جاري التحويل للدفع...' : 'متابعة الدفع وتفعيل المقاعد'}</span>
                                        <ArrowUpRight size={14} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Upgrade / Change Plan Confirmation */}
            {upgradePlanModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Zap size={18} className="text-amber-400" />
                                <span>ترقية الباقة إلى: {upgradePlanModal.name}</span>
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setUpgradePlanModal(null)} 
                                className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpgradeSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    اختر دورة الفوترة للباقتك الجديدة:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPlanData('billing_cycle', 'monthly')}
                                        className={`p-3.5 rounded-2xl border text-right transition ${
                                            planData.billing_cycle === 'monthly'
                                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                                : 'bg-slate-950 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        <div className="font-bold text-sm">اشتراك شهري</div>
                                        <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                                            {formatCurrency(upgradePlanModal.price_monthly)} / شهر
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPlanData('billing_cycle', 'yearly')}
                                        className={`p-3.5 rounded-2xl border text-right transition ${
                                            planData.billing_cycle === 'yearly'
                                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                                : 'bg-slate-950 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        <div className="font-bold text-sm">اشتراك سنوي</div>
                                        <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                                            {formatCurrency(upgradePlanModal.price_yearly)} / سنة
                                        </div>
                                        <div className="text-[10px] text-amber-400 mt-0.5 font-semibold">خصم شهرين مجاناً</div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>سعة الموظفين الأساسية بالباقة:</span>
                                    <span className="font-bold text-white">{upgradePlanModal.max_employees} موظف</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>سعر الموظف الإضافي:</span>
                                    <span className="font-bold text-white">{formatNumber(upgradePlanModal.extra_employee_price)} ج.م / شهرياً</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                                    <span className="font-bold text-slate-200">الإجمالي:</span>
                                    <span className="font-black text-emerald-400 font-mono text-base">
                                        {formatCurrency(planData.billing_cycle === 'yearly' ? upgradePlanModal.price_yearly : upgradePlanModal.price_monthly)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setUpgradePlanModal(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingChangePlan}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <span>{processingChangePlan ? 'جاري التحويل للدفع...' : 'متابعة الدفع والترقية'}</span>
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
