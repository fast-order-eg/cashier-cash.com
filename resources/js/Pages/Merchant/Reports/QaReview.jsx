import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    ShieldAlert, 
    Filter, 
    Search, 
    CheckCircle2, 
    XCircle, 
    Receipt, 
    TrendingUp, 
    TrendingDown, 
    Truck, 
    ArrowLeft,
    AlertCircle,
    Info,
    RotateCcw
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function QaReview({ records, stats, filters }) {
    const [type, setType] = useState(filters.type || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [search, setSearch] = useState(filters.search || '');

    const handleFilter = (e) => {
        e.preventDefault();
        router.get('/admin/reports/qa-review', {
            type,
            status,
            search,
        }, { preserveState: true });
    };

    const handleToggleStatus = (record) => {
        const nextIsTest = !record.is_test;
        const confirmMsg = nextIsTest
            ? `هل تريد عزل هذا السجل (${record.reference}) واستبعاده من التقارير التشغيلية؟`
            : `هل تريد إلغاء عزل هذا السجل (${record.reference}) وإعادته للتقارير التشغيلية؟`;

        if (confirm(confirmMsg)) {
            router.post('/admin/reports/qa-toggle', {
                type: record.type,
                id: record.id,
                is_test: nextIsTest,
            }, { preserveScroll: true });
        }
    };

    return (
        <MerchantLayout title="مراجعة وعزل بيانات الاختبار (QA Data Isolation)">
            <Head title="مراجعة بيانات الاختبار" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <ShieldAlert className="w-7 h-7 text-indigo-400" />
                            مراجعة وعزل بيانات الاختبار (QA Records)
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            آلية آمنة لعزل العمليات التجريبية عن التقارير المالية والتشغيلية الفعلية دون حذف أي بيانات
                        </p>
                    </div>

                    <Link
                        href="/admin/reports"
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
                    >
                        <ArrowLeft size={16} />
                        <span>العودة للتقارير المالية</span>
                    </Link>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">إجمالي السجلات المعزولة حالياً</span>
                            <div className="text-2xl font-black text-white mt-1">
                                {formatNumber(stats?.total_excluded_count || 0)} سجل
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <ShieldAlert size={20} />
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">مبيعات تجريبية معزولة (فواتير + رحلات)</span>
                            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                                {formatCurrency(stats?.excluded_sales || 0)}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                فواتير: {formatCurrency(stats?.excluded_invoices_sales || 0)} | رحلات: {formatCurrency(stats?.excluded_trips_sales || 0)}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">مصروفات تجريبية معزولة</span>
                            <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
                                {formatCurrency(stats?.excluded_expenses || 0)}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="بحث برقم الفاتورة، اسم العميل، البيان..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">كافة أنواع السجلات</option>
                            <option value="invoices">فواتير مبيعات</option>
                            <option value="expenses">مصروفات</option>
                            <option value="van_trips">رحلات مناديب</option>
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">كافة حالات العزل</option>
                            <option value="excluded">معزول من التقارير (QA)</option>
                            <option value="active">ضمن التشغيل الفعلي</option>
                        </select>

                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                            <Filter size={14} />
                            <span>تطبيق التصفية</span>
                        </button>
                    </form>
                </div>

                {/* Records Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">نوع السجل</th>
                                    <th className="p-4 font-semibold">المرجع / الرقم</th>
                                    <th className="p-4 font-semibold">البيان / الوصف</th>
                                    <th className="p-4 font-semibold">التاريخ</th>
                                    <th className="p-4 font-semibold">التأثير المالي على التقارير</th>
                                    <th className="p-4 font-semibold text-center">حالة العزل</th>
                                    <th className="p-4 font-semibold text-center">الإجراء الرقابي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">
                                            لا توجد سجلات تطابق معايير المراجعة.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((rec) => (
                                        <tr key={`${rec.type}-${rec.id}`} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-lg font-medium text-[11px] inline-flex items-center gap-1 ${
                                                    rec.type === 'invoice'
                                                        ? 'bg-blue-500/10 text-blue-400'
                                                        : rec.type === 'expense'
                                                            ? 'bg-rose-500/10 text-rose-400'
                                                            : 'bg-indigo-500/10 text-indigo-400'
                                                }`}>
                                                    {rec.type === 'invoice' && <Receipt size={12} />}
                                                    {rec.type === 'expense' && <TrendingDown size={12} />}
                                                    {rec.type === 'van_trip' && <Truck size={12} />}
                                                    <span>{rec.type_label}</span>
                                                </span>
                                            </td>

                                            <td className="p-4 font-bold text-white font-mono">
                                                {rec.reference}
                                            </td>

                                            <td className="p-4">
                                                <div className="text-slate-200 font-medium">{rec.title}</div>
                                                {rec.notes && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">{rec.notes}</div>
                                                )}
                                            </td>

                                            <td className="p-4 text-slate-300 font-mono">
                                                {rec.date}
                                            </td>

                                            <td className="p-4 font-medium text-slate-300 font-mono">
                                                {rec.financial_impact}
                                            </td>

                                            <td className="p-4 text-center">
                                                {rec.is_test ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                                        <ShieldAlert size={12} />
                                                        معزول كـ QA
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                                        <CheckCircle2 size={12} />
                                                        ضمن التشغيل الفعلي
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(rec)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
                                                        rec.is_test
                                                            ? 'bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 border border-slate-700'
                                                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                                    }`}
                                                    title={rec.is_test ? 'إلغاء العزل وإعادته للتقارير' : 'عزل السجل من التقارير التشغيلية'}
                                                >
                                                    {rec.is_test ? (
                                                        <>
                                                            <RotateCcw size={13} />
                                                            <span>إلغاء العزل</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldAlert size={13} />
                                                            <span>عزل السجل (QA)</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Safety Guarantee Notice */}
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 text-xs flex items-start gap-2.5">
                    <Info size={18} className="shrink-0 text-indigo-400 mt-0.5" />
                    <div className="space-y-1">
                        <div className="font-bold text-white">ضمان الأمان والرقابة المحاسبية:</div>
                        <p className="text-slate-300 leading-relaxed">
                            هذا الإجراء يقوم فقط بتبديل علامة التصنيف (is_test) لحماية تقارير الأرباح والمبيعات التشغيلية من التشويه. لا يتم حذف أي سجل نهائياً من قاعدة البيانات أو تعديل سجلات الفواتير التاريخية.
                        </p>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
}
