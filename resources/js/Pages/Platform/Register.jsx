import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    Lock, 
    Check, 
    AlertCircle, 
    CreditCard, 
    Users, 
    ArrowLeft,
    CheckCircle2,
    XCircle
} from 'lucide-react';

export default function Register({ plans, selectedPlan }) {
    const urlParams = new URLSearchParams(window.location.search);
    const initialCycle = urlParams.get('cycle') || 'monthly';
    const initialExtra = Number(urlParams.get('extra')) || 0;

    const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, message: '' });

    const { data, setData, post, processing, errors } = useForm({
        store_name: '',
        slug: '',
        owner_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        plan_id: selectedPlan?.id || plans[0]?.id || '',
        billing_cycle: initialCycle,
        extra_employees: initialExtra,
    });

    const activePlan = plans.find(p => p.id === Number(data.plan_id)) || selectedPlan || plans[0];
    const isYearly = data.billing_cycle === 'yearly';
    const basePrice = isYearly ? Number(activePlan.price_yearly) : Number(activePlan.price_monthly);
    const extraPricePerMonth = Number(data.extra_employees) * Number(activePlan.extra_employee_price);
    const extraTotal = isYearly ? (extraPricePerMonth * 12) : extraPricePerMonth;
    const grandTotal = basePrice + extraTotal;

    // Check slug availability on debounce
    useEffect(() => {
        if (!data.slug || data.slug.length < 3) {
            setSlugStatus({ checking: false, available: null, message: '' });
            return;
        }

        const timer = setTimeout(() => {
            setSlugStatus({ checking: true, available: null, message: 'جاري التحقق...' });
            axios.get(route('platform.register.check-slug', { slug: data.slug }))
                .then(res => {
                    setSlugStatus({ checking: false, available: res.data.available, message: res.data.message });
                })
                .catch(() => {
                    setSlugStatus({ checking: false, available: false, message: 'حدث خطأ أثناء فحص الرابط' });
                });
        }, 500);

        return () => clearTimeout(timer);
    }, [data.slug]);

    const handleStoreNameChange = (e) => {
        const val = e.target.value;
        setData(prev => ({
            ...prev,
            store_name: val,
            // Automatically generate slug from store name if slug hasn't been manually typed much
            slug: prev.slug === '' ? val.toLowerCase().replace(/[^a-z0-9]/g, '') : prev.slug
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('platform.register.submit'));
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans py-12 px-6">
            <Head title="تسجيل متجر جديد - Casher System" />

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/30">
                            C
                        </div>
                        <span className="font-extrabold text-2xl text-white">Casher</span>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black text-white">إنشاء حساب متجر جديد</h1>
                    <p className="text-slate-400 text-sm">أدخل بيانات متجرك واختر الباقة لتفعيل السيستم والدفع فورياً</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Inputs */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Store Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Store size={18} className="text-indigo-400" />
                                <span>بيانات المتجر ورابط الدخول</span>
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المتجر / الشركة</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.store_name}
                                        onChange={handleStoreNameChange}
                                        placeholder="مثال: سوبرماركت النور"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {errors.store_name && <p className="text-rose-400 text-xs mt-1">{errors.store_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        رابط المتجر الخاص بك (Subdomain)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            dir="ltr"
                                            value={data.slug}
                                            onChange={(e) => setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="al-nour"
                                            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pr-4 pl-32 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-left"
                                        />
                                        <span className="absolute left-3 top-3 text-xs text-slate-400 font-mono" dir="ltr">
                                            .casher.com
                                        </span>
                                    </div>

                                    {/* Slug Availability Status */}
                                    <div className="mt-1.5 text-xs flex items-center gap-1.5">
                                        {slugStatus.available === true && (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 size={13} />
                                                <span>{slugStatus.message}</span>
                                            </span>
                                        )}
                                        {slugStatus.available === false && (
                                            <span className="text-rose-400 flex items-center gap-1">
                                                <XCircle size={13} />
                                                <span>{slugStatus.message}</span>
                                            </span>
                                        )}
                                        {slugStatus.checking && (
                                            <span className="text-slate-400">{slugStatus.message}</span>
                                        )}
                                    </div>
                                    {errors.slug && <p className="text-rose-400 text-xs mt-1">{errors.slug}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Owner Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <User size={18} className="text-indigo-400" />
                                    <span>بيانات المالك وحساب المدير</span>
                                </h2>
                                <a
                                    href="/auth/google"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white transition shadow-sm"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    <span>تسجيل سريع بـ Google</span>
                                </a>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم بالكامل</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.owner_name}
                                        onChange={(e) => setData('owner_name', e.target.value)}
                                        placeholder="محمد أحمد"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {errors.owner_name && <p className="text-rose-400 text-xs mt-1">{errors.owner_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم الهاتف / الواتساب</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="01xxxxxxxxx"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {errors.phone && <p className="text-rose-400 text-xs mt-1">{errors.phone}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
                                    <input
                                        type="password"
                                        required
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">تأكيد كلمة المرور</label>
                                    <input
                                        type="password"
                                        required
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Plan Summary & Payment */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 sticky top-24">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                                <CreditCard size={18} className="text-indigo-400" />
                                <span>ملخص الباقة والاشتراك</span>
                            </h2>

                            {/* Plan Selection */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300">الباقة المختارة</label>
                                <select
                                    value={data.plan_id}
                                    onChange={(e) => setData('plan_id', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Billing Cycle */}
                            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setData('billing_cycle', 'monthly')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                                        data.billing_cycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                    }`}
                                >
                                    شهري
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('billing_cycle', 'yearly')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                                        data.billing_cycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                    }`}
                                >
                                    سنوي (وفر شهرين)
                                </button>
                            </div>

                            {/* Extra Employees */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-300">مقاعد موظفين إضافية:</span>
                                    <span className="font-bold text-indigo-400">+{data.extra_employees} موظف</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={data.extra_employees}
                                    onChange={(e) => setData('extra_employees', Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="text-[11px] text-slate-400">
                                    {activePlan.max_employees} أساسي + {data.extra_employees} إضافي = {activePlan.max_employees + Number(data.extra_employees)} إجمالي الموظفين المسموح بهم
                                </div>
                            </div>

                            {/* Totals Breakdown */}
                            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>سعر الباقة الأساسية:</span>
                                    <span className="text-white font-medium">{basePrice} ج.م</span>
                                </div>
                                {extraTotal > 0 && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>تكلفة المقاعد الإضافية:</span>
                                        <span className="text-emerald-400 font-medium">+{extraTotal} ج.م</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm">
                                    <span className="font-bold text-white">الإجمالي المستحق:</span>
                                    <span className="text-2xl font-black text-indigo-400">{grandTotal} ج.م</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || slugStatus.available === false}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <span>{processing ? 'جاري تجهيز الحساب...' : 'المتابعة للدفع والتفعيل'}</span>
                                <ArrowLeft size={16} />
                            </button>

                            <div className="text-center text-[11px] text-slate-500">
                                بالضغط على المتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية.
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
