import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { CreditCard, ShieldCheck, ArrowRight, Check } from 'lucide-react';

export default function Checkout({ tenant, subscription, plan, paymentData }) {
    const handlePayWithKashier = () => {
        // بناء رابط Kashier للدفع
        const kashierUrl = `${paymentData.baseUrl}/?merchantId=${paymentData.merchantId}&orderId=${paymentData.orderId}&amount=${paymentData.amount}&currency=${paymentData.currency}&hash=${paymentData.hash}&merchantRedirect=${encodeURIComponent(paymentData.callbackUrl)}&mode=${paymentData.mode}&allowedMethods=card,wallet&brandColor=%234F46E5`;
        
        window.location.href = kashierUrl;
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans py-16 px-6">
            <Head title="الدفع وتفعيل الاشتراك - Kashier" />

            <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                        <CreditCard size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-white">إتمام الدفع وتفعيل المتجر</h1>
                    <p className="text-slate-400 text-xs">الدفع الآمن بواسطة بوابة Kashier المعتمدة</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">اسم المتجر:</span>
                            <span className="font-bold text-white">{tenant.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">الرابط المخصص:</span>
                            <span className="font-mono text-indigo-400 text-xs" dir="ltr">{tenant.slug}.casher.com</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">الباقة المختارة:</span>
                            <span className="font-medium text-white">{plan.name} ({subscription.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'})</span>
                        </div>
                        {subscription.extra_employees_count > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">موظفين إضافيين:</span>
                                <span className="text-emerald-400 font-medium">+{subscription.extra_employees_count} مقاعد</span>
                            </div>
                        )}
                        <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                            <span className="font-bold text-white text-base">المبلغ المطلوب سداده:</span>
                            <span className="text-2xl font-black text-indigo-400">{paymentData.amount} ج.م</span>
                        </div>
                    </div>

                    <button
                        onClick={handlePayWithKashier}
                        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                    >
                        <CreditCard size={18} />
                        <span>ادفع الآن عبر Kashier ({paymentData.amount} ج.م)</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>معاملة مشفرة ومؤمنة بنسبة 100%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
