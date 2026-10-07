import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    FileText, 
    Search, 
    Filter, 
    ExternalLink, 
    DollarSign,
    Calendar,
    User,
    ChevronDown
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ invoices, total_sales, filters, selectedShift }) {
    const [search, setSearch] = useState(filters.search || '');
    const [type, setType] = useState(filters.type || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    const handleFilter = (e) => {
        e.preventDefault();
        router.get('/admin/invoices', {
            search,
            type,
            from_date: fromDate,
            to_date: toDate,
            ...(filters.shift_id ? { shift_id: filters.shift_id } : {}),
            ...(filters.cashier_id ? { cashier_id: filters.cashier_id } : {}),
        }, { preserveState: true });
    };

    return (
        <MerchantLayout title="فواتير المبيعات">
            <Head title="سجل فواتير المبيعات" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">فواتير المبيعات</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            سجل جميع فواتير البيع (كاشير قطاعي ومبيعات سيارات الجملة)
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                        <span className="text-slate-400 text-xs">إجمالي المبيعات المفلترة:</span>
                        <span className="text-emerald-400 font-mono font-black text-lg">
                            {formatCurrency(total_sales)}
                        </span>
                    </div>
                </div>

                {/* Selected Shift Context Banner */}
                {selectedShift && (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-white text-sm">فواتير الوردية رقم #{selectedShift.id}</span>
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        selectedShift.status === 'open' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                        {selectedShift.status === 'open' ? 'وردية مفتوحة' : 'وردية مغلقة'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                    <span>الكاشير المسؤول: <strong className="text-white">{selectedShift.cashier?.name}</strong></span>
                                    <span>•</span>
                                    <span>وقت الفتح: {formatDateTime(selectedShift.opened_at)}</span>
                                    {selectedShift.closed_at && (
                                        <>
                                            <span>•</span>
                                            <span>وقت الإغلاق: {formatDateTime(selectedShift.closed_at)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/admin/invoices"
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold self-start sm:self-auto transition flex items-center gap-1.5"
                        >
                            <span>عرض كافة الفواتير (إلغاء فلتر الوردية)</span>
                            <span>✕</span>
                        </Link>
                    </div>
                )}

                {/* Filter Form */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500"
                                style={{ backgroundImage: 'none' }}
                            >
                                <option value="">جميع الأنواع</option>
                                <option value="retail">كاشير قطاعي</option>
                                <option value="wholesale">مندوب جملة</option>
                            </select>
                            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />

                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        />

                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                        >
                            تصفية
                        </button>
                    </form>
                </div>

                {/* Invoices Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">رقم الفاتورة</th>
                                    <th className="p-4 font-semibold">نوع البيع</th>
                                    <th className="p-4 font-semibold">المسؤول</th>
                                    <th className="p-4 font-semibold">العميل</th>
                                    <th className="p-4 font-semibold">طريقة الدفع</th>
                                    <th className="p-4 font-semibold">المبلغ الإجمالي</th>
                                    <th className="p-4 font-semibold">التاريخ والوقت</th>
                                    <th className="p-4 font-semibold text-center">عرض</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {invoices.data.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-850/40 transition">
                                        <td className="p-4">
                                            <div className="font-mono font-bold text-white text-sm">{inv.invoice_number}</div>
                                            {inv.is_offline_sync && (
                                                <span className="text-[10px] text-amber-400">أُنشئت أوفلاين وتمت المزامنة</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                inv.type === 'retail' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                            }`}>
                                                {inv.type === 'retail' ? 'كاشير قطاعي' : 'مندوب جملة'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 font-medium">
                                            {inv.cashier?.name || inv.sales_rep?.name || 'المدير'}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {inv.customer_name || 'عميل نقدي'}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                                                {inv.payment_method === 'cash' ? 'نقدي' : 'فيزا'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {formatDateTime(inv.created_at)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                href={`/admin/invoices/${inv.id}`}
                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-block"
                                                title="عرض الفاتورة"
                                            >
                                                <ExternalLink size={15} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {invoices.links && invoices.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-1">
                            {invoices.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        link.active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MerchantLayout>
    );
}
