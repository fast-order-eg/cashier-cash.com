import React from 'react';
import { Head } from '@inertiajs/react';
import { CheckCircle2, ArrowLeft, Store, Sparkles } from 'lucide-react';

export default function PaymentSuccess({ tenant, storeUrl, subscription }) {
    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-6">
            <Head title="تم تفعيل المتجر بنجاح!" />

            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white">مبروك! تم تفعيل متجرك بنجاح 🎉</h1>
                    <p className="text-slate-400 text-sm">
                        تم استلام الدفعة وتفعيل اشتراكك في منصة Casher فورياً.
                    </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-right space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-400">اسم المتجر:</span>
                        <span className="font-bold text-white">{tenant.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">رابط المتجر:</span>
                        <span className="font-mono text-indigo-400 text-left" dir="ltr">{tenant.slug}.casher.com</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">حالة الاشتراك:</span>
                        <span className="text-emerald-400 font-bold">نشط</span>
                    </div>
                </div>

                <a
                    href={storeUrl}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
                >
                    <span>الدخول إلى لوحة تحكم المتجر</span>
                    <ArrowLeft size={16} />
                </a>
            </div>
        </div>
    );
}
