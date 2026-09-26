import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Plus, 
    Search, 
    Filter, 
    Edit, 
    Trash2, 
    Barcode, 
    Package, 
    AlertTriangle,
    Printer,
    X
} from 'lucide-react';

export default function Index({ products, categories, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');
    const [barcodeModalProduct, setBarcodeModalProduct] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.products.index'), {
            search,
            category_id: categoryId,
        }, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            router.delete(route('admin.products.destroy', id));
        }
    };

    const handlePrintBarcode = () => {
        window.print();
    };

    return (
        <MerchantLayout title="الأصناف والمخزون">
            <Head title="إدارة الأصناف والمخزون" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">الأصناف والمخزون</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            إدارة بيانات المنتجات، أسعار البيع قطاعي وجملة، وسعر الشراء، والباركود
                        </p>
                    </div>

                    <Link
                        href={route('admin.products.create')}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <Plus size={16} />
                        <span>إضافة صنف جديد</span>
                    </Link>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ابحث باسم الصنف أو الباركود..."
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">جميع الأقسام</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                        >
                            بحث وتصفية
                        </button>

                        <Link
                            href={route('admin.products.index', { low_stock: true })}
                            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <AlertTriangle size={14} />
                            <span>النواقص</span>
                        </Link>
                    </form>
                </div>

                {/* Products Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">الصنف والباركود</th>
                                    <th className="p-4 font-semibold">القسم</th>
                                    <th className="p-4 font-semibold">سعر الشراء (التكلفة)</th>
                                    <th className="p-4 font-semibold">سعر البيع قطاعي</th>
                                    <th className="p-4 font-semibold">سعر الجملة (المناديب)</th>
                                    <th className="p-4 font-semibold">الرصيد الإجمالي</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {products.data.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-850/40 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{p.name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                <Barcode size={14} className="text-indigo-400" />
                                                <span>{p.barcode}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                                                {p.category?.name || 'عام'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 font-mono">{Number(p.cost_price).toFixed(2)} ج.م</td>
                                        <td className="p-4 font-bold text-emerald-400 font-mono text-sm">{Number(p.retail_price).toFixed(2)} ج.م</td>
                                        <td className="p-4 text-indigo-400 font-mono font-semibold">{Number(p.wholesale_price).toFixed(2)} ج.م</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                p.stock_quantity < 0 
                                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                                    : p.stock_quantity <= p.min_stock_alert 
                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                                        : 'bg-slate-800 text-white'
                                            }`}>
                                                {p.stock_quantity} {p.unit}
                                            </span>
                                            {p.stock_quantity < 0 && (
                                                <div className="text-[10px] text-rose-400 mt-1">مباع أوفلاين بالسالب</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setBarcodeModalProduct(p)}
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                                    title="طباعة ستيكر الباركود"
                                                >
                                                    <Barcode size={15} />
                                                </button>
                                                <Link
                                                    href={route('admin.products.edit', p.id)}
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                                                    title="تعديل الصنف"
                                                >
                                                    <Edit size={15} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {products.links && products.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-1">
                            {products.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        link.active 
                                            ? 'bg-indigo-600 text-white' 
                                            : link.url 
                                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                                : 'text-slate-600 cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Barcode Print Modal */}
            {barcodeModalProduct && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">معاينة ستيكر الباركود</span>
                            <button onClick={() => setBarcodeModalProduct(null)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Printable Barcode Label */}
                        <div id="printable-barcode" className="bg-white text-black p-4 rounded-xl border border-gray-300 space-y-1 mx-auto max-w-[220px]">
                            <div className="font-bold text-xs truncate">{barcodeModalProduct.name}</div>
                            <div className="text-xs text-gray-600 font-mono tracking-widest py-1 border-y border-dashed border-gray-400">
                                ||| | | |||| | ||| | ||
                            </div>
                            <div className="font-mono text-[11px] font-bold">{barcodeModalProduct.barcode}</div>
                            <div className="font-black text-sm text-gray-900 mt-1">{barcodeModalProduct.retail_price} ج.م</div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handlePrintBarcode}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                            >
                                <Printer size={15} />
                                <span>طباعة الستيكر</span>
                            </button>
                            <button
                                onClick={() => setBarcodeModalProduct(null)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
