import React from 'react';
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
    Package
} from 'lucide-react';

export default function Dashboard({ stats, low_stock_products, active_shifts, active_van_trips, recent_invoices }) {
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
                            href={route('admin.products.create')}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                            + إضافة صنف جديد
                        </Link>
                        <a
                            href={route('cashier.pos')}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
                        >
                            <Scan size={15} />
                            <span>فتح الكاشير</span>
                        </a>
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
                            href={route('admin.products.index', { negative_stock: true })}
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
                            <span className="text-2xl font-black text-white">{Number(stats.today_sales).toLocaleString('en-US')}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            من إجمالي {stats.today_invoices_count} فاتورة
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
                                {Number(stats.today_net_profit).toLocaleString('en-US')}
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
                            <span className="text-2xl font-black text-white">{Number(stats.today_expenses).toLocaleString('en-US')}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <Link href={route('admin.expenses.index')} className="text-[11px] text-indigo-400 hover:underline mt-1 inline-block">
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
                            <span className="text-2xl font-black text-white">{Number(stats.month_net_profit).toLocaleString('en-US')}</span>
                            <span className="text-xs text-slate-400">ج.م</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            إجمالي مبيعات الشهر: {Number(stats.month_sales).toLocaleString('en-US')} ج.م
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
                                                عهدة البداية: {shift.opening_balance} ج.م • فُتحت: {new Date(shift.opened_at).toLocaleTimeString('ar-EG')}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">{shift.cash_sales} ج.م كاش</div>
                                            <div className="text-slate-400">{shift.card_sales} ج.م فيزا</div>
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
                                {active_van_trips.length} سيارة
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
                                                {trip.warehouse?.name} • عداد البداية: {trip.start_odometer} كم
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-indigo-400">{trip.total_sales} ج.م مبيعات</div>
                                            <div className="text-slate-400">محصل: {trip.total_cash_collected} ج.م</div>
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
                            <Link href={route('admin.invoices.index')} className="text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:underline">
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
                                            <td className="py-3 font-bold text-white">{inv.total_amount} ج.م</td>
                                            <td className="py-3">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                                                    {inv.payment_method === 'cash' ? 'نقدي' : 'فيزا'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-400">{new Date(inv.created_at).toLocaleTimeString('ar-EG')}</td>
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
                            <Link href={route('admin.products.index', { low_stock: true })} className="text-indigo-400 text-xs font-semibold hover:underline">
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
                                            {p.stock_quantity} {p.unit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
}
