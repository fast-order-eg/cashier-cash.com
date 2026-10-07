import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { 
    CreditCard, 
    Smartphone, 
    ShieldCheck, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle, 
    Users, 
    RefreshCw, 
    Zap,
    Lock,
    Sparkles
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/formatters';

export default function Checkout({ transaction, tenant, gateway, isPaymobConfigured, paymobMode }) {
    const [selectedMethod, setSelectedMethod] = useState('vodafone_cash'); // 'vodafone_cash' | 'instapay'
    const [walletPhone, setWalletPhone] = useState(tenant?.phone || '');

    const { post, processing, errors } = useForm({
        method: selectedMethod,
        wallet_number: walletPhone,
    });

    const handlePay = (methodToPay) => {
        post(`/admin/subscriptions/pay/${transaction.order_reference}`, {
            data: {
                method: methodToPay,
                wallet_number: walletPhone,
            },
        });
    };

    const handleSimulateSuccess = () => {
        post(`/admin/subscriptions/pay/${transaction.order_reference}`, {
            data: {
                method: 'simulate',
            },
        });
    };

    const getTitle = () => {
        if (transaction.type === 'add_staff') return `شراء ${transaction.payload?.extra_count} مقاعد موظفين إضافية`;
        if (transaction.type === 'renew') return `تجديد اشتراك المتجر (${transaction.payload?.months} شهور)`;
        if (transaction.type === 'upgrade') return `ترقية الباقة إلى (${transaction.payload?.plan_name || 'الباقة الجديدة'})`;
        return 'إتمام سداد اشتراك المتجر';
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans py-12 px-4 selection:bg-indigo-500 selection:text-white">
            <Head title="إتمام الدفع - Paymob" />

            <div className="max-w-xl mx-auto space-y-6">
                {/* Back to subscriptions link */}
                <div className="flex items-center justify-between text-xs">
                    <Link 
                        href="/admin/subscriptions" 
                        className="text-slate-400 hover:text-white flex items-center gap-1.5 transition"
                    >
                        <ArrowRight size={15} />
                        <span>العودة لصفحة الاشتراكات</span>
                    </Link>
                    <span className="text-slate-500 font-mono text-[11px]">
                        طلب رقم #{transaction.order_reference}
                    </span>
                </div>

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-3xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/10">
                        <CreditCard size={28} />
                    </div>
                    <h1 className="text-2xl font-black text-white">إتمام السداد وتفعيل الطلب</h1>
                    <p className="text-slate-400 text-xs">
                        الدفع الإلكتروني الآمن بواسطة بوابة <b>Paymob (باي موب)</b> المعتمدة في مصر
                    </p>
                </div>

                {/* Order Summary Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            {transaction.type === 'add_staff' && <Users className="text-cyan-400" size={18} />}
                            {transaction.type === 'renew' && <RefreshCw className="text-indigo-400" size={18} />}
                            {transaction.type === 'upgrade' && <Zap className="text-amber-400" size={18} />}
                            <span className="font-extrabold text-white text-sm">{getTitle()}</span>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {tenant?.name}
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        {transaction.type === 'add_staff' && (
                            <div className="flex justify-between text-slate-300">
                                <span>عدد المقاعد الإضافية:</span>
                                <span className="font-bold text-cyan-400 font-mono">+{transaction.payload?.extra_count} موظف</span>
                            </div>
                        )}
                        {transaction.type === 'renew' && (
                            <div className="flex justify-between text-slate-300">
                                <span>مدة التمديد:</span>
                                <span className="font-bold text-indigo-400">{transaction.payload?.months} شهور</span>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-300">
                            <span>المتجر المشترك:</span>
                            <span className="font-bold text-white">{tenant?.name}</span>
                        </div>
                    </div>

                    {/* Total Box */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 block">المبلغ الإجمالي المطلوب سداده:</span>
                            <span className="text-[11px] text-emerald-400 font-semibold">شامل الرسوم والضريبة</span>
                        </div>
                        <div className="text-left font-mono font-black text-2xl text-emerald-400">
                            {formatNumber(transaction.amount)} <span className="text-xs font-normal text-slate-400 font-sans">ج.م</span>
                        </div>
                    </div>
                </div>

                {/* Payment Methods Selection */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                            <Lock size={16} className="text-indigo-400" />
                            <span>اختر وسيلة الدفع:</span>
                        </h2>
                        {isPaymobConfigured ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                                <CheckCircle2 size={12} />
                                <span>البوابة مفعلة ومربوطة</span>
                            </span>
                        ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                                <AlertCircle size={12} />
                                <span>البوابة قيد الإعداد</span>
                            </span>
                        )}
                    </div>

                    {!isPaymobConfigured && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>بوابة الدفع الإلكتروني (Paymob) قيد التهيئة</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-[11px]">
                                لم يتم إدخال مفاتيح الربط الخاصة ببوابة Paymob بعد في لوحة تحكم السوبر أدمن (<span className="text-white font-mono">/admin/payment-settings</span>). 
                                لا يمكن السداد أو التجديد التلقائي حتى يتم إدخال المفاتيح.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {/* Option 1: Vodafone Cash & Wallets */}
                        <div 
                            onClick={() => setSelectedMethod('vodafone_cash')}
                            className={`p-4 rounded-2xl border transition cursor-pointer ${
                                selectedMethod === 'vodafone_cash'
                                    ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/5'
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <span>فودافون كاش والمحافظ الإلكترونية</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold">فوري</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 block mt-0.5">
                                            فودافون كاش، أورانج كاش، اتصالات كاش، WE Pay، والمحافظ البنكية الذكية
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    selectedMethod === 'vodafone_cash' ? 'border-rose-500 bg-rose-500' : 'border-slate-750 bg-slate-900'
                                }`}>
                                    {selectedMethod === 'vodafone_cash' && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            </div>

                            {selectedMethod === 'vodafone_cash' && (
                                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        رقم الهاتف المسجل عليه المحفظة:
                                    </label>
                                    <input
                                        type="tel"
                                        dir="ltr"
                                        disabled={!isPaymobConfigured}
                                        value={walletPhone}
                                        onChange={(e) => setWalletPhone(e.target.value)}
                                        placeholder="01012345678"
                                        className="w-full bg-slate-900 border border-slate-750 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono text-center outline-none disabled:opacity-50"
                                    />
                                    <span className="text-[11px] text-slate-400 block">
                                        ستصلك رسالة أو إشعار تأكيد على هاتفك لتأكيد الخصم برقمك السري.
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handlePay('vodafone_cash')}
                                        disabled={processing || !walletPhone || !isPaymobConfigured}
                                        className={`w-full mt-2 py-3 rounded-xl font-bold text-xs shadow-lg transition ${
                                            !isPaymobConfigured
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 cursor-pointer'
                                        }`}
                                    >
                                        {processing 
                                            ? 'جاري المعالجة...' 
                                            : !isPaymobConfigured 
                                                ? 'وسيلة الدفع غير مفعلة حالياً (تواصل مع الإدارة)' 
                                                : `تأكيد ودفع ${formatNumber(transaction.amount)} ج.م عبر فودافون كاش`
                                        }
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Option 2: InstaPay & Cards */}
                        <div 
                            onClick={() => setSelectedMethod('instapay')}
                            className={`p-4 rounded-2xl border transition cursor-pointer ${
                                selectedMethod === 'instapay'
                                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-600/5'
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <span>إنستاباي والبطاقات البنكية</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">InstaPay / Visa / Meeza</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 block mt-0.5">
                                            السداد الفوري عبر تطبيق إنستاباي، أو بطاقات ميزة، فيزا، وماستركارد
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    selectedMethod === 'instapay' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-750 bg-slate-900'
                                }`}>
                                    {selectedMethod === 'instapay' && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            </div>

                            {selectedMethod === 'instapay' && (
                                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                                    <span className="text-[11px] text-slate-300 block">
                                        سيتم توجيهك لشاشة الدفع الآمنة لإتمام السداد عبر تطبيق إنستاباي أو إدخال بيانات البطاقة البنكية.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handlePay('instapay')}
                                        disabled={processing || !isPaymobConfigured}
                                        className={`w-full mt-2 py-3 rounded-xl font-bold text-xs shadow-lg transition ${
                                            !isPaymobConfigured
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                                        }`}
                                    >
                                        {processing 
                                            ? 'جاري التحويل...' 
                                            : !isPaymobConfigured 
                                                ? 'وسيلة الدفع غير مفعلة حالياً (تواصل مع الإدارة)' 
                                                : `متابعة الدفع (${formatNumber(transaction.amount)} ج.م) عبر إنستاباي / فيزا`
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Developer / Demo Simulator Sandbox Box */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/40 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-amber-300 font-bold">
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={15} />
                                <span>محاكاة المطور التجريبية (Developer Sandbox Only)</span>
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                مخصص للمطور فقط
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                            هذا الخيار مخصص للمطور فقط لاختبار الكود البرمجي محلياً (Localhost). يمكنك الضغط عليه لمحاكاة نجاح الدفع واختبار زيادة سعة الموظفين أو التجديد بدون خصم حقيقي.
                        </p>
                        <button
                            type="button"
                            onClick={handleSimulateSuccess}
                            disabled={processing}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                        >
                            {processing ? 'جاري المحاكاة والتفعيل...' : 'اختبار فوري للمطور: محاكاة دفع ناجح وتفعيل'}
                        </button>
                    </div>

                    {/* Security Footer */}
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs pt-2">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>جميع المعاملات مشفرة ومحمية بمعايير الأمان البنكية PCI DSS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
