import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    DollarSign, 
    Calendar, 
    TrendingUp, 
    TrendingDown, 
    Users, 
    ShieldCheck, 
    Filter,
    FileText,
    ExternalLink
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ shifts, stats = {}, cashiers = [], filters = {} }) {
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        if (!value) delete newFilters[key];
        router.get('/admin/shifts', newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'مدير';
            case 'cashier': return 'كاشير';
            case 'sales_rep': return 'مندوب مبيعات';
            default: return 'موظف';
        }
    };

    return (
        <MerchantLayout title="تقرير ورديات الكاشير">
            <Head title="ورديات الكاشير ومطابقة الخزينة" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">ورديات الكاشير ومطابقة الخزينة</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة عهدة البداية، مبيعات الكاش والفيزا، والمبالغ المستلمة بالدرج مع احتساب العجز والزيادة بدقة
                        </p>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">إجمالي الورديات</span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Clock size={16} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white font-mono">{formatNumber(stats.total_shifts || 0)}</span>
                            {stats.open_shifts > 0 && (
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    {stats.open_shifts} مفتوحة
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">مبيعات كاش الدرج</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                            {formatCurrency(stats.total_cash_sales || 0)}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">الكاش الفعلي المستلم</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <ShieldCheck size={16} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-white font-mono">
                            {formatCurrency(stats.total_closing_cash || 0)}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">صافي المطابقة (عجز / زيادة)</span>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                (stats.total_variance || 0) < 0 
                                    ? 'bg-rose-500/10 text-rose-400' 
                                    : (stats.total_variance || 0) > 0 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : 'bg-slate-800 text-slate-400'
                            }`}>
                                {(stats.total_variance || 0) < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                            </div>
                        </div>
                        <div className={`text-2xl font-black font-mono ${
                            (stats.total_variance || 0) < 0 
                                ? 'text-rose-400' 
                                : (stats.total_variance || 0) > 0 
                                    ? 'text-emerald-400' 
                                    : 'text-slate-300'
                        }`}>
                            {(stats.total_variance || 0) > 0 ? `+${formatNumber(stats.total_variance)}` : formatNumber(stats.total_variance || 0)} ج.م
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-indigo-400" />
                            <span className="text-slate-300 font-semibold">تصفية:</span>
                        </div>

                        {/* Cashier / Staff Filter with Roles */}
                        <select
                            value={filters.cashier_id || ''}
                            onChange={(e) => handleFilterChange('cashier_id', e.target.value)}
                            className="bg-slate-950 border border-slate-750 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:border-indigo-500"
                        >
                            <option value="">جميع الكاشيرات والموظفين</option>
                            {cashiers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({getRoleLabel(c.role)})
                                </option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="bg-slate-950 border border-slate-750 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:border-indigo-500"
                        >
                            <option value="">جميع الحالات</option>
                            <option value="open">مفتوحة</option>
                            <option value="closed">مغلقة</option>
                        </select>
                    </div>

                    {(filters.cashier_id || filters.status) && (
                        <button
                            onClick={() => router.get('/admin/shifts')}
                            className="text-rose-400 hover:text-rose-300 text-xs font-semibold hover:underline"
                        >
                            إلغاء الفلاتر
                        </button>
                    )}
                </div>

                {/* Shifts Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">رقم الوردية</th>
                                    <th className="p-4 font-semibold">الموظف المسؤول</th>
                                    <th className="p-4 font-semibold">وقت الفتح</th>
                                    <th className="p-4 font-semibold">وقت الإغلاق</th>
                                    <th className="p-4 font-semibold">عهدة البداية</th>
                                    <th className="p-4 font-semibold">مبيعات كاش</th>
                                    <th className="p-4 font-semibold">مبيعات فيزا</th>
                                    <th className="p-4 font-semibold">المبلغ المستلم بالدرج</th>
                                    <th className="p-4 font-semibold">العجز / الزيادة</th>
                                    <th className="p-4 font-semibold text-center">الحالة</th>
                                    <th className="p-4 font-semibold text-center">فواتير الوردية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {shifts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-slate-500">
                                            لا توجد ورديات مسجلة تطابق خيارات البحث
                                        </td>
                                    </tr>
                                ) : (
                                    shifts.data.map((shift) => (
                                        <tr key={shift.id} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4 font-mono font-bold text-slate-400">
                                                #{shift.id}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white text-sm">
                                                    {shift.cashier?.name || 'غير محدد'}
                                                </div>
                                                {shift.cashier?.role && (
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        ({getRoleLabel(shift.cashier.role)})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {formatDateTime(shift.opened_at)}
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {shift.closed_at ? formatDateTime(shift.closed_at) : (
                                                    <span className="text-emerald-400 font-bold">مفتوحة الآن</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-slate-200">
                                                {formatCurrency(shift.opening_balance)}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-emerald-400">
                                                +{formatCurrency(shift.cash_sales)}
                                            </td>
                                            <td className="p-4 font-mono text-indigo-400">
                                                +{formatCurrency(shift.card_sales)}
                                            </td>
                                            <td className="p-4 font-mono text-white font-bold">
                                                {shift.closing_balance !== null ? formatCurrency(shift.closing_balance) : '-'}
                                            </td>
                                            <td className="p-4">
                                                {shift.status === 'closed' ? (
                                                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                                        shift.variance < 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        shift.variance > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        'bg-slate-800 text-slate-300'
                                                    }`}>
                                                        {shift.variance > 0 ? `+${formatNumber(shift.variance)}` : formatNumber(shift.variance)} ج.م
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                {shift.status === 'open' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        مفتوحة
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-750">
                                                        مغلقة
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Link
                                                    href={`/admin/invoices?shift_id=${shift.id}&cashier_id=${shift.user_id}`}
                                                    className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-xs font-bold inline-flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                                                    title={`عرض وفلترة فواتير الوردية رقم #${shift.id}`}
                                                >
                                                    <FileText size={13} />
                                                    <span>عرض الفواتير</span>
                                                    <ExternalLink size={11} className="opacity-70" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {shifts.links && shifts.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-1">
                            {shifts.links.map((link, idx) => (
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
