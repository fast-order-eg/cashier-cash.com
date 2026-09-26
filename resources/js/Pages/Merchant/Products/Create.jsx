import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Package, ArrowRight, Barcode, DollarSign, Layers } from 'lucide-react';

export default function Create({ categories }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        category_id: categories[0]?.id || '',
        barcode: '',
        cost_price: '',
        retail_price: '',
        wholesale_price: '',
        stock_quantity: 0,
        min_stock_alert: 5,
        unit: 'قطعة',
        image: null,
    });

    const generateRandomBarcode = () => {
        const rand = '622' + Math.floor(100000000 + Math.random() * 900000000);
        setData('barcode', rand);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.products.store'));
    };

    return (
        <MerchantLayout title="إضافة صنف جديد">
            <Head title="إضافة صنف جديد" />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.products.index')}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <ArrowRight size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white">إضافة صنف جديد</h1>
                        <p className="text-slate-400 text-xs mt-0.5">تسجيل الأسعار (قطاعي وجملة وتكلفة) والباركود والمخزون</p>
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
                                    placeholder="مثال: شاي العروسة ناعم 250 جم"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                                    placeholder="قطعة، كرتونة، كيس، كيلو"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الباركود</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={data.barcode}
                                        onChange={(e) => setData('barcode', e.target.value)}
                                        placeholder="امسح بالباركود أو اترك فارغاً للتوليد التلقائي"
                                        className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 text-left"
                                        dir="ltr"
                                    />
                                    <button
                                        type="button"
                                        onClick={generateRandomBarcode}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold transition"
                                    >
                                        توليد عشوائي
                                    </button>
                                </div>
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
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                                {errors.cost_price && <p className="text-rose-400 text-xs mt-1">{errors.cost_price}</p>}
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
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                                />
                                {errors.retail_price && <p className="text-rose-400 text-xs mt-1">{errors.retail_price}</p>}
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
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-indigo-400 font-bold font-mono focus:outline-none focus:border-indigo-500"
                                />
                                {errors.wholesale_price && <p className="text-rose-400 text-xs mt-1">{errors.wholesale_price}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Stock & Inventory */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Layers size={16} className="text-amber-400" />
                            <span>المخزون الأولي والتنبيهات</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    الرصيد الأولي (في المخزن الرئيسي)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={data.stock_quantity}
                                    onChange={(e) => setData('stock_quantity', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                                {errors.stock_quantity && <p className="text-rose-400 text-xs mt-1">{errors.stock_quantity}</p>}
                            </div>

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
                            {processing ? 'جاري الحفظ...' : 'حفظ وإضافة الصنف'}
                        </button>
                    </div>
                </form>
            </div>
        </MerchantLayout>
    );
}
