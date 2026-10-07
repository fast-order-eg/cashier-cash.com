import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    DollarSign, 
    TrendingUp, 
    Receipt, 
    Scan, 
    AlertTriangle, 
    Clock, 
    Truck, 
    FileText, 
    ArrowUpRight,
    Package,
    User,
    X
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Dashboard({ stats, low_stock_products, active_shifts, active_van_trips, recent_invoices, cashiers = [] }) {
    const [cashierSelectModalOpen, setCashierSelectModalOpen] = useState(false);

    return (
        <MerchantLayout title="لوحة التحكم">
            <Head title="لوحة تحكم المتجر" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">نظرة عامة على المتجر</h1>
                        <p className="text-slate-400 text-xs mt-1">متابعة المبيعات اليومية، صافي الأرباح، المصروفات، والورديات النشطة</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/products/create"
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                            + إضافة صنف جديد
                        </Link>
                        <button
                            type="button"
                            onClick={() => setCashierSelectModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Scan size={15} />
                            <span>فتح الكاشير</span>
                        </button>
                    </div>
                </div>

                {/* Negative Stock Warning Banner */}
                {stats.negative_stock_count > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-rose-400 font-semibold">
                            <AlertTriangle size={18} className="flex-shrink-0" />
                            <span>
                                يوجد عدد ({stats.negative_stock_count}) صنف رصيدهم بالسالب بسبب مبيعات تمت أوفلاين أثناء انقطاع الإنترنت! يرجى مراجعة وتوريد المخزون.
                            </span>
                        </div>
                        <Link
                            href="/admin/products?negative_stock=true"
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex-shrink-0"
                        >
                            عرض الأصناف السالبة
                        </Link>
                    </div>
                )}

                {/* Financial Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Today Sales */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                            <span>مبيعات اليوم الإجمالية</span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white">{formatNumber(stats.today_sales)}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            من إجمالي {formatNumber(stats.today_invoices_count)} فاتورة
                        </div>
                    </div>

                    {/* Today Net Profit */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                            <span>صافي أرباح اليوم</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className={`text-2xl font-black ${stats.today_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatNumber(stats.today_net_profit)}
                            </span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            (المبيعات - التكلفة - المصروفات)
                        </div>
                    </div>

                    {/* Today Expenses */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                            <span>مصروفات اليوم</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <Receipt size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white">{formatNumber(stats.today_expenses)}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <Link href="/admin/expenses" className="text-[11px] text-indigo-400 hover:underline mt-1 inline-block">
                            تفاصيل المصروفات →
                        </Link>
                    </div>

                    {/* Month Net Profit */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                            <span>صافي أرباح الشهر الحالي</span>
                            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white">{formatNumber(stats.month_net_profit)}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            إجمالي مبيعات الشهر: {formatCurrency(stats.month_sales)}
                        </div>
                    </div>
                </div>

                {/* Active Shifts & Van Trips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Active Cashier Shifts */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Clock size={16} className="text-emerald-400" />
                                <span>ورديات الكاشير المفتوحة الآن</span>
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                                {active_shifts.length} وردية
                            </span>
                        </div>

                        {active_shifts.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-500">لا توجد وردية كاشير مفتوحة حالياً</div>
                        ) : (
                            <div className="space-y-2">
                                {active_shifts.map((shift) => (
                                    <div key={shift.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-white">{shift.cashier?.name}</div>
                                            <div className="text-slate-400 mt-0.5">
                                                عهدة البداية: {formatCurrency(shift.opening_balance)} • فُتحت: {formatDateTime(shift.opened_at)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">{formatCurrency(shift.cash_sales)} كاش</div>
                                            <div className="text-slate-400">{formatCurrency(shift.card_sales)} فيزا</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Van Trips */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Truck size={16} className="text-indigo-400" />
                                <span>رحلات سيارات المناديب النشطة</span>
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                                {formatNumber(active_van_trips.length)} سيارة
                            </span>
                        </div>

                        {active_van_trips.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-500">لا توجد رحلة سيارة جارية حالياً</div>
                        ) : (
                            <div className="space-y-2">
                                {active_van_trips.map((trip) => (
                                    <div key={trip.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-white">{trip.sales_rep?.name}</div>
                                            <div className="text-slate-400 mt-0.5">
                                                {trip.warehouse?.name} • عداد البداية: {formatNumber(trip.start_odometer)} كم
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-indigo-400">{formatCurrency(trip.total_sales)} مبيعات</div>
                                            <div className="text-slate-400">محصل: {formatCurrency(trip.total_cash_collected)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock & Recent Sales */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Invoices */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-base">أحدث فواتير المبيعات</h3>
                            <Link href="/admin/invoices" className="text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:underline">
                                <span>عرض السجل كاملاً</span>
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="pb-3 font-semibold">رقم الفاتورة</th>
                                        <th className="pb-3 font-semibold">النوع</th>
                                        <th className="pb-3 font-semibold">المسؤول</th>
                                        <th className="pb-3 font-semibold">الإجمالي</th>
                                        <th className="pb-3 font-semibold">الدفع</th>
                                        <th className="pb-3 font-semibold">الوقت</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850">
                                    {recent_invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-850/40">
                                            <td className="py-3 font-mono font-bold text-white">{inv.invoice_number}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                                    inv.type === 'retail' ? 'bg-sky-500/10 text-sky-400' : 'bg-indigo-500/10 text-indigo-400'
                                                }`}>
                                                    {inv.type === 'retail' ? 'كاشير قطاعي' : 'مندوب جملة'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-300">{inv.cashier?.name || inv.sales_rep?.name || 'المدير'}</td>
                                            <td className="py-3 font-bold text-white">{formatCurrency(inv.total_amount)}</td>
                                            <td className="py-3">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                                                    {inv.payment_method === 'cash' ? 'نقدي' : 'فيزا'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-400">{formatDateTime(inv.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Package size={18} className="text-amber-400" />
                                <span>نواقص المخزون</span>
                            </h3>
                            <Link href="/admin/products?low_stock=true" className="text-indigo-400 text-xs font-semibold hover:underline">
                                الكل
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {low_stock_products.map((p) => (
                                <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-semibold text-white">{p.name}</div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.barcode}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${
                                            p.stock_quantity < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                            {formatNumber(p.stock_quantity)} {p.unit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cashier Selection Modal */}
            {cashierSelectModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                                    <Scan size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">بدء شاشة الكاشير (POS)</h3>
                                    <p className="text-xs text-slate-400">اختر الموظف أو الكاشير لبدء نقطة البيع</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCashierSelectModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {cashiers.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs">
                                    لا يوجد موظفو كاشير مسجلون حالياً. يمكنك المتابعة بحساب المدير.
                                </div>
                            ) : (
                                cashiers.map((c) => (
                                    <a
                                        key={c.id}
                                        href={`/pos?cashier_id=${c.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={() => setCashierSelectModalOpen(false)}
                                        className="w-full p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 flex items-center justify-between group transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition">
                                                <User size={16} />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition flex items-center gap-2">
                                                    <span>{c.name}</span>
                                                    {c.role === 'admin' ? (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">مدير</span>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">كاشير</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-400 block mt-0.5">{c.email}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {c.has_open_shift ? (
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                    وردية مفتوحة
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 px-2 py-1 rounded-lg bg-slate-800/80">
                                                    لا توجد وردية
                                                </span>
                                            )}
                                            <ArrowUpRight size={16} className="text-slate-500 group-hover:text-emerald-400 transition" />
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <a
                                href="/pos"
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setCashierSelectModalOpen(false)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                                <span>أو الفتح بحسابي المباشر كمدير</span>
                                <ArrowUpRight size={13} />
                            </a>
                            <button
                                onClick={() => setCashierSelectModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
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
