import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { Clock, CheckCircle2, AlertCircle, DollarSign, Calendar } from 'lucide-react';

export default function Index({ shifts }) {
    return (
        <MerchantLayout title="تقرير ورديات الكاشير">
            <Head title="ورديات الكاشير" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">ورديات الكاشير والدرج</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة عهدة البداية، مبيعات الكاش والفيزا، ومطابقة النقدية وحساب العجز أو الزيادة
                        </p>
                    </div>

                    <Link
                        href={route('admin.van-trips.index')}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                        عرض رحلات سيارات المناديب →
                    </Link>
                </div>

                {/* Shifts Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-4 font-semibold">الكاشير</th>
                                    <th className="p-4 font-semibold">وقت الفتح</th>
                                    <th className="p-4 font-semibold">وقت الإغلاق</th>
                                    <th className="p-4 font-semibold">عهدة البداية</th>
                                    <th className="p-4 font-semibold">مبيعات كاش</th>
                                    <th className="p-4 font-semibold">مبيعات فيزا</th>
                                    <th className="p-4 font-semibold">الكاش الفعلي بالدرج</th>
                                    <th className="p-4 font-semibold">العجز / الزيادة</th>
                                    <th className="p-4 font-semibold">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {shifts.data.map((shift) => (
                                    <tr key={shift.id} className="hover:bg-slate-850/40 transition">
                                        <td className="p-4 font-bold text-white text-sm">{shift.cashier?.name}</td>
                                        <td className="p-4 text-slate-300">
                                            {new Date(shift.opened_at).toLocaleString('ar-EG')}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {shift.closed_at ? new Date(shift.closed_at).toLocaleString('ar-EG') : 'جارية الآن'}
                                        </td>
                                        <td className="p-4 font-mono text-slate-200">{Number(shift.opening_balance).toFixed(2)} ج.م</td>
                                        <td className="p-4 font-mono font-bold text-emerald-400">+{Number(shift.cash_sales).toFixed(2)} ج.م</td>
                                        <td className="p-4 font-mono text-indigo-400">+{Number(shift.card_sales).toFixed(2)} ج.م</td>
                                        <td className="p-4 font-mono text-white font-bold">
                                            {shift.closing_balance !== null ? `${Number(shift.closing_balance).toFixed(2)} ج.م` : '-'}
                                        </td>
                                        <td className="p-4">
                                            {shift.status === 'closed' ? (
                                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                                    shift.variance < 0 ? 'bg-rose-500/10 text-rose-400' :
                                                    shift.variance > 0 ? 'bg-emerald-500/10 text-emerald-400' :
                                                    'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {shift.variance > 0 ? `+${shift.variance}` : shift.variance} ج.م
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4">
                                            {shift.status === 'open' ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    مفتوحة
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                                                    مغلقة
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
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
