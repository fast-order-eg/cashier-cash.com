import { useState, useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { LogIn, ArrowLeft, LogOut, LayoutDashboard, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login({ status, canResetPassword, currentUser, registerUrl }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        // تنظيف أي Service Worker قديم على النطاق العام لمنع أي تداخل
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    if (registration.scope.endsWith(':8000/') || registration.scope.endsWith('localhost/')) {
                        registration.unregister();
                    }
                }
            });
        }
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="تسجيل الدخول - نظام كاشير" />

            <div className="mb-6 text-center">
                <h2 className="text-xl font-black text-white">تسجيل الدخول للمنظومة</h2>
                <p className="mt-1 text-xs text-slate-400">سجل دخولك كـ سوبر أدمن، تاجر، كاشير، أو مندوب توزيع</p>
            </div>

            {/* لو مسجل دخوله بالفعل */}
            {currentUser && (
                <div className="mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">أنت مسجل الدخول حالياً:</span>
                        <span className="font-bold text-emerald-400">{currentUser.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={currentUser.dashboard_url}
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                        >
                            <LayoutDashboard size={14} />
                            <span>الذهاب للوحة التحكم</span>
                        </a>
                        <a
                            href="/logout"
                            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold text-center transition border border-slate-700 flex items-center justify-center gap-1"
                            title="تسجيل الخروج"
                        >
                            <LogOut size={13} />
                            <span>خروج</span>
                        </a>
                    </div>
                    <div className="text-[11px] text-center text-slate-400 pt-1 border-t border-slate-800/80">
                        أو يمكنك الدخول بحساب آخر من النموذج أدناه:
                    </div>
                </div>
            )}

            {status && (
                <div className="mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center text-xs sm:text-sm font-bold text-emerald-400 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 leading-relaxed">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{status}</span>
                </div>
            )}

            {/* تنبيه واضح عند وجود خطأ في بيانات الدخول */}
            {(errors.email || errors.password) && (
                <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        {errors.email && <p className="font-semibold leading-relaxed">{errors.email}</p>}
                        {errors.password && <p className="font-semibold leading-relaxed">{errors.password}</p>}
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        البريد الإلكتروني أو رقم الهاتف
                    </label>

                    <input
                        id="email"
                        type="text"
                        name="email"
                        value={data.email}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        placeholder="name@example.com أو 01xxxxxxxxx"
                        autoComplete="username"
                        autoFocus={!currentUser}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-1.5 text-xs text-rose-400 font-medium" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                            كلمة المرور
                        </label>
                        {canResetPassword && (
                            <Link
                                href="/forgot-password"
                                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                            >
                                نسيت كلمة المرور؟
                            </Link>
                        )}
                    </div>

                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 pl-11 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition focus:outline-none"
                            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <InputError message={errors.password} className="mt-1.5 text-xs text-rose-400" />
                </div>

                <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-xs text-slate-400 select-none">
                            تذكر تسجيل دخولي
                        </span>
                    </label>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <LogIn size={16} />
                        <span>{processing ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
                    </button>
                </div>

                <div className="pt-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-slate-900 px-3 text-slate-500">أو يمكنك الدخول عبر</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <a
                            href="/auth/google"
                            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-sm transition hover:bg-slate-800 hover:text-white"
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
                            <span>تسجيل الدخول بحساب Google</span>
                        </a>
                    </div>
                </div>

                <div className="pt-2 text-center">
                    <p className="text-xs text-slate-400">
                        ليس لديك متجر بعد؟{' '}
                        <a 
                            href={registerUrl || (typeof route === 'function' ? route('platform.register') : '/register')} 
                            className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors hover:underline"
                        >
                            سجل الآن
                        </a>
                    </p>
                </div>
            </form>
        </GuestLayout>
    );
}
