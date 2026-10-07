import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { 
    Zap, 
    WifiOff, 
    Wifi,
    Truck, 
    TrendingUp, 
    ShieldCheck, 
    Check, 
    ArrowLeft, 
    Sparkles,
    Sliders,
    Users,
    Printer,
    DollarSign,
    RefreshCw,
    Database,
    LayoutDashboard,
    LogOut
} from 'lucide-react';

export default function Landing({ plans }) {
    const { auth } = usePage().props;
    const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
    const [extraEmployees, setExtraEmployees] = useState(0);

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
            <Head title="نظام كاشير السحابي المتكامل - كاشير و سيارات جملة (Online & Offline)" />

            {/* Navbar */}
            <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    {/* Right: Logo */}
                    <div className="flex-shrink-0">
                        <a href="/" className="flex items-center gap-3">
                            <ApplicationLogo withText={true} className="w-10 h-10 shadow-lg shadow-indigo-500/25" />
                        </a>
                    </div>

                    {/* Center: Main Menu (في المنتصف تماماً) */}
                    <nav className="hidden md:flex items-center justify-center gap-8 text-sm font-semibold">
                        <a href="#features" className="text-slate-300 hover:text-white hover:text-indigo-400 transition">
                            المميزات
                        </a>
                        <a href="#offline-mode" className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            وضع الأوفلاين
                        </a>
                        <a href="#pricing" className="text-slate-300 hover:text-white hover:text-indigo-400 transition">
                            الأسعار والباقات
                        </a>
                    </nav>

                    {/* Left: Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {auth?.user ? (
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs text-slate-300 hidden lg:inline-block">
                                    مرحباً، <strong className="text-white">{auth.user.name}</strong>
                                </span>
                                <a
                                    href="/login"
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                                >
                                    <LayoutDashboard size={14} />
                                    <span>لوحة التحكم</span>
                                </a>
                                <a
                                    href="/logout"
                                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition flex items-center gap-1"
                                    title="تسجيل الخروج"
                                >
                                    <LogOut size={13} />
                                    <span>خروج</span>
                                </a>
                            </div>
                        ) : (
                            <>
                                <a
                                    href="/login"
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition"
                                >
                                    تسجيل الدخول
                                </a>
                                <a
                                    href="#pricing"
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                                >
                                    <span>اشترك الآن</span>
                                    <ArrowLeft size={14} />
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 px-6 relative overflow-hidden text-center">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>يعمل 100% أونلاين وأوفلاين بدون انقطاع مع مزامنة فورية</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                        إدارة مبيعات متجرك وسيارات التوزيع
                        <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-violet-300 to-emerald-400 block mt-2">
                            بأسهل وأقوى نظام كاشير سحابي
                        </span>
                    </h1>

                    <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        نقطة بيع متطورة وسريعة تدعم قارئ الباركود والطابعات الحرارية، واجهة متخصصة لسيارات بيع الجملة (Van Sales)، وحساب أرباح وخسائر فوري. 
                        <strong className="text-emerald-400 font-bold block mt-1">حتى لو انقطع الإنترنت في المحل، الكاشير هيكمل بيع وطباعة بدون أي توقف!</strong>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <a
                            href="#pricing"
                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 transition"
                        >
                            <span>سجل متجرك واشترك الآن</span>
                            <ArrowLeft size={16} />
                        </a>
                        <a
                            href="#offline-mode"
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition flex items-center justify-center gap-2"
                        >
                            <WifiOff size={16} className="text-emerald-400" />
                            <span>كيف يعمل بدون إنترنت؟</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Offline vs Online Highlight Banner */}
            <section id="offline-mode" className="py-12 px-6 max-w-6xl mx-auto">
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="space-y-4 text-right max-w-xl">
                            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                <Wifi size={14} />
                                <span>تقنية المزامنة الهجينة (Hybrid POS)</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                                محلك مش هيعطل ثانية واحدة.. سواء النت شغال أو فاصل!
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                صممنا النظام ليعمل مباشرة داخل المتصفح كـ تطبيق متقدم (PWA) مع قاعدة بيانات محلية ذكية (IndexedDB). 
                                لو النت قطع، الكاشير هيستمر في مسح الباركود، تحصيل المبالغ، وطباعة الفاتورة للعميل في جزء من الثانية.
                            </p>
                        </div>

                        {/* 3 Step Visual */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                            <div className="bg-slate-850/80 border border-slate-700 p-5 rounded-2xl text-center space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                    <WifiOff size={20} />
                                </div>
                                <h3 className="text-sm font-bold text-white">1. استمرار البيع بدون نت</h3>
                                <p className="text-xs text-slate-400">إصدار وطباعة فواتير فورية بدون أي بطء أو انقطاع.</p>
                            </div>

                            <div className="bg-slate-850/80 border border-slate-700 p-5 rounded-2xl text-center space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                    <Database size={20} />
                                </div>
                                <h3 className="text-sm font-bold text-white">2. تخزين محلي مشفر</h3>
                                <p className="text-xs text-slate-400">حفظ كافة الفواتير محلياً على جهاز الكاشير بأمان تام.</p>
                            </div>

                            <div className="bg-slate-850/80 border border-slate-700 p-5 rounded-2xl text-center space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <RefreshCw size={20} />
                                </div>
                                <h3 className="text-sm font-bold text-white">3. مزامنة فورية تلقائياً</h3>
                                <p className="text-xs text-slate-400">بمجرد رجوع النت، تترفع العمليات للسيرفر وتحدث المخزون.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features */}
            <section id="features" className="py-16 px-6 max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-3xl font-extrabold text-white">كل ما يحتاجه نشاطك التجاري في منصة واحدة</h2>
                    <p className="text-slate-400 text-sm mt-2">صممت خصيصاً لتناسب المحلات وشركات التوزيع ومحطات البيع بالجملة</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-emerald-500/40 transition">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <WifiOff size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">يعمل أونلاين وأوفلاين (100% Offline)</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            لو النت قطع في المحل، الكاشير هيكمل مسح باركود وإصدار وطباعة فواتير في ثوانٍ. وعند عودة النت، الفواتير بتترفع تلقائياً للسيرفر وتحدث المخزون بدون أي تداخل.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-indigo-500/40 transition">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Truck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">منظومة سيارات التوزيع (Van Sales)</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            تسجيل قراءة عداد السيارة بداية ونهاية اليوم وحساب الكيلومترات المقطوعة، إذن صرف بضاعة للسيارة، بيع بالجملة، وتصفية العهدة والكاش آخر اليوم.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-violet-500/40 transition">
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">أرباح وخسائر وتقارير PDF / Excel</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            حساب صافي الأرباح تلقائياً بعد خصم تكلفة البضاعة والمصروفات اليومية. تقارير يومية وشهرية وتحميل فوري بصيغة Excel و PDF جاهزة للطباعة.
                        </p>
                    </div>
                </div>
            </section>

            {/* Interactive Pricing Calculator */}
            <section id="pricing" className="py-20 px-6 bg-slate-900/50 border-t border-slate-800">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-4">
                        <h2 className="text-3xl sm:text-4xl font-black text-white">باقات اشتراك مرنة تناسب حجم أعمالك</h2>
                        <p className="text-slate-400 text-sm">ادفع بالفيزا أو المحافظ الإلكترونية عبر Kashier، وحسابك يتفعل فوراً</p>

                        {/* Billing Switch */}
                        <div className="flex items-center justify-center gap-3 pt-4">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                                    billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                دفع شهري
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                                    billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                <span>دفع سنوي</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-extrabold">
                                    وفر شهرين مع الاشتراك السنوي
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Extra Employees Seat Slider */}
                    <div className="bg-slate-850 border border-slate-700/80 p-6 rounded-3xl max-w-xl mx-auto space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white flex items-center gap-2">
                                <Users size={18} className="text-indigo-400" />
                                <span>موظفين إضافيين (كاشير / مناديب زيادة):</span>
                            </span>
                            <span className="text-indigo-400 font-extrabold text-base">+{extraEmployees} موظف</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            value={extraEmployees}
                            onChange={(e) => setExtraEmployees(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400">
                            <span>0 موظف إضافي</span>
                            <span>10 موظفين</span>
                            <span>20 موظف إضافي</span>
                        </div>
                    </div>

                    {/* Plans Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const isYearly = billingCycle === 'yearly';
                            const basePrice = isYearly ? Number(plan.price_yearly) : Number(plan.price_monthly);
                            const extraCostPerMonth = extraEmployees * Number(plan.extra_employee_price);
                            const extraCostTotal = isYearly ? (extraCostPerMonth * 12) : extraCostPerMonth;
                            const totalPrice = basePrice + extraCostTotal;

                            return (
                                <div 
                                    key={plan.id}
                                    className={`bg-slate-900 rounded-3xl p-8 flex flex-col justify-between relative transition duration-200 border ${
                                        plan.slug === 'pro' 
                                            ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20' 
                                            : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {plan.slug === 'pro' && (
                                        <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-bold shadow-md">
                                            الأكثر طلباً
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                                        </div>

                                        <div className="pb-6 border-b border-slate-800">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-white">{totalPrice}</span>
                                                <span className="text-xs text-slate-400">ج.م / {isYearly ? 'سنوياً' : 'شهرياً'}</span>
                                            </div>
                                            {extraEmployees > 0 && (
                                                <div className="text-xs text-indigo-400 mt-1">
                                                    يشمل {plan.max_employees + extraEmployees} موظف ({plan.max_employees} أساسي + {extraEmployees} زيادة)
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-slate-300">ميزات الباقة:</div>
                                            {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                                                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                                                    <Check size={15} className="text-emerald-400 flex-shrink-0" />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-800">
                                        <a
                                            href={`/register?plan=${plan.slug}&cycle=${billingCycle}&extra=${extraEmployees}`}
                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                                                plan.slug === 'pro'
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                                            }`}
                                        >
                                            <span>اشترك في {plan.name}</span>
                                            <ArrowLeft size={14} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-850 py-10 px-6 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                    <a href="/" className="inline-flex items-center">
                        <ApplicationLogo withText={true} className="w-8 h-8" />
                    </a>
                    <div>
                        © {new Date().getFullYear()} Casher System. جميع الحقوق محفوظة.
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span>يعمل أونلاين وأوفلاين</span>
                        <span>•</span>
                        <span>الدفع الآمن بواسطة Kashier</span>
                        <span>•</span>
                        <span>دعم فني 24/7</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
