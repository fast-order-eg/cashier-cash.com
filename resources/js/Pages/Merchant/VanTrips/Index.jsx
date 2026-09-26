import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Truck, Gauge, DollarSign, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Index({ trips }) {
    return (
        <MerchantLayout title="سجل رحلات سيارات المناديب">
            <Head title="رحلات سيارات المناديب" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <Truck className="w-7 h-7 text-indigo-400" />
                            سجل رحلات وسيارات المناديب (Van Sales)
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة عدادات الكيلومترات للسيارات، المبيعات الجملة المحققة، والنقدية الموردة لكل رحلة
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.shifts.index')}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                            ورديات الكاشير →
                        </Link>
                        <Link
                            href={route('admin.warehouses.index')}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                        >
                            إذن صرف بضاعة للسيارات
                        </Link>
                    </div>
                </div>

                {/* Van Trips Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">المندوب</th>
                                    <th className="p-4 font-semibold">السيارة / المخزن</th>
                                    <th className="p-4 font-semibold">انطلاق الرحلة</th>
                                    <th className="p-4 font-semibold">انتهاء الرحلة</th>
                                    <th className="p-4 font-semibold">عداد البداية</th>
                                    <th className="p-4 font-semibold">عداد النهاية</th>
                                    <th className="p-4 font-semibold">المسافة المقطوعة</th>
                                    <th className="p-4 font-semibold">إجمالي المبيعات</th>
                                    <th className="p-4 font-semibold">النقدية الموردة</th>
                                    <th className="p-4 font-semibold">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {trips.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="p-8 text-center text-slate-500 text-sm">
                                            لا توجد رحلات مسجلة لسيارات التوزيع حتى الآن.
                                        </td>
                                    </tr>
                                ) : (
                                    trips.data.map((trip) => (
                                        <tr key={trip.id} className="hover:bg-slate-850/40 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-sm">
                                                    {trip.sales_rep?.name || 'غير محدد'}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    {trip.sales_rep?.phone || trip.sales_rep?.email}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium">
                                                    {trip.warehouse?.name || 'مخزن سيارة'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {new Date(trip.start_time).toLocaleString('ar-EG', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {trip.end_time ? (
                                                    new Date(trip.end_time).toLocaleString('ar-EG', {
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                ) : (
                                                    <span className="text-amber-400 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 animate-spin" /> في الطريق
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-slate-300">
                                                {Number(trip.start_odometer).toLocaleString()} كم
                                            </td>
                                            <td className="p-4 font-mono text-slate-300">
                                                {trip.end_odometer ? `${Number(trip.end_odometer).toLocaleString()} كم` : '-'}
                                            </td>
                                            <td className="p-4">
                                                {trip.total_distance !== null ? (
                                                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                        {Number(trip.total_distance).toLocaleString()} كم
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                                                {Number(trip.total_sales).toFixed(2)} ج.م
                                            </td>
                                            <td className="p-4 font-mono font-bold text-white text-sm">
                                                {Number(trip.total_cash_collected).toFixed(2)} ج.م
                                            </td>
                                            <td className="p-4">
                                                {trip.status === 'open' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                        رحلة نشطة
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                                        تمت التصفية
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
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
        </MerchantLayout>
    );
}
