import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    ShoppingBag,
    Truck,
    Download,
    Printer,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Gauge,
    PieChart
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ summary, top_products, filters }) {
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    const handleFilter = (e) => {
        e.preventDefault();
        router.get('/admin/reports', {
            from_date: fromDate,
            to_date: toDate,
        }, {
            preserveState: true,
        });
    };

    const setQuickDate = (type) => {
        const today = new Date().toISOString().split('T')[0];
        let from = today;

        if (type === 'today') {
            from = today;
        } else if (type === 'month') {
            const date = new Date();
            from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        } else if (type === 'year') {
            const date = new Date();
            from = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
        }

        setFromDate(from);
        setToDate(today);

        router.get('/admin/reports', {
            from_date: from,
            to_date: today,
        }, {
            preserveState: true,
        });
    };

    return (
        <MerchantLayout title="التقارير المالية والأرباح والخسائر">
            <Head title="التقارير المالية" />

            <div className="space-y-6">
                {/* Header & Date Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-indigo-400" />
                            التقارير المالية وحساب الأرباح والخسائر
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            تحليل دقيق للإيرادات، التكاليف، المصروفات، وصافي الأرباح من مبيعات الكاشير وسيارات المناديب
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={`/admin/reports/export-excel?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            تصدير Excel
                        </a>
                        <a
                            href={`/admin/reports/export-pdf?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            طباعة / PDF
                        </a>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">من:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">إلى:</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                        >
                            تطبيق
                        </button>
                    </form>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">فترات سريعة:</span>
                        <button
                            type="button"
                            onClick={() => setQuickDate('today')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition"
                        >
                            اليوم
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickDate('month')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition"
                        >
                            هذا الشهر
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickDate('year')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition"
                        >
                            هذه السنة
                        </button>
                    </div>
                </div>

                {/* Primary Financial Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total Sales */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                            <span>إجمالي المبيعات</span>
                            <DollarSign className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-black text-white font-mono">
                            {formatNumber(summary.total_sales)}
                            <span className="text-xs font-normal text-slate-400 mr-1">ج.م</span>
                        </div>
                        <div className="text-[11px] text-indigo-400 mt-2 flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> قطاعي + جملة
                        </div>
                    </div>

                    {/* Cost of Goods */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                            <span>تكلفة البضاعة المباعة</span>
                            <TrendingDown className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-2xl font-black text-amber-400 font-mono">
                            {formatNumber(summary.total_cost)}
                            <span className="text-xs font-normal text-slate-400 mr-1">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">
                            سعر شراء البضاعة
                        </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                            <span>مجمل الربح (Gross)</span>
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="text-2xl font-black text-cyan-400 font-mono">
                            {formatNumber(summary.gross_profit)}
                            <span className="text-xs font-normal text-slate-400 mr-1">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">
                            المبيعات - تكلفة البضاعة
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                            <span>المصروفات العامة</span>
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="text-2xl font-black text-rose-400 font-mono">
                            {formatNumber(summary.total_expenses)}
                            <span className="text-xs font-normal text-slate-400 mr-1">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">
                            كهرباء، بنزين، إيجار، رواتب
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-emerald-950/20">
                        <div className="flex items-center justify-between text-emerald-300 text-xs mb-2 font-bold">
                            <span>صافي الربح الحقيقي</span>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className={`text-2xl font-black font-mono ${summary.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatNumber(summary.net_profit)}
                            <span className="text-xs font-normal text-slate-400 mr-1">ج.م</span>
                        </div>
                        <div className="text-[11px] text-emerald-400/80 mt-2">
                            الربح بعد خصم كل المصاريف
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cash vs Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                            توزيع طرق الدفع
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium">كاش نقدي</span>
                                    <span className="text-emerald-400 font-mono font-bold">
                                        {formatCurrency(summary.cash_sales)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full"
                                        style={{
                                            width: `${summary.total_sales > 0 ? (summary.cash_sales / summary.total_sales) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium">بطاقة فيزا / إلكتروني</span>
                                    <span className="text-indigo-400 font-mono font-bold">
                                        {formatCurrency(summary.card_sales)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full"
                                        style={{
                                            width: `${summary.total_sales > 0 ? (summary.card_sales / summary.total_sales) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Retail vs Wholesale */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-cyan-400" />
                            قنوات البيع
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium">مبيعات الكاشير بالمحل (قطاعي)</span>
                                    <span className="text-cyan-400 font-mono font-bold">
                                        {formatCurrency(summary.retail_sales)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-cyan-500 h-2 rounded-full"
                                        style={{
                                            width: `${summary.total_sales > 0 ? (summary.retail_sales / summary.total_sales) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium">مبيعات سيارات المناديب (جملة)</span>
                                    <span className="text-purple-400 font-mono font-bold">
                                        {formatCurrency(summary.wholesale_sales)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{
                                            width: `${summary.total_sales > 0 ? (summary.wholesale_sales / summary.total_sales) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fleet Metrics */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-400" />
                            أسطول سيارات المناديب
                        </h3>
                        <div className="flex items-center justify-between p-4 bg-slate-850 rounded-xl">
                            <div>
                                <div className="text-xs text-slate-400">إجمالي المسافات المقطوعة</div>
                                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                                    {formatNumber(summary.total_km_driven)} <span className="text-xs font-normal text-slate-400">كم</span>
                                </div>
                            </div>
                            <Gauge className="w-10 h-10 text-amber-500/30" />
                        </div>
                    </div>
                </div>

                {/* Top 10 Products Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-indigo-400" />
                            الأصناف الأكثر مبيعاً وتحقيقاً للإيرادات (Top 10)
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">#</th>
                                    <th className="p-4 font-semibold">اسم الصنف</th>
                                    <th className="p-4 font-semibold">إجمالي الكمية المباعة</th>
                                    <th className="p-4 font-semibold">إجمالي الإيرادات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {top_products.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-500 text-sm">
                                            لا توجد بيانات مبيعات في هذه الفترة المحددة.
                                        </td>
                                    </tr>
                                ) : (
                                    top_products.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4 text-slate-500 font-mono font-bold">{idx + 1}</td>
                                            <td className="p-4 text-white font-bold text-sm">{item.product_name}</td>
                                            <td className="p-4 font-mono text-slate-200">
                                                {formatNumber(item.total_qty)} قطعة
                                            </td>
                                            <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                                                {formatCurrency(item.total_revenue)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
}
