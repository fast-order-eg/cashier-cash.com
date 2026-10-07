import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Truck, 
    Gauge, 
    DollarSign, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    AlertTriangle, 
    FileCheck, 
    ShieldCheck, 
    X, 
    Info,
    TrendingUp,
    TrendingDown,
    Scale,
    Filter,
    Eye
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ trips, stats, filters }) {
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsTrip, setDetailsTrip] = useState(null);
    const [settleModalOpen, setSettleModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [auditTrip, setAuditTrip] = useState(null);

    const { 
        data: settleData, 
        setData: setSettleData, 
        post: postSettle, 
        processing: processingSettle, 
        reset: resetSettle, 
        errors: settleErrors 
    } = useForm({
        settlement_notes: '',
    });

    const openSettleModal = (trip) => {
        setSelectedTrip(trip);
        setSettleData('settlement_notes', '');
        setSettleModalOpen(true);
    };

    const handleSettleSubmit = (e) => {
        e.preventDefault();
        if (!selectedTrip) return;

        postSettle(`/admin/van-trips/${selectedTrip.id}/settle`, {
            onSuccess: () => {
                setSettleModalOpen(false);
                setSelectedTrip(null);
                resetSettle();
            }
        });
    };

    const openAuditModal = (trip) => {
        setAuditTrip(trip);
        setAuditModalOpen(true);
    };

    const openDetailsModal = (trip) => {
        setDetailsTrip(trip);
        setDetailsModalOpen(true);
    };

    return (
        <MerchantLayout title="سجل رحلات سيارات المناديب والمطابقة المالية">
            <Head title="رحلات سيارات المناديب والمطابقة" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <Truck className="w-7 h-7 text-indigo-400" />
                            سجل رحلات المناديب والمطابقة المالية (Van Sales)
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            مطابقة المبيعات النقدية مع المبالغ المورّدة، ورصد العجز المستحق وفائض التوريد مع التوثيق الرقابي
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/admin/warehouses"
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                        >
                            إذن صرف بضاعة للسيارات
                        </Link>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 px-2">
                        <Truck size={16} className="text-indigo-400" />
                        <span>رحلات سيارات التوزيع</span>
                    </div>

                    <div className="flex items-center gap-2 px-2 text-xs">
                        <span className="text-slate-500 text-[11px]">تصفية الحالة:</span>
                        <Link
                            href="/admin/van-trips"
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                !filters?.status ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            الكل
                        </Link>
                        <Link
                            href="/admin/van-trips?status=unsettled"
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                filters?.status === 'unsettled' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            غير مسوّاة
                        </Link>
                        <Link
                            href="/admin/van-trips?status=balanced"
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                filters?.status === 'balanced' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            متوازنة
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Card 1: Total Trips */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">
                                إجمالي رحلات السيارات
                            </span>
                            <div className="text-2xl font-black text-white mt-1">
                                {formatNumber(trips.total || trips.data.length)} رحلة
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Truck size={20} />
                        </div>
                    </div>

                    {/* Card 2: Unsettled Trips (Shortage + Surplus) */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                        stats?.unsettled_count > 0 
                            ? 'bg-amber-950/20 border-amber-800/60' 
                            : 'bg-slate-900 border-slate-800'
                    }`}>
                        <div>
                            <span className="text-slate-400 text-xs font-semibold">
                                رحلات غير مسوّاة (فروق معلقة)
                            </span>
                            <div className={`text-2xl font-black mt-1 ${stats?.unsettled_count > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                                {formatNumber(stats?.unsettled_count || 0)} رحلات
                            </div>
                            {stats?.unsettled_count > 0 && (
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                    <span className="text-rose-400 font-semibold">{stats?.unsettled_shortage_count || 0} عجز</span>
                                    <span>•</span>
                                    <span className="text-cyan-400 font-semibold">{stats?.unsettled_surplus_count || 0} فائض</span>
                                </div>
                            )}
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            stats?.unsettled_count > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                            <Scale size={20} />
                        </div>
                    </div>

                    {/* Card 3: Unsettled Variances Breakdown */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-semibold">الفروق غير المسوّاة</span>
                            <div className="flex flex-col gap-0.5 mt-1">
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="text-rose-400 font-bold">عجز مستحق:</span>
                                    <span className="text-rose-400 font-black">{formatCurrency(stats?.unsettled_shortage_amount || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="text-cyan-400 font-bold">فائض توريد:</span>
                                    <span className="text-cyan-400 font-black">+{formatCurrency(stats?.unsettled_surplus_amount || 0)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                {/* Van Trips Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">المندوب والسيارة</th>
                                    <th className="p-4 font-semibold">وقت الفتح / الإغلاق</th>
                                    <th className="p-4 font-semibold">قراءة العداد والمسافة</th>
                                    <th className="p-4 font-semibold">إجمالي المبيعات</th>
                                    <th className="p-4 font-semibold">المبيعات النقدية</th>
                                    <th className="p-4 font-semibold">المبلغ المورّد</th>
                                    <th className="p-4 font-semibold">الفارق / الرصيد</th>
                                    <th className="p-4 font-semibold text-center">حالة التصفية والمطابقة</th>
                                    <th className="p-4 font-semibold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {trips.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="p-8 text-center text-slate-500 text-sm">
                                            لا توجد رحلات مسجلة لسيارات التوزيع حتى الآن.
                                        </td>
                                    </tr>
                                ) : (
                                    trips.data.map((trip) => {
                                        const cashSales = trip.display_cash_sales ?? Number(trip.cash_sales || 0);
                                        const cashCollected = trip.display_cash_collected ?? Number(trip.total_cash_collected || 0);
                                        const diff = trip.display_difference ?? Number(trip.difference || (cashSales - cashCollected));
                                        const diffAmount = trip.display_diff_amount ?? Math.abs(diff);
                                        const varianceType = trip.variance_type || (diff > 0 ? 'shortage' : (diff < 0 ? 'surplus' : 'balanced'));
                                        const status = trip.display_settlement_status || trip.settlement_status || (trip.status === 'open' ? 'open' : (varianceType === 'balanced' ? 'balanced' : 'unsettled'));

                                        return (
                                            <tr key={trip.id} className="hover:bg-slate-850/40 transition">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-sm">
                                                        {trip.sales_rep?.name || 'غير محدد'}
                                                    </div>
                                                    <div className="text-[11px] text-indigo-400 font-medium mt-0.5">
                                                        {trip.warehouse?.name || 'مخزن سيارة'}
                                                    </div>
                                                    {trip.sales_rep?.phone && (
                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                            {trip.sales_rep.phone}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-4 text-slate-300">
                                                    <div className="space-y-1.5 min-w-[170px]">
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0">
                                                                فتح
                                                            </span>
                                                            <span className="font-mono text-slate-200">{formatDateTime(trip.start_time)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            {trip.end_time ? (
                                                                <>
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold shrink-0">
                                                                        إغلاق
                                                                    </span>
                                                                    <span className="font-mono text-slate-300">{formatDateTime(trip.end_time)}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-amber-400 flex items-center gap-1 text-[11px] font-semibold">
                                                                    <Clock className="w-3 h-3 animate-spin" /> في الطريق (مفتوحة)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="space-y-1 min-w-[155px]">
                                                        <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                                            <span className="text-slate-400 text-[11px]">عداد الفتح:</span>
                                                            <span className="font-bold text-slate-200">
                                                                {trip.start_odometer !== null ? `${formatNumber(trip.start_odometer)} كم` : '-'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                                            <span className="text-slate-400 text-[11px]">عداد الإغلاق:</span>
                                                            <span className="font-bold text-slate-200">
                                                                {trip.end_odometer !== null ? (
                                                                    `${formatNumber(trip.end_odometer)} كم`
                                                                ) : (
                                                                    <span className="text-amber-400 text-[10px]">قيد التشغيل</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {trip.total_distance !== null && Number(trip.total_distance) > 0 && (
                                                            <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-2">
                                                                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                                                                    <Gauge size={11} /> المسافة:
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded font-mono font-black text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                                    {formatNumber(trip.total_distance)} كم
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-4 font-mono font-bold text-slate-200 text-sm">
                                                    {formatCurrency(trip.total_sales)}
                                                </td>

                                                <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                                                    {formatCurrency(cashSales)}
                                                </td>

                                                <td className="p-4 font-mono font-bold text-white text-sm">
                                                    {formatCurrency(cashCollected)}
                                                </td>

                                                <td className="p-4">
                                                    {trip.status === 'open' ? (
                                                        <span className="text-slate-500 text-[11px]">قيد التشغيل</span>
                                                    ) : varianceType === 'shortage' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-rose-400 font-bold font-mono text-sm">
                                                                {formatCurrency(diffAmount)}
                                                            </span>
                                                            <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5">
                                                                <TrendingDown size={11} />
                                                                عجز / رصيد مستحق
                                                            </span>
                                                        </div>
                                                    ) : varianceType === 'surplus' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-cyan-400 font-bold font-mono text-sm">
                                                                +{formatCurrency(diffAmount)}
                                                            </span>
                                                            <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                                                                <TrendingUp size={11} />
                                                                فائض توريد
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                                                            <CheckCircle2 size={13} />
                                                            متوازنة (0.00)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-center">
                                                    {status === 'open' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                            رحلة نشطة
                                                        </span>
                                                    ) : status === 'balanced' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            مسوّاة بالكامل
                                                        </span>
                                                    ) : status === 'settled_with_variance' ? (
                                                        <button
                                                            onClick={() => openAuditModal(trip)}
                                                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition inline-flex items-center gap-1"
                                                            title="عرض سجل تدقيق التسوية"
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                                                            مسوّاة بفارق موثق
                                                        </button>
                                                    ) : varianceType === 'surplus' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 inline-flex items-center gap-1 animate-pulse">
                                                            <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                                                            غير مسوّاة (فائض)
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 animate-pulse">
                                                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                                            غير مسوّاة (عجز)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetailsModal(trip)}
                                                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
                                                            title="عرض التفاصيل الكاملة للرحلة وقراءات العداد"
                                                        >
                                                            <Eye size={14} />
                                                            <span>تفاصيل</span>
                                                        </button>

                                                        {status === 'unsettled' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openSettleModal(trip)}
                                                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                                                                    varianceType === 'surplus'
                                                                        ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                                                                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                                                }`}
                                                                title={varianceType === 'surplus' ? 'تسوية واعتماد فائض التوريد' : 'تسوية واعتماد العجز المستحق'}
                                                            >
                                                                <FileCheck size={14} />
                                                                <span>تسوية</span>
                                                            </button>
                                                        ) : status === 'settled_with_variance' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openAuditModal(trip)}
                                                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1 text-xs font-semibold"
                                                                title="عرض تفاصيل التسوية المعتمدة"
                                                            >
                                                                <Info size={14} />
                                                                <span>الاعتماد</span>
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {trips.links && trips.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-1">
                            {trips.links.map((link, idx) => (
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

            {/* Modal: Settle Variance */}
            {settleModalOpen && selectedTrip && (() => {
                const cashSales = selectedTrip.display_cash_sales ?? Number(selectedTrip.cash_sales || 0);
                const cashCollected = selectedTrip.display_cash_collected ?? Number(selectedTrip.total_cash_collected || 0);
                const diff = selectedTrip.display_difference ?? Number(selectedTrip.difference || (cashSales - cashCollected));
                const diffAmount = selectedTrip.display_diff_amount ?? Math.abs(diff);
                const isSurplus = (diff < 0) || (selectedTrip.variance_type === 'surplus');

                return (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-white text-base flex items-center gap-2">
                                    <ShieldCheck size={18} className={isSurplus ? 'text-cyan-400' : 'text-amber-400'} />
                                    <span>{isSurplus ? 'اعتماد وتسوية فائض توريد الرحلة' : 'اعتماد وتسوية عجز رحلة المندوب'}</span>
                                </h3>
                                <button 
                                    onClick={() => setSettleModalOpen(false)} 
                                    className="text-slate-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Variance Summary */}
                            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>اسم المندوب:</span>
                                    <span className="font-bold text-white">{selectedTrip.sales_rep?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>المبيعات النقدية المطلوبة:</span>
                                    <span className="font-bold text-emerald-400 font-mono">
                                        {formatCurrency(cashSales)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>المبلغ المورّد للخزينة:</span>
                                    <span className="font-bold text-white font-mono">
                                        {formatCurrency(cashCollected)}
                                    </span>
                                </div>

                                <div className={`flex justify-between items-center pt-2 border-t border-slate-800 text-sm ${
                                    isSurplus ? 'text-cyan-400' : 'text-rose-400'
                                }`}>
                                    <span className="font-bold flex items-center gap-1">
                                        {isSurplus ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                                        {isSurplus ? 'فائض توريد غير معتمد:' : 'الرصيد المستحق (عجز غير مسوّى):'}
                                    </span>
                                    <span className="font-black font-mono text-base">
                                        {isSurplus ? `+${formatCurrency(diffAmount)}` : formatCurrency(diffAmount)}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleSettleSubmit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">
                                        {isSurplus ? 'سبب توثيق وتسوية فائض التوريد (إلزامي للرقابة):' : 'سبب توثيق وتسوية العجز (إلزامي للرقابة):'}
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={settleData.settlement_notes}
                                        onChange={(e) => setSettleData('settlement_notes', e.target.value)}
                                        placeholder={
                                            isSurplus 
                                                ? "مثال: مبالغ محصلة مقدماً من عميل / تسوية عهدة سابقة / إيداع إضافي معتمد..." 
                                                : "مثال: تم خصم 1,820 ج.م من مستحقات المندوب / أجل تم تحصيله ومعتمد من الإدارة..."
                                        }
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    {settleErrors.settlement_notes && (
                                        <p className="text-rose-400 text-[11px] mt-1">{settleErrors.settlement_notes}</p>
                                    )}
                                </div>

                                <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
                                    isSurplus 
                                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' 
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                }`}>
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        تنبيه: سيتم حفظ التسوية في سجل التدقيق باسم المستخدم الحالي مع الوقت وتاريخ الاعتماد ولن يتم حذف السجلات القديمة.
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setSettleModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingSettle}
                                        className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition disabled:opacity-50 ${
                                            isSurplus 
                                                ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30' 
                                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                                        }`}
                                    >
                                        {processingSettle ? 'جاري الاعتماد...' : (isSurplus ? 'اعتماد وتسوية الفائض' : 'اعتماد وتسوية العجز')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Audit Log Details */}
            {auditModalOpen && auditTrip && (() => {
                const cashSales = auditTrip.display_cash_sales ?? Number(auditTrip.cash_sales || 0);
                const cashCollected = auditTrip.display_cash_collected ?? Number(auditTrip.total_cash_collected || 0);
                const diff = auditTrip.display_difference ?? Number(auditTrip.difference || (cashSales - cashCollected));
                const diffAmount = auditTrip.display_diff_amount ?? Math.abs(diff);
                const isSurplus = (diff < 0) || (auditTrip.variance_type === 'surplus');

                return (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-purple-400" />
                                    <span>سجل تدقيق تسوية الرحلة</span>
                                </h3>
                                <button 
                                    onClick={() => setAuditModalOpen(false)} 
                                    className="text-slate-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-slate-400">حالة المطابقة:</div>
                                    <div className="text-purple-300 font-bold text-sm">تمت التسوية بفارق موثق</div>
                                    <div className="text-slate-300 flex items-center gap-2 pt-1 font-mono">
                                        <span>نوع الفرق المعتمد:</span>
                                        <span className={`font-bold ${isSurplus ? 'text-cyan-400' : 'text-rose-400'}`}>
                                            {isSurplus ? `فائض توريد (+${formatCurrency(diffAmount)})` : `عجز مستحق (${formatCurrency(diffAmount)})`}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-slate-400">المستخدم المعتمد للتسوية:</div>
                                    <div className="text-white font-bold">{auditTrip.settled_by?.name || 'المدير'}</div>
                                    {auditTrip.settled_by?.email && (
                                        <div className="text-[11px] text-slate-500 font-mono">{auditTrip.settled_by.email}</div>
                                    )}
                                </div>

                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-slate-400">توقيت اعتماد التسوية:</div>
                                    <div className="text-slate-200 font-mono">{formatDateTime(auditTrip.settled_at)}</div>
                                </div>

                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <div className="text-slate-400">سبب التوثيق والتسوية المعتمد:</div>
                                    <div className="text-slate-200 whitespace-pre-wrap leading-relaxed p-2 bg-slate-900 rounded-lg border border-slate-800">
                                        {auditTrip.settlement_notes || 'لا توجد ملاحظات إضافية'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setAuditModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition text-xs"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Full Trip Details (بيانات العداد، التوقيت، والحسابات) */}
            {detailsModalOpen && detailsTrip && (() => {
                const cashSales = detailsTrip.display_cash_sales ?? Number(detailsTrip.cash_sales || 0);
                const cashCollected = detailsTrip.display_cash_collected ?? Number(detailsTrip.total_cash_collected || 0);
                const diff = detailsTrip.display_difference ?? Number(detailsTrip.difference || (cashSales - cashCollected));
                const diffAmount = detailsTrip.display_diff_amount ?? Math.abs(diff);
                const varianceType = detailsTrip.variance_type || (diff > 0 ? 'shortage' : (diff < 0 ? 'surplus' : 'balanced'));
                const status = detailsTrip.display_settlement_status || detailsTrip.settlement_status || (detailsTrip.status === 'open' ? 'open' : (varianceType === 'balanced' ? 'balanced' : 'unsettled'));

                return (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                                            <span>تفاصيل رحلة سيارة التوزيع #{detailsTrip.id}</span>
                                            {detailsTrip.status === 'open' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                    نشطة في الطريق
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                    مغلقة
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {detailsTrip.sales_rep?.name} • {detailsTrip.warehouse?.name || 'مخزن سيارة'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setDetailsModalOpen(false)} 
                                    className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Section 1: قراءات العداد والمسافة */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Gauge size={15} className="text-cyan-400" />
                                    <span>بيانات قراءة العداد والمسافة المقطوعة</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
                                        <span className="text-slate-400 text-[11px] block">عداد البداية (الفتح)</span>
                                        <div className="text-lg font-black font-mono text-white mt-1">
                                            {detailsTrip.start_odometer !== null ? `${formatNumber(detailsTrip.start_odometer)} كم` : '-'}
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
                                        <span className="text-slate-400 text-[11px] block">عداد النهاية (الإغلاق)</span>
                                        <div className="text-lg font-black font-mono text-white mt-1">
                                            {detailsTrip.end_odometer !== null ? (
                                                `${formatNumber(detailsTrip.end_odometer)} كم`
                                            ) : (
                                                <span className="text-amber-400 text-sm font-sans">قيد التشغيل</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-cyan-950/20 p-3.5 rounded-2xl border border-cyan-800/40">
                                        <span className="text-cyan-300 text-[11px] block font-semibold">إجمالي المسافة المقطوعة</span>
                                        <div className="text-lg font-black font-mono text-cyan-400 mt-1">
                                            {formatNumber(detailsTrip.total_distance || 0)} كم
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: توقيت فتح وإغلاق الرحلة */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Clock size={15} className="text-indigo-400" />
                                    <span>التوقيت والمدة الزمنية</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[11px] block">وقت فتح الرحلة (الانطلاق)</span>
                                            <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                                                {formatDateTime(detailsTrip.start_time)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[11px] block">وقت إغلاق الرحلة (العودة)</span>
                                            <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                                                {detailsTrip.end_time ? (
                                                    formatDateTime(detailsTrip.end_time)
                                                ) : (
                                                    <span className="text-amber-400 font-sans text-xs">في الطريق (لم تُغلق بعد)</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: المبيعات والمطابقة المالية */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <DollarSign size={15} className="text-emerald-400" />
                                    <span>المبيعات والتوريد المالي للرحلة</span>
                                </h4>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>إجمالي المبيعات (نقدي وآجل):</span>
                                        <span className="font-bold text-white font-mono text-sm">
                                            {formatCurrency(detailsTrip.total_sales)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>المبيعات النقدية المطلوبة (كاش):</span>
                                        <span className="font-bold text-emerald-400 font-mono text-sm">
                                            {formatCurrency(cashSales)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>المبلغ المورّد للخزينة فعلياً:</span>
                                        <span className="font-bold text-white font-mono text-sm">
                                            {formatCurrency(cashCollected)}
                                        </span>
                                    </div>
                                    <div className={`flex justify-between items-center pt-2.5 border-t border-slate-800 text-sm ${
                                        varianceType === 'surplus' ? 'text-cyan-400' : varianceType === 'shortage' ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                        <span className="font-bold flex items-center gap-1">
                                            {varianceType === 'surplus' ? <TrendingUp size={16} /> : varianceType === 'shortage' ? <TrendingDown size={16} /> : <CheckCircle2 size={16} />}
                                            {varianceType === 'surplus' ? 'فائض توريد من المندوب:' : varianceType === 'shortage' ? 'عجز / رصيد مستحق على المندوب:' : 'حالة التصفية:'}
                                        </span>
                                        <span className="font-black font-mono text-base">
                                            {varianceType === 'balanced' ? 'متوازنة بالكامل (0.00)' : formatCurrency(diffAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: الملاحظات */}
                            {detailsTrip.notes && (
                                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
                                    <span className="text-slate-400 block font-semibold">ملاحظات الرحلة:</span>
                                    <p className="text-slate-200 leading-relaxed">{detailsTrip.notes}</p>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                                <Link
                                    href={`/admin/invoices?search=${encodeURIComponent(detailsTrip.sales_rep?.name || '')}`}
                                    className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                                >
                                    عرض فواتير مبيعات المندوب ←
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition text-xs"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </MerchantLayout>
    );
}
