import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Package, ArrowRight, Barcode, DollarSign, Layers } from 'lucide-react';

export default function Edit({ product, categories }) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: product.name,
        category_id: product.category_id || '',
        barcode: product.barcode,
        cost_price: product.cost_price,
        retail_price: product.retail_price,
        wholesale_price: product.wholesale_price,
        min_stock_alert: product.min_stock_alert,
        unit: product.unit || 'قطعة',
        is_active: product.is_active,
        image: null,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.products.update', product.id));
    };

    return (
        <MerchantLayout title={`تعديل الصنف: ${product.name}`}>
            <Head title={`تعديل ${product.name}`} />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.products.index')}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <ArrowRight size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white">تعديل بيانات الصنف</h1>
                        <p className="text-slate-400 text-xs mt-0.5">تحديث أسعار البيع والتكلفة والباركود</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Package size={16} className="text-indigo-400" />
                            <span>البيانات الأساسية</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الصنف</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">القسم</label>
                                <select
                                    value={data.category_id}
                                    onChange={(e) => setData('category_id', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">وحدة البيع</label>
                                <input
                                    type="text"
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الباركود</label>
                                <input
                                    type="text"
                                    required
                                    value={data.barcode}
                                    onChange={(e) => setData('barcode', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 text-left"
                                    dir="ltr"
                                />
                                {errors.barcode && <p className="text-rose-400 text-xs mt-1">{errors.barcode}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Pricing Grid */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <DollarSign size={16} className="text-emerald-400" />
                            <span>منظومة الأسعار والتكلفة</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    سعر الشراء (التكلفة)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={data.cost_price}
                                    onChange={(e) => setData('cost_price', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    سعر البيع قطاعي (الكاشير)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={data.retail_price}
                                    onChange={(e) => setData('retail_price', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    سعر الجملة (المناديب)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={data.wholesale_price}
                                    onChange={(e) => setData('wholesale_price', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-indigo-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock Alert */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Layers size={16} className="text-amber-400" />
                            <span>حد التنبيه والحالة</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    حد التنبيه عند نقص الكمية
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.min_stock_alert}
                                    onChange={(e) => setData('min_stock_alert', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                                    />
                                    <span className="text-xs font-semibold text-white">صنف نشط ومتاح للبيع</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                        <Link
                            href={route('admin.products.index')}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
                        >
                            إلغاء
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                        >
                            {processing ? 'جاري التحديث...' : 'حفظ التعديلات'}
                        </button>
                    </div>
                </form>
            </div>
        </MerchantLayout>
    );
}
