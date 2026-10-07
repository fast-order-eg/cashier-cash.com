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
    X,
    ChevronDown,
    FileSpreadsheet,
    UploadCloud,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ products, categories, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');
    const [barcodeModalProduct, setBarcodeModalProduct] = useState(null);
    
    // Bulk Import States
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState(null);

    // Item Edit / Delete States from Result Table
    const [editingItem, setEditingItem] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [actionNotice, setActionNotice] = useState(null);

    const handleDeleteImportedItem = async (item) => {
        if (!item.id) {
            setImportResult(prev => ({
                ...prev,
                items: prev.items.filter(i => i !== item),
            }));
            return;
        }

        if (!confirm(`هل أنت متأكد من حذف الصنف "${item.name}" من النظام؟`)) {
            return;
        }

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch(`/admin/products/${item.id}?ajax=1`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
            });

            if (res.ok) {
                setImportResult(prev => ({
                    ...prev,
                    created_count: item.status === 'new' ? Math.max(0, prev.created_count - 1) : prev.created_count,
                    existing_count: item.status === 'exists' ? Math.max(0, prev.existing_count - 1) : prev.existing_count,
                    items: prev.items.filter(i => i.id !== item.id),
                }));
                setActionNotice(`تم حذف الصنف "${item.name}" بنجاح.`);
                setTimeout(() => setActionNotice(null), 3000);
            } else {
                alert('تعذر حذف الصنف.');
            }
        } catch (e) {
            alert('حدث خطأ أثناء محاولة حذف الصنف.');
        }
    };

    const handleSaveEditedItem = async (e) => {
        e.preventDefault();
        if (!editingItem || !editingItem.id) return;

        setEditSaving(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append('name', editingItem.name);
            formData.append('barcode', editingItem.barcode);
            formData.append('retail_price', editingItem.retail_price);
            formData.append('cost_price', editingItem.cost_price || 0);
            formData.append('wholesale_price', editingItem.wholesale_price || editingItem.retail_price);
            formData.append('stock_quantity', editingItem.stock_quantity);

            const res = await fetch(`/admin/products/${editingItem.id}?ajax=1`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setImportResult(prev => ({
                    ...prev,
                    items: prev.items.map(i => i.id === editingItem.id ? {
                        ...i,
                        name: editingItem.name,
                        barcode: editingItem.barcode,
                        retail_price: editingItem.retail_price,
                        cost_price: editingItem.cost_price,
                        wholesale_price: editingItem.wholesale_price,
                        stock_quantity: editingItem.stock_quantity,
                    } : i),
                }));
                setActionNotice(`تم تعديل بيانات "${editingItem.name}" بنجاح.`);
                setTimeout(() => setActionNotice(null), 3000);
                setEditingItem(null);
            } else {
                alert(data.message || 'حدث خطأ أثناء حفظ التعديل.');
            }
        } catch (e) {
            alert('حدث خطأ أثناء الاتصال بالسيرفر.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setImportLoading(true);
        setImportError(null);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/admin/products/import?ajax=1', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setImportResult(data);
                setImportFile(null);
            } else {
                setImportError(data.message || 'حدث خطأ أثناء معالجة ملف الإكسيل، يرجى مراجعة محتويات الملف.');
            }
        } catch (err) {
            setImportError('حدث خطأ في الاتصال بالخادم أثناء رفع الملف. يرجى المحاولة مرة أخرى.');
        } finally {
            setImportLoading(false);
        }
    };

    const handleCloseImportModal = () => {
        const needsReload = !!importResult;
        setImportModalOpen(false);
        setImportResult(null);
        setImportError(null);
        setImportFile(null);
        setEditingItem(null);
        setActionNotice(null);
        if (needsReload) {
            router.reload();
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/products', {
            search,
            category_id: categoryId,
        }, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            router.delete(`/admin/products/${id}`);
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

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setImportModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition"
                        >
                            <FileSpreadsheet size={16} />
                            <span>رفع جماعي (إكسيل)</span>
                        </button>

                        <Link
                            href="/admin/products/create"
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                        >
                            <Plus size={16} />
                            <span>إضافة صنف جديد</span>
                        </Link>
                    </div>
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

                        <div className="relative">
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500"
                                style={{ backgroundImage: 'none' }}
                            >
                                <option value="">جميع الأقسام</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                        >
                            بحث وتصفية
                        </button>

                        <Link
                            href="/admin/products?low_stock=true"
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
                                        <td className="p-4 text-slate-300 font-mono">{formatCurrency(p.cost_price)}</td>
                                        <td className="p-4 font-bold text-emerald-400 font-mono text-sm">{formatCurrency(p.retail_price)}</td>
                                        <td className="p-4 text-indigo-400 font-mono font-semibold">{formatCurrency(p.wholesale_price)}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                p.stock_quantity < 0 
                                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                                    : p.stock_quantity <= p.min_stock_alert 
                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                                        : 'bg-slate-800 text-white'
                                            }`}>
                                                {formatNumber(p.stock_quantity)} {p.unit}
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
                                                    href={`/admin/products/${p.id}/edit`}
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
                            <div className="font-black text-sm text-gray-900 mt-1">{formatCurrency(barcodeModalProduct.retail_price)}</div>
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

            {/* Bulk Excel Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 text-right max-h-[90vh] flex flex-col">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl border ${
                                    importResult 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : importError 
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {importResult ? <CheckCircle2 size={20} /> : importError ? <AlertCircle size={20} /> : <FileSpreadsheet size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-base">
                                        {importResult ? 'تقرير نتيجة الرفع الجماعي' : 'رفع الأصناف جماعياً عبر الإكسيل'}
                                    </h3>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        {importResult ? 'تم الانتهاء من فحص ومعالجة ملف الإكسيل' : 'أضف مئات الأصناف دفعة واحدة بملف إكسيل جاهز'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCloseImportModal} 
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1">
                            
                            {/* State 1: Loading */}
                            {importLoading && (
                                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                                            <UploadCloud size={24} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-white">جاري رفع ومعالجة ملف الإكسيل...</h4>
                                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                            يرجى الانتظار، جاري قراءة الأصناف، مطابقة الأسعار، وتحديث المخزون وقاعدة البيانات بدقة.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* State 2: Result Report */}
                            {!importLoading && importResult && (
                                <div className="space-y-4">
                                    
                                    {/* Action Toast Notice if an item was edited or deleted */}
                                    {actionNotice && (
                                        <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                                            <span>✓ {actionNotice}</span>
                                        </div>
                                    )}

                                    {/* Result Banner */}
                                    <div className={`p-4 rounded-2xl border flex items-center gap-3 text-right ${
                                        importResult.created_count > 0 
                                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                                            : 'bg-amber-500/10 border-amber-500/30'
                                    }`}>
                                        <div className={`p-2 rounded-xl shrink-0 ${
                                            importResult.created_count > 0 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                            {importResult.created_count > 0 ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className={`text-sm font-bold ${
                                                importResult.created_count > 0 ? 'text-emerald-300' : 'text-amber-300'
                                            }`}>
                                                {importResult.created_count > 0 ? 'تمت إضافة الأصناف الجديدة بنجاح!' : 'لم تتم إضافة أصناف جديدة'}
                                            </h4>
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                {importResult.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stat Cards Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 text-center space-y-1">
                                            <span className="text-[11px] text-emerald-400 font-bold block">أصناف جديدة</span>
                                            <span className="text-2xl font-black text-white block">+{importResult.created_count}</span>
                                            <span className="text-[10px] text-emerald-400/80 block">تمت إضافتها للنظام</span>
                                        </div>

                                        <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3.5 text-center space-y-1">
                                            <span className="text-[11px] text-amber-400 font-bold block">موجودة مسبقاً</span>
                                            <span className="text-2xl font-black text-amber-300 block">{importResult.existing_count ?? 0}</span>
                                            <span className="text-[10px] text-amber-400/80 block">تم تخطيها (لم تعدل)</span>
                                        </div>

                                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1">
                                            <span className="text-[11px] text-slate-400 font-bold block">إجمالي الصفوف</span>
                                            <span className="text-2xl font-black text-white block">{importResult.total_rows}</span>
                                            <span className="text-[10px] text-slate-500 block">تم فحصها بالكامل</span>
                                        </div>
                                    </div>

                                    {/* Skipped Rows Alert if any */}
                                    {importResult.skipped_count > 0 && (
                                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-right space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                                <AlertTriangle size={14} className="text-amber-400" />
                                                <span>صفوف تم تخطيها لعدم اكتمال بياناتها ({importResult.skipped_count} صف):</span>
                                            </div>
                                            {importResult.skipped_reasons && importResult.skipped_reasons.length > 0 && (
                                                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                                                    {importResult.skipped_reasons.map((reason, idx) => (
                                                        <li key={idx}>{reason}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {/* Items Table with Actions */}
                                    {importResult.items && importResult.items.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                                <span>جدول الأصناف المعالجة في الملف ({importResult.items.length} صنف):</span>
                                                <span className="text-[11px] text-indigo-400 font-normal">يمكنك تعديل أو حذف (X) أي صنف مضاف</span>
                                            </div>
                                            <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                                                <table className="w-full text-right text-xs">
                                                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                                                        <tr>
                                                            <th className="p-2.5 font-bold">اسم الصنف</th>
                                                            <th className="p-2.5 font-bold">الباركود</th>
                                                            <th className="p-2.5 font-bold">سعر البيع</th>
                                                            <th className="p-2.5 font-bold">الرصيد</th>
                                                            <th className="p-2.5 font-bold">حالة الصنف</th>
                                                            <th className="p-2.5 font-bold text-center">إجراءات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                                                        {importResult.items.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                                                                <td className="p-2.5 font-bold text-white max-w-[130px] truncate" title={item.name}>
                                                                    {item.name}
                                                                </td>
                                                                <td className="p-2.5 font-mono text-[11px] text-slate-400">
                                                                    {item.barcode || '—'}
                                                                </td>
                                                                <td className="p-2.5 font-bold text-emerald-400">
                                                                    {formatCurrency(item.retail_price)}
                                                                </td>
                                                                <td className="p-2.5 font-bold text-white">
                                                                    {Math.round(item.stock_quantity ?? 0)}
                                                                </td>
                                                                <td className="p-2.5 whitespace-nowrap">
                                                                    {item.status === 'new' ? (
                                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                            تمت الإضافة بنجاح
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                            موجود مسبقاً (تم تخطيه)
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-2.5 whitespace-nowrap text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingItem({ ...item })}
                                                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                                                                            title="تعديل بيانات الصنف"
                                                                        >
                                                                            <Edit size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteImportedItem(item)}
                                                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                                                                            title="حذف الصنف (X)"
                                                                        >
                                                                            <X size={13} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleCloseImportModal}
                                            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
                                        >
                                            <CheckCircle2 size={17} />
                                            <span>تم، حفظ وإغلاق وعرض الأصناف في الجدول</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Edit Popup Modal for specific item */}
                            {editingItem && (
                                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4 text-right shadow-2xl animate-in zoom-in-95 duration-150">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                    <Edit size={16} />
                                                </div>
                                                <h4 className="font-black text-white text-sm">تعديل بيانات الصنف</h4>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setEditingItem(null)}
                                                className="text-slate-400 hover:text-white"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSaveEditedItem} className="space-y-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم الصنف</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.name}
                                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-300 mb-1">الباركود</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.barcode}
                                                    onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-300 mb-1">سعر الشراء (التكلفة)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editingItem.cost_price ?? ''}
                                                        onChange={(e) => setEditingItem({ ...editingItem, cost_price: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-300 mb-1">سعر البيع قطاعي</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editingItem.retail_price}
                                                        onChange={(e) => setEditingItem({ ...editingItem, retail_price: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-300 mb-1">الرصيد الأولي بالمخزن (بدون قروش)</label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={editingItem.stock_quantity ?? 0}
                                                    onChange={(e) => setEditingItem({ ...editingItem, stock_quantity: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    required
                                                />
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={editSaving}
                                                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                                                >
                                                    {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingItem(null)}
                                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* State 3: Upload Form & Error View */}
                            {!importLoading && !importResult && (
                                <div className="space-y-4">
                                    
                                    {/* Error Banner if any */}
                                    {importError && (
                                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-right">
                                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-rose-300">فشل في استيراد الأصناف</h4>
                                                <p className="text-xs text-rose-400 leading-relaxed">{importError}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Download Template Banner */}
                                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <span>تحميل النموذج الاسترشادي</span>
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-normal">جاهز ومُعبأ بأمثلة</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                قم بتحميل نموذج الإكسيل الجاهز، املأ بيانات أصنافك بنفس الترتيب، ثم ارفعه هنا.
                                            </p>
                                        </div>
                                        <a
                                            href="/admin/products/template/download"
                                            className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                                        >
                                            <Download size={15} />
                                            <span>تحميل النموذج</span>
                                        </a>
                                    </div>

                                    {/* Upload Form */}
                                    <form onSubmit={handleImportSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-300">
                                                اختر ملف الإكسيل (.xlsx, .csv)
                                            </label>
                                            <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition bg-slate-950/50 group">
                                                <input
                                                    type="file"
                                                    accept=".xlsx, .xls, .csv"
                                                    onChange={(e) => {
                                                        setImportFile(e.target.files[0] || null);
                                                        setImportError(null);
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    required
                                                />
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="p-3 rounded-2xl bg-slate-800 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 transition">
                                                        <UploadCloud size={28} />
                                                    </div>
                                                    {importFile ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-emerald-400">{importFile.name}</p>
                                                            <p className="text-[11px] text-slate-500">{(importFile.size / 1024).toFixed(1)} ك.ب</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-slate-300">اسحب الملف وأفلته هنا أو اضغط للاختيار</p>
                                                            <p className="text-[11px] text-slate-500">يدعم صيغ .xlsx أو .csv</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tips */}
                                        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                                            <p className="font-bold text-slate-300">ملاحظات هامة عند التعبئة:</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                                                <li>التعرف الذكي: يتعرف النظام تلقائياً على الأعمدة (الاسم، الباركود، التكلفة، البيع، الرصيد).</li>
                                                <li>الأقسام غير الموجودة سيتم إنشاؤها تلقائياً.</li>
                                                <li>إذا تركت الباركود فارغاً، فسيتم توليد باركود فريد للصنف تلقائياً.</li>
                                                <li>إذا كان الصنف موجوداً بنفس الباركود أو الاسم، سيتم تحديث أسعاره ومخزونه.</li>
                                                <li>الرصيد الأولي سيضاف مباشرة في المخزن الرئيسي كأرقام صحيحة بدون قروش.</li>
                                            </ul>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-2.5 pt-2">
                                            <button
                                                type="submit"
                                                disabled={importLoading || !importFile}
                                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                                            >
                                                <UploadCloud size={16} />
                                                <span>بدء الرفع والاستيراد</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCloseImportModal}
                                                disabled={importLoading}
                                                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
