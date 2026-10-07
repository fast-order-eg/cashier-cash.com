import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import axios from 'axios';
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    Lock, 
    Check, 
    Sparkles,
    ShieldCheck, 
    Users, 
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff
} from 'lucide-react';

export default function Register({ plans = [], selectedPlan }) {
    const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, message: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const defaultPlanId = selectedPlan?.id || (plans && plans.length > 0 ? plans[0].id : 1);

    const { data, setData, post, processing, errors } = useForm({
        store_name: '',
        slug: '',
        owner_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        plan_id: defaultPlanId,
        billing_cycle: 'monthly',
    });

    // فحص توفر الرابط (Slug) تلقائياً
    useEffect(() => {
        if (!data.slug || data.slug.length < 3) {
            setSlugStatus({ checking: false, available: null, message: '' });
            return;
        }

        const timer = setTimeout(() => {
            setSlugStatus({ checking: true, available: null, message: 'جاري فحص توفر الرابط...' });
            axios.get(`/register/check-slug?slug=${encodeURIComponent(data.slug)}`)
                .then(res => {
                    setSlugStatus({ checking: false, available: res.data.available, message: res.data.message });
                })
                .catch(() => {
                    setSlugStatus({ checking: false, available: false, message: 'تعذر التحقق من الرابط' });
                });
        }, 400);

        return () => clearTimeout(timer);
    }, [data.slug]);

    const handleStoreNameChange = (e) => {
        const val = e.target.value;
        setData(prev => ({
            ...prev,
            store_name: val,
            slug: prev.slug === '' ? val.toLowerCase().replace(/[^a-z0-9-]/g, '') : prev.slug
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans py-8 sm:py-12 px-4 sm:px-6 flex flex-col justify-center selection:bg-indigo-500 selection:text-white">
            <Head title="تسجيل متجر جديد - تجربة مجانية" />

            <div className="w-full max-w-xl mx-auto space-y-6">
                
                {/* Header الترويسة */}
                <div className="text-center space-y-2">
                    <a href="/" className="inline-flex items-center justify-center gap-2 mb-2 group">
                        <ApplicationLogo withText={true} className="w-12 h-12 shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform" textClassName="text-2xl text-white font-black" />
                    </a>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">إنشاء متجر جديد</h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                        ابدأ تجربتك المجانية لمدة 7 أيام بالكامل • بدون بطاقة بنكية
                    </p>
                </div>

                {/* كارت التسجيل الرئيسي الموحد */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur space-y-6">

                    {/* زر التسجيل السريع بحساب Google */}
                    <div>
                        <a
                            href="/auth/google"
                            className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-sm font-bold text-white transition flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99]"
                        >
                            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                            <span>تسجيل سريع بحساب Google</span>
                        </a>

                        <div className="relative my-6 text-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                أو تعبئة بيانات المتجر يدوياً
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* 1. بيانات المتجر ورابط الدخول */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Store size={14} className="text-indigo-400" />
                                    <span>اسم المتجر / الشركة</span>
                                    <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.store_name}
                                    onChange={handleStoreNameChange}
                                    placeholder="مثال: سوبرماركت الأمانة"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                />
                                {errors.store_name && <p className="text-rose-400 text-xs mt-1">{errors.store_name}</p>}
                            </div>

                            {/* رابط المتجر الفرعي (Subdomain) بالترتيب الصحيح: [السب دومين] .casher.com */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-indigo-400" />
                                        <span>رابط متجرك المخصص (Subdomain)</span>
                                        <span className="text-rose-400">*</span>
                                    </label>
                                    <span className="text-[11px] text-slate-400">بحروف وأرقام إنجليزية</span>
                                </div>

                                <div 
                                    dir="ltr" 
                                    className="flex items-center rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner"
                                >
                                    <input
                                        type="text"
                                        required
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="my-store"
                                        className="flex-1 min-w-0 bg-transparent border-0 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0 font-mono text-left"
                                    />
                                    <div className="px-3.5 py-3 text-xs sm:text-sm font-mono font-bold text-indigo-400 bg-slate-900/90 border-l border-slate-800 select-none whitespace-nowrap">
                                        .casher.com
                                    </div>
                                </div>

                                {/* مؤشر حالة توفر الرابط */}
                                <div className="mt-1.5 text-xs flex items-center gap-1.5 min-h-[18px]">
                                    {slugStatus.available === true && (
                                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                            <CheckCircle2 size={13} />
                                            <span>الرابط متاح للاستخدام ({data.slug}.casher.com)</span>
                                        </span>
                                    )}
                                    {slugStatus.available === false && (
                                        <span className="text-rose-400 flex items-center gap-1 font-medium">
                                            <XCircle size={13} />
                                            <span>{slugStatus.message}</span>
                                        </span>
                                    )}
                                    {slugStatus.checking && (
                                        <span className="text-slate-400 flex items-center gap-1 animate-pulse">
                                            <span>جاري فحص الرابط...</span>
                                        </span>
                                    )}
                                </div>
                                {errors.slug && <p className="text-rose-400 text-xs mt-1">{errors.slug}</p>}
                            </div>
                        </div>

                        {/* فاصل ناعم */}
                        <div className="border-t border-slate-800/80 pt-4"></div>

                        {/* 2. بيانات المالك وحساب المدير */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <User size={14} className="text-indigo-400" />
                                        <span>اسم المدير المسؤول</span>
                                        <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.owner_name}
                                        onChange={(e) => setData('owner_name', e.target.value)}
                                        placeholder="محمد أحمد"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                    />
                                    {errors.owner_name && <p className="text-rose-400 text-xs mt-1">{errors.owner_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <Phone size={14} className="text-indigo-400" />
                                        <span>رقم الهاتف / واتساب</span>
                                        <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="010xxxxxxxx"
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                    />
                                    {errors.phone && <p className="text-rose-400 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Mail size={14} className="text-indigo-400" />
                                    <span>البريد الإلكتروني (لتسجيل الدخول)</span>
                                    <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                />
                                {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <Lock size={14} className="text-indigo-400" />
                                        <span>كلمة المرور</span>
                                        <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition"
                                            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <Lock size={14} className="text-indigo-400" />
                                        <span>تأكيد كلمة المرور</span>
                                        <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition"
                                            title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* بطاقة مميزات الفترة التجريبية الخفيفة والأنيقة */}
                        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>تجربة مجانية كاملة لمدة 7 أيام (0 ج.م مستحق اليوم)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <Users size={16} className="text-emerald-400 shrink-0" />
                                <span>سعة التجربة: 2 موظف (المدير المسؤول + كاشير أو مندوب)</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                                <span>تفعيل فوري لكاشير متجرك وسيارات المناديب بدون بطاقة بنكية</span>
                            </div>
                        </div>

                        {/* زر البدء الرئيسي */}
                        <button
                            type="submit"
                            disabled={processing || slugStatus.available === false}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                        >
                            <span>{processing ? 'جاري تجهيز متجرك...' : 'بدء التجربة المجانية الآن (7 أيام مجاناً)'}</span>
                            <ArrowLeft size={18} />
                        </button>

                        {/* أسفل الفورم: رابط الدخول */}
                        <div className="pt-2 text-center space-y-2">
                            <p className="text-xs text-slate-400">
                                لديك متجر مسجل بالفعل؟{' '}
                                <a href="/login" className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
                                    تسجيل الدخول
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
