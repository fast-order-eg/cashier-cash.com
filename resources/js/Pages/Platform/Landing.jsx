import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    Zap, 
    WifiOff, 
    Truck, 
    TrendingUp, 
    ShieldCheck, 
    Check, 
    ArrowLeft, 
    Sparkles,
    Sliders,
    Users,
    Printer,
    DollarSign
} from 'lucide-react';

export default function Landing({ plans }) {
    const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
    const [extraEmployees, setExtraEmployees] = useState(0);

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
            <Head title="نظام الكاشير السحابي المتكامل - كاشير و سيارات جملة" />

            {/* Navbar */}
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/30">
                            C
                        </div>
                        <div>
                            <span className="font-extrabold text-xl text-white">Casher</span>
                            <span className="text-indigo-400 font-medium text-xs block -mt-1">POS & Van Sales SaaS</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="#pricing" className="text-sm font-medium text-slate-300 hover:text-white transition hidden sm:inline-block">
                            الأسعار والباقات
                        </a>
                        <Link
                            href={route('login')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
                        >
                            تسجيل الدخول
                        </Link>
                        <Link
                            href={route('platform.register')}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
                        >
                            ابدأ تجربتك المجانية
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 px-6 relative overflow-hidden text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                        <Sparkles size={14} />
                        <span>نظام كاشير فائق السرعة يعمل أونلاين وأوفلاين بدون نت</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                        أدر مبيعات متجرك وسيارات التوزيع
                        <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-violet-400 block mt-2">
                            بأسهل وأذكى نظام كاشير سحابي
                        </span>
                    </h1>

                    <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        نقطة بيع سريعة تدعم قارئ الباركود والطابعات الحرارية، واجهة خاصة لسيارات التوزيع بالجملة مع تتبع عداد العربية، وتقارير أرباح وخسائر دقيقة بضغطة زر.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link
                            href={route('platform.register')}
                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 transition"
                        >
                            <span>سجل متجرك الآن مجاناً</span>
                            <ArrowLeft size={16} />
                        </Link>
                        <a
                            href="#features"
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
                        >
                            استكشف ميزات النظام
                        </a>
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
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-indigo-500/40 transition">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <WifiOff size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">يعمل 100% بدون إنترنت (Offline)</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            لو النت قطع في المحل، الكاشير هيكمل مسح باركود وإصدار وطباعة فواتير في ثوانٍ. وعند عودة النت، الفواتير بتترفع تلقائياً للسيرفر وتحدث المخزون.
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
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-indigo-500/40 transition">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                    billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                دفع شهري
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                <span>دفع سنوي</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    خصم شهرين مجاناً
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
                                        <Link
                                            href={route('platform.register', { plan: plan.slug, cycle: billingCycle, extra: extraEmployees })}
                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                                                plan.slug === 'pro'
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                                            }`}
                                        >
                                            <span>اشترك في {plan.name}</span>
                                            <ArrowLeft size={14} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-850 py-10 px-6 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        © {new Date().getFullYear()} Casher System. جميع الحقوق محفوظة.
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span>الدفع الآمن بواسطة Kashier</span>
                        <span>•</span>
                        <span>دعم فني 24/7</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
