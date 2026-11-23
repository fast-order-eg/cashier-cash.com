import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { 
    CreditCard, 
    Smartphone, 
    ShieldCheck, 
    ArrowRight, 
    CheckCircle2, 
    Users, 
    RefreshCw, 
    Zap,
    Lock,
    Sparkles,
    Check
} from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

export default function Checkout({ 
    transaction, 
    tenant, 
    kashierCheckoutUrl
}) {
    const { post, processing } = useForm();

    const handlePay = () => {
        if (kashierCheckoutUrl) {
            window.location.href = kashierCheckoutUrl;
        } else {
            post(`/admin/subscriptions/pay/${transaction.order_reference}`, {
                data: {
                    method: 'kashier',
                },
            });
        }
    };

    const getTitle = () => {
        if (transaction.type === 'add_staff') return `شراء ${transaction.payload?.extra_count} مقاعد موظفين إضافية`;
        if (transaction.type === 'renew') return `تجديد اشتراك المتجر (${transaction.payload?.months} شهور)`;
        if (transaction.type === 'upgrade') return `ترقية الباقة إلى (${transaction.payload?.plan_name || 'الباقة الجديدة'})`;
        return 'إتمام سداد اشتراك المتجر';
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans py-12 px-4 selection:bg-indigo-500 selection:text-white">
            <Head title="إتمام السداد وتفعيل الاشتراك" />

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
                        الدفع الإلكتروني الآمن والمشفر بأعلى معايير الأمان البنكية
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

                {/* Direct Electronic Payment Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                            <Lock size={16} className="text-indigo-400" />
                            <span>طريقة الدفع:</span>
                        </h2>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                            <CheckCircle2 size={12} />
                            <span>دفع إلكتروني فوري ومباشر</span>
                        </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/40 shadow-xl shadow-indigo-500/5 space-y-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                                <CreditCard size={24} />
                            </div>
                            <div className="space-y-1">
                                <div className="font-extrabold text-base text-white flex items-center gap-2">
                                    <span>الدفع بالبطاقات البنكية أو المحافظ</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">مفعل ⚡</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    سداد فوري عبر بطاقات فيزا وماستركارد (المحلية والدولية)، بطاقات ميزة، ومحافظ الهاتف (فودافون كاش، اتصالات، أورانج، WE).
                                </p>
                            </div>
                        </div>

                        {/* Supported Methods Tags */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                                <Check size={14} className="text-emerald-400 shrink-0" />
                                <span>فيزا وماستركارد (محلية ودولية)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                                <Check size={14} className="text-emerald-400 shrink-0" />
                                <span>كروت ميزة الوطنية (Meeza)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                                <Check size={14} className="text-emerald-400 shrink-0" />
                                <span>محافظ فودافون كاش وجميع المحافظ</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                                <Check size={14} className="text-emerald-400 shrink-0" />
                                <span>تفعيل تلقائي ولحظي للاشتراك</span>
                            </div>
                        </div>

                        {/* Notice & Direct Pay Button */}
                        <div className="pt-2 space-y-3">
                            <span className="text-[11px] text-slate-400 block leading-relaxed">
                                سيتم توجيهك بأمان لإتمام السداد، وسيتم تفعيل طلبك وتجديد اشتراك المتجر فوراً وبشكل تلقائي.
                            </span>

                            <button
                                type="button"
                                onClick={handlePay}
                                disabled={processing}
                                className="w-full py-3.5 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 cursor-pointer transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                            >
                                <Sparkles size={18} />
                                <span>متابعة السداد والتفعيل الآن ({formatNumber(transaction.amount)} ج.م)</span>
                            </button>
                        </div>
                    </div>

                    {/* Security Footer */}
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs pt-1">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>جميع المعاملات مشفرة ومحمية بمعايير الأمان البنكية PCI DSS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
