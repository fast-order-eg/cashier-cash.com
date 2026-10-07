import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Package, ArrowRight, Barcode, DollarSign, Layers, Plus, ChevronDown, FolderTree, X, Check } from 'lucide-react';

export default function Create({ categories = [] }) {
    const [categoryList, setCategoryList] = useState(categories || []);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [categoryError, setCategoryError] = useState('');

    const presetColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        category_id: categories[0]?.id || '',
        barcode: '',
        cost_price: '',
        retail_price: '',
        wholesale_price: '',
        stock_quantity: 100,
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
        post('/admin/products');
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) {
            setCategoryError('يرجى كتابة اسم القسم أولاً');
            return;
        }
        setCreatingCategory(true);
        setCategoryError('');
        try {
            const res = await window.axios.post('/admin/categories?json=1', {
                name: newCategoryName.trim(),
                color: newCategoryColor,
            });
            if (res.data && res.data.success && res.data.category) {
                const created = res.data.category;
                setCategoryList((prev) => [...prev, created]);
                setData('category_id', created.id);
                setShowCategoryModal(false);
                setNewCategoryName('');
                setNewCategoryColor('#3B82F6');
            } else {
                setCategoryError('تعذر إضافة القسم، يرجى المحاولة مرة أخرى');
            }
        } catch (err) {
            console.error(err);
            setCategoryError(err.response?.data?.message || 'حدث خطأ أثناء إضافة القسم');
        } finally {
            setCreatingCategory(false);
        }
    };

    return (
        <MerchantLayout title="إضافة صنف جديد">
            <Head title="إضافة صنف جديد" />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/products"
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
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <select
                                            value={data.category_id}
                                            onChange={(e) => setData('category_id', e.target.value)}
                                            className="w-full appearance-none bg-slate-950 border border-slate-700/80 rounded-2xl pr-4 pl-10 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer text-right"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {categoryList.length === 0 ? (
                                                <option value="" disabled className="bg-slate-900 text-slate-400">
                                                    لا توجد أقسام مسجلة - أضف قسماً
                                                </option>
                                            ) : (
                                                categoryList.map((c) => (
                                                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                                        {c.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <ChevronDown 
                                            size={16} 
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" 
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCategoryError('');
                                            setShowCategoryModal(true);
                                        }}
                                        className="px-3.5 py-2.5 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                                        title="إضافة قسم جديد فوراً"
                                    >
                                        <Plus size={15} />
                                        <span className="hidden sm:inline">قسم جديد</span>
                                    </button>
                                </div>
                                {errors.category_id && <p className="text-rose-400 text-xs mt-1">{errors.category_id}</p>}
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
                                    step="1"
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
                                    step="1"
                                    value={data.min_stock_alert}
                                    onChange={(e) => setData('min_stock_alert', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                        <Link
                            href="/admin/products"
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

            {/* نافذة إضافة قسم جديد من داخل الصفحة مباشرة */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                    <FolderTree size={16} />
                                </div>
                                <h3 className="font-bold text-white text-sm">
                                    إضافة قسم جديد
                                </h3>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowCategoryModal(false)} 
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم القسم</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="مثال: مشروبات ساخنة، معلبات، مخبوزات..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                {categoryError && <p className="text-rose-400 text-xs mt-1.5 font-medium">{categoryError}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">لون القسم في شاشة الكاشير</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {presetColors.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewCategoryColor(c)}
                                            className="w-7 h-7 rounded-full flex items-center justify-center transition border-2"
                                            style={{ backgroundColor: c, borderColor: newCategoryColor === c ? '#fff' : 'transparent' }}
                                        >
                                            {newCategoryColor === c && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryModal(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-750 text-xs font-semibold transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingCategory}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                                >
                                    {creatingCategory ? 'جاري الحفظ...' : 'حفظ وإضافة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
