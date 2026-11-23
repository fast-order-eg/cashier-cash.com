import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { 
    DollarSign, 
    CreditCard, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    Search, 
    Filter, 
    ArrowUpRight,
    Store,
    RefreshCw,
    ShieldCheck
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/formatters';

export default function Index({ transactions, stats, filters }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentStatus, setCurrentStatus] = useState(filters.status || '');

    const handleFilterStatus = (status) => {
        setCurrentStatus(status);
        router.get('/admin/transactions', { status: status || undefined }, { preserveState: true });
    };

    const filteredTransactions = transactions.filter((t) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            t.tenant_name?.toLowerCase().includes(term) ||
            t.tenant_slug?.toLowerCase().includes(term) ||
            t.order_reference?.toLowerCase().includes(term) ||
            t.type_label?.toLowerCase().includes(term)
        );
    });

    return (
        <SuperAdminLayout title="سجل العمليات والمدفوعات">
            <Head title="سجل العمليات والمدفوعات - السوبر أدمن" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                            <DollarSign className="text-emerald-400" size={26} />
                            <span>سجل العمليات والمدفوعات الإلكترونية</span>
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة تحويلات المتاجر، سداد الاشتراكات، وشراء مقاعد الموظفين الإضافية عبر بوابة كاشير (Kashier)
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <span className="text-slate-400 text-xs font-semibold block">إجمالي المبالغ المحصلة</span>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-emerald-400 font-mono">
                                {formatNumber(stats.total_revenue)}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">ج.م</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <span className="text-slate-400 text-xs font-semibold block">العمليات الناجحة والمفعلة</span>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white font-mono">
                                {formatNumber(stats.paid_count)}
                            </span>
                            <span className="text-xs text-emerald-400 font-bold">معاملة مكتملة</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl relative overflow-hidden">
                        <span className="text-slate-400 text-xs font-semibold block">العمليات بانتظار السداد</span>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-amber-400 font-mono">
                                {formatNumber(stats.pending_count)}
                            </span>
                            <span className="text-xs text-amber-400 font-bold">معاملة معلقة</span>
                        </div>
                    </div>
                </div>

                {/* Table & Filters Card */}
                <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
                        {/* Status Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                            <button
                                onClick={() => handleFilterStatus('')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    !currentStatus ? 'bg-indigo-600 text-white' : 'bg-slate-750 text-slate-300 hover:text-white'
                                }`}
                            >
                                الكل ({transactions.length})
                            </button>
                            <button
                                onClick={() => handleFilterStatus('paid')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    currentStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-750 text-slate-300 hover:text-white'
                                }`}
                            >
                                ناجحة ({stats.paid_count})
                            </button>
                            <button
                                onClick={() => handleFilterStatus('pending')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    currentStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-750 text-slate-300 hover:text-white'
                                }`}
                            >
                                معلقة ({stats.pending_count})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search size={15} className="absolute right-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="بحث بالمتجر أو رقم المعاملة..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {filteredTransactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 text-xs">
                                        <th className="pb-3 font-semibold">المتجر</th>
                                        <th className="pb-3 font-semibold">نوع العملية</th>
                                        <th className="pb-3 font-semibold">المبلغ</th>
                                        <th className="pb-3 font-semibold">وسيلة الدفع</th>
                                        <th className="pb-3 font-semibold">رقم المعاملة</th>
                                        <th className="pb-3 font-semibold">الحالة</th>
                                        <th className="pb-3 font-semibold">التاريخ والوقت</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/60">
                                    {filteredTransactions.map((trx) => (
                                        <tr key={trx.id} className="hover:bg-slate-750/50 transition">
                                            <td className="py-3.5">
                                                <div className="font-semibold text-white">{trx.tenant_name}</div>
                                                {trx.tenant_slug && (
                                                    <div className="text-xs text-indigo-400 font-mono" dir="ltr">
                                                        {trx.tenant_slug}.cashier-cash.com
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5">
                                                <span className="text-xs text-slate-200 font-medium">
                                                    {trx.type_label}
                                                </span>
                                            </td>
                                            <td className="py-3.5">
                                                <span className="font-mono font-bold text-emerald-400 text-base">
                                                    {formatNumber(trx.amount)}
                                                </span>
                                                <span className="text-xs text-slate-400 mr-1">{trx.currency}</span>
                                            </td>
                                            <td className="py-3.5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                                                    <CreditCard size={12} />
                                                    <span>{trx.gateway === 'kashier' ? 'كاشير (Kashier)' : trx.gateway}</span>
                                                </span>
                                            </td>
                                            <td className="py-3.5">
                                                <span className="font-mono text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-750 select-all">
                                                    {trx.order_reference}
                                                </span>
                                            </td>
                                            <td className="py-3.5">
                                                {trx.status === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        <CheckCircle size={12} />
                                                        <span>ناجحة ومفعلة</span>
                                                    </span>
                                                ) : trx.status === 'pending' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        <Clock size={12} />
                                                        <span>قيد السداد</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                                        <AlertCircle size={12} />
                                                        <span>ملغاة</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-xs text-slate-400 font-mono">
                                                {trx.created_at}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-slate-700/40 text-slate-500 flex items-center justify-center mx-auto">
                                <DollarSign size={24} />
                            </div>
                            <div className="text-sm font-semibold text-slate-300">لا توجد عمليات تطابق البحث</div>
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}
