import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Settings, Store, Receipt, Percent, ShieldCheck } from 'lucide-react';

export default function Index({ tenant }) {
    const s = tenant.settings || {};

    const { data, setData, post, processing, errors } = useForm({
        name: tenant.name || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        address: tenant.address || '',
        currency: s.currency || 'ج.م',
        tax_rate: s.tax_rate ?? 14,
        tax_enabled: s.tax_enabled ?? false,
        tax_number: s.tax_number || '',
        receipt_header: s.receipt_header || 'أهلاً بكم - نسعد بخدمتكم',
        receipt_footer: s.receipt_footer || 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوم',
        allow_negative_stock: s.allow_negative_stock ?? true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/admin/settings');
    };

    return (
        <MerchantLayout title="إعدادات المتجر والفواتير">
            <Head title="إعدادات المتجر" />

            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-white">إعدادات المتجر والفواتير</h1>
                    <p className="text-slate-400 text-xs mt-1">
                        تخصيص بيانات المتجر، نسبة الضريبة، ونصوص رأس وتذييل الإيصال الحراري للكاشير
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                    {/* Store Profile */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Store size={16} className="text-indigo-400" />
                            <span>بيانات المتجر العامة</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1.5">اسم المتجر</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1.5">رقم الهاتف</label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-white"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block font-semibold text-slate-300 mb-1.5">العنوان</label>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Receipt Settings */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Receipt size={16} className="text-emerald-400" />
                            <span>تخصيص الإيصال الحراري (طابعة الكاشير 80mm / 58mm)</span>
                        </h2>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1.5">
                                    رسالة الترحيب أعلى الفاتورة (Header)
                                </label>
                                <input
                                    type="text"
                                    value={data.receipt_header}
                                    onChange={(e) => setData('receipt_header', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1.5">
                                    رسالة الشكر أسفل الفاتورة وسياسة الاسترجاع (Footer)
                                </label>
                                <input
                                    type="text"
                                    value={data.receipt_footer}
                                    onChange={(e) => setData('receipt_footer', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax & Negative Stock */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Percent size={16} className="text-amber-400" />
                            <span>إعدادات الضريبة وسياسة البيع أوفلاين</span>
                        </h2>

                        <div className="space-y-4 text-xs">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="tax_enabled"
                                    checked={data.tax_enabled}
                                    onChange={(e) => setData('tax_enabled', e.target.checked)}
                                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                                />
                                <label htmlFor="tax_enabled" className="text-slate-300 font-semibold cursor-pointer">
                                    تفعيل ضريبة القيمة المضافة على الفواتير
                                </label>
                            </div>

                            {data.tax_enabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-slate-300 mb-1.5">نسبة الضريبة (%)</label>
                                        <input
                                            type="number"
                                            value={data.tax_rate}
                                            onChange={(e) => setData('tax_rate', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-300 mb-1.5">الرقم الضريبي للمتجر</label>
                                        <input
                                            type="text"
                                            value={data.tax_number}
                                            onChange={(e) => setData('tax_number', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2 text-white font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-800/80">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.allow_negative_stock}
                                        onChange={(e) => setData('allow_negative_stock', e.target.checked)}
                                        className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 mt-0.5"
                                    />
                                    <div>
                                        <span className="font-bold text-white block">السماح بالبيع بالسالب في وضع الأوفلاين</span>
                                        <span className="text-slate-400 text-[11px] block mt-0.5">
                                            (موصى به) عند انقطاع الإنترنت، قد يبيع الكاشير بضاعة موجودة فعلياً ولكن رصيدها لم يُحدث في السيستم. تفعيل هذا الخيار يسمح بإتمام البيع أوفلاين مع إشعار تحذيري للأدمن في لوحة التحكم لمطابقة المخزون.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                        >
                            {processing ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </button>
                    </div>
                </form>
            </div>
        </MerchantLayout>
    );
}
