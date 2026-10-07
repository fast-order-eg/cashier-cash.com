import React from 'react';
import { Link } from '@inertiajs/react';
import { ShieldAlert, CreditCard, X, ChevronLeft, ArrowLeft } from 'lucide-react';

export default function SubscriptionExpiredModal({
    isOpen,
    onClose,
    title = 'تنبيه: انتهت فترة اشتراك المتجر',
    message = 'انتهت فترة اشتراك متجرك (أو انتهت الـ 7 أيام التجريبية المجانية). لاستئناف عمليات البيع، فتح الورديات، وإضافة الأصناف والبيانات، يرجى تجديد الاشتراك وتفعيل باقة المتجر.',
    actionUrl = '/admin/subscriptions',
    actionText = 'تجديد الاشتراك الآن',
}) {
    if (!isOpen) return null;

    return (
        <div 
            id="subscription-expired-modal"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
            dir="rtl"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-right overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background glow */}
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 left-5 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="إغلاق"
                >
                    <X size={18} />
                </button>

                {/* Icon Header */}
                <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-13 h-13 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/10 p-3">
                        <ShieldAlert size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/30 mb-1">
                            العملية معلقة مؤقتاً
                        </div>
                        <h3 className="text-lg font-black text-white">{title}</h3>
                    </div>
                </div>

                {/* Body Message */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <a
                        href={actionUrl}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <CreditCard size={17} />
                        <span>{actionText}</span>
                        <ChevronLeft size={16} />
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}
