import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { ArrowRight, Printer, FileText, Calendar, User, DollarSign } from 'lucide-react';

export default function Show({ invoice, storeSettings }) {
    const profit = Number(invoice.total_amount) - Number(invoice.cost_total);

    const handlePrint = () => {
        window.print();
    };

    return (
        <MerchantLayout title={`فاتورة مبيعات ${invoice.invoice_number}`}>
            <Head title={`فاتورة ${invoice.invoice_number}`} />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.invoices.index')}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                        >
                            <ArrowRight size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-white">فاتورة مبيعات</h1>
                            <div className="text-xs text-indigo-400 font-mono mt-0.5">{invoice.invoice_number}</div>
                        </div>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <Printer size={16} />
                        <span>طباعة الفاتورة</span>
                    </button>
                </div>

                {/* Printable Invoice Container */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                    {/* Invoice Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs p-4 rounded-2xl bg-slate-950 border border-slate-850">
                        <div>
                            <span className="text-slate-400 block">نوع الفاتورة:</span>
                            <span className="font-bold text-white mt-1 block">
                                {invoice.type === 'retail' ? 'كاشير قطاعي' : 'مندوب جملة'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">المسؤول:</span>
                            <span className="font-bold text-white mt-1 block">
                                {invoice.cashier?.name || invoice.sales_rep?.name || 'المدير'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">العميل:</span>
                            <span className="font-bold text-white mt-1 block">
                                {invoice.customer_name || 'عميل نقدي'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">التاريخ والوقت:</span>
                            <span className="font-bold text-white mt-1 block">
                                {new Date(invoice.created_at).toLocaleString('ar-EG')}
                            </span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400">
                                    <th className="p-3.5 font-semibold">الصنف</th>
                                    <th className="p-3.5 font-semibold text-center">الكمية</th>
                                    <th className="p-3.5 font-semibold">سعر الوحدة</th>
                                    <th className="p-3.5 font-semibold">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 text-slate-200">
                                {invoice.items?.map((item) => (
                                    <tr key={item.id}>
                                        <td className="p-3.5 font-bold text-white">{item.product_name}</td>
                                        <td className="p-3.5 text-center font-mono">{item.quantity}</td>
                                        <td className="p-3.5 font-mono">{Number(item.unit_price).toFixed(2)} ج.م</td>
                                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                                            {Number(item.total_price).toFixed(2)} ج.م
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals & Profit Breakdown */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                        <div className="space-y-1">
                            <div className="text-slate-400">
                                تكلفة شراء البضاعة: <strong className="text-slate-300 font-mono">{Number(invoice.cost_total).toFixed(2)} ج.م</strong>
                            </div>
                            <div className="text-slate-400">
                                صافي الربح من الفاتورة: <strong className="text-emerald-400 font-mono font-bold">+{profit.toFixed(2)} ج.م</strong>
                            </div>
                        </div>

                        <div className="text-left sm:text-right">
                            <span className="text-slate-400 text-xs">المبلغ الإجمالي للفاتورة:</span>
                            <div className="text-2xl font-black text-white font-mono mt-0.5">
                                {Number(invoice.total_amount).toFixed(2)} ج.م
                            </div>
                            <span className="text-[11px] text-slate-500">
                                طريقة الدفع: {invoice.payment_method === 'cash' ? 'نقدي' : 'فيزا'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
}
