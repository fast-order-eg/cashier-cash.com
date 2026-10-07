import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import MerchantLayout from '@/Layouts/MerchantLayout';
import { 
    Warehouse, 
    Truck, 
    Plus, 
    Send, 
    Package, 
    User, 
    History, 
    X, 
    CheckCircle,
    Trash2,
    ChevronDown
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Index({ warehouses, sales_reps, products, recent_dispatches }) {
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [newWarehouseModalOpen, setNewWarehouseModalOpen] = useState(false);

    // دالة لتنظيف اسم سيارة المندوب ومنع التكرار وحذف كلمة "سيارة توزيع"
    const getVanLabel = (w) => {
        if (!w) return '';
        const repName = w.sales_rep?.name ? w.sales_rep.name.replace(/\(.*?\)/g, '').trim() : '';
        const plate = w.vehicle_plate ? ` (${w.vehicle_plate})` : '';
        if (repName) {
            return `${repName}${plate}`;
        }
        const cleanName = (w.name || '').replace(/سيارة\s*(توزيع)?\s*/g, '').replace(/\(.*?\)/g, '').trim();
        return `${cleanName || 'سيارة'}${plate}`;
    };

    // Form to create new warehouse/van
    const { 
        data: whData, 
        setData: setWhData, 
        post: postWh, 
        processing: processingWh, 
        reset: resetWh 
    } = useForm({
        name: '',
        type: 'van',
        sales_rep_id: sales_reps[0]?.id || '',
        vehicle_plate: '',
    });

    // Form for stock dispatch / transfer
    const mainWh = warehouses.find(w => w.type === 'main') || warehouses[0];
    const vanWhs = warehouses.filter(w => w.type === 'van');

    const { 
        data: dispData, 
        setData: setDispData, 
        post: postDisp, 
        processing: processingDisp, 
        reset: resetDisp,
        errors: dispErrors 
    } = useForm({
        from_warehouse_id: mainWh?.id || '',
        to_warehouse_id: vanWhs[0]?.id || '',
        items: [{ product_id: products[0]?.id || '', quantity: 10 }],
        notes: '',
    });

    const addDispatchItem = () => {
        setDispData('items', [...dispData.items, { product_id: products[0]?.id || '', quantity: 10 }]);
    };

    const removeDispatchItem = (index) => {
        setDispData('items', dispData.items.filter((_, idx) => idx !== index));
    };

    const updateDispatchItem = (index, field, value) => {
        const updated = [...dispData.items];
        updated[index][field] = value;
        setDispData('items', updated);
    };

    const handleCreateWarehouse = (e) => {
        e.preventDefault();
        postWh('/admin/warehouses', {
            onSuccess: () => {
                setNewWarehouseModalOpen(false);
                resetWh();
            }
        });
    };

    const handleDispatchSubmit = (e) => {
        e.preventDefault();
        postDisp('/admin/warehouses/dispatch', {
            onSuccess: () => {
                setDispatchModalOpen(false);
                resetDisp();
            }
        });
    };

    return (
        <MerchantLayout title="المخازن وسيارات التوزيع">
            <Head title="إدارة المخازن وسيارات التوزيع" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">المخازن وسيارات التوزيع</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            متابعة المخزن الرئيسي، بضاعة سيارات المناديب (Van Sales)، وإذن صرف وتحميل البضاعة
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setNewWarehouseModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <Plus size={15} />
                            <span>إضافة سيارة / مخزن</span>
                        </button>
                        <button
                            onClick={() => setDispatchModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                        >
                            <Send size={15} />
                            <span>إذن صرف بضاعة لسيارة</span>
                        </button>
                    </div>
                </div>

                {/* Warehouses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((wh) => (
                        <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                                        wh.type === 'main' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                        {wh.type === 'main' ? <Warehouse size={22} /> : <Truck size={22} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">
                                            {wh.type === 'van' ? getVanLabel(wh) : wh.name}
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {wh.type === 'main' ? 'المستودع الرئيسي للمحل' : (wh.vehicle_plate ? `لوحة: ${wh.vehicle_plate}` : 'سيارة مندوب')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {wh.type === 'van' && wh.sales_rep && (
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-850 flex items-center gap-2.5 text-xs text-slate-300">
                                    <User size={15} className="text-indigo-400" />
                                    <span>المندوب المسؤول: <strong className="text-white">{wh.sales_rep.name.replace(/\(.*?\)/g, '').trim()}</strong></span>
                                </div>
                            )}

                            {/* Inventory List in Warehouse */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                                    <span>الأصناف المتوفرة بالداخل:</span>
                                    <span className="text-indigo-400">{wh.product_stocks?.length || 0} صنف</span>
                                </div>

                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                    {wh.product_stocks?.length === 0 ? (
                                        <div className="text-slate-500 text-[11px] py-2 text-center">لا توجد بضاعة حالياً</div>
                                    ) : (
                                        wh.product_stocks?.map((ps) => (
                                            <div key={ps.id} className="p-2 rounded-xl bg-slate-950 border border-slate-850/60 flex items-center justify-between text-xs">
                                                <span className="text-slate-200 truncate max-w-[160px]">{ps.product?.name}</span>
                                                <span className="font-mono font-bold text-emerald-400">
                                                    {Math.round(ps.quantity)} {ps.product?.unit}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Dispatches */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                        <History size={18} className="text-indigo-400" />
                        <h3 className="font-bold text-white text-base">سجل أذونات الصرف وحركات نقل البضاعة</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="pb-3 font-semibold">رقم الإذن</th>
                                    <th className="pb-3 font-semibold">من مخزن</th>
                                    <th className="pb-3 font-semibold">إلى سيارة / مخزن</th>
                                    <th className="pb-3 font-semibold">المنفذ</th>
                                    <th className="pb-3 font-semibold">عدد البنود</th>
                                    <th className="pb-3 font-semibold">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {recent_dispatches.map((disp) => (
                                    <tr key={disp.id} className="hover:bg-slate-850/40">
                                        <td className="py-3 font-mono font-bold text-indigo-400">{disp.reference_number}</td>
                                        <td className="py-3 text-slate-300">{disp.from_warehouse?.name}</td>
                                        <td className="py-3 text-emerald-400 font-semibold">
                                            {disp.to_warehouse?.type === 'van' ? getVanLabel(disp.to_warehouse) : disp.to_warehouse?.name}
                                        </td>
                                        <td className="py-3 text-slate-400">{disp.dispatcher?.name || 'المدير'}</td>
                                        <td className="py-3">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-mono">
                                                {formatNumber(disp.items?.length || 0)} صنف
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-400">{formatDateTime(disp.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Dispatch Stock */}
            {dispatchModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Send size={16} className="text-indigo-400" />
                                <span>إذن صرف وتحميل بضاعة لسيارة المندوب</span>
                            </h3>
                            <button onClick={() => setDispatchModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">من مخزن (المرسل)</label>
                                    <div className="relative">
                                        <select
                                            value={dispData.from_warehouse_id}
                                            onChange={(e) => setDispData('from_warehouse_id', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">إلى سيارة المندوب (المستقبل)</label>
                                    <div className="relative">
                                        <select
                                            value={dispData.to_warehouse_id}
                                            onChange={(e) => setDispData('to_warehouse_id', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                            style={{ backgroundImage: 'none' }}
                                        >
                                            {vanWhs.map((w) => (
                                                <option key={w.id} value={w.id}>{getVanLabel(w)}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-white">الأصناف المطلوب صرفها:</span>
                                    <button
                                        type="button"
                                        onClick={addDispatchItem}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px]"
                                    >
                                        + إضافة صنف آخر
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {dispData.items.map((item, index) => (
                                        <div key={index} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                                            <div className="flex-1 relative">
                                                <select
                                                    value={item.product_id}
                                                    onChange={(e) => updateDispatchItem(index, 'product_id', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-1.5 text-white appearance-none focus:outline-none focus:border-indigo-500 text-xs"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} (رصيد المخزن: {Math.round(p.stock_quantity ?? 0)})
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>

                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateDispatchItem(index, 'quantity', e.target.value ? parseInt(e.target.value, 10) || 0 : '')}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-center font-bold"
                                                />
                                            </div>

                                            {dispData.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeDispatchItem(index)}
                                                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">ملاحظات الإذن</label>
                                <input
                                    type="text"
                                    value={dispData.notes}
                                    onChange={(e) => setDispData('notes', e.target.value)}
                                    placeholder="مثال: تحميل صباحي لخط سير الدقي"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setDispatchModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingDisp}
                                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                                >
                                    {processingDisp ? 'جاري الصرف...' : 'اعتماد وصرف البضاعة للسيارة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Van / Warehouse */}
            {newWarehouseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-white text-sm">إضافة سيارة مندوب / مخزن فرعي</h3>
                            <button onClick={() => setNewWarehouseModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">اسم المخزن / السيارة</label>
                                <input
                                    type="text"
                                    required
                                    value={whData.name}
                                    onChange={(e) => setWhData('name', e.target.value)}
                                    placeholder="مثال: سيارة توزيع رقم 2"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">النوع</label>
                                <div className="relative">
                                    <select
                                        value={whData.type}
                                        onChange={(e) => setWhData('type', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                        style={{ backgroundImage: 'none' }}
                                    >
                                        <option value="van">سيارة توزيع مندوب (Van)</option>
                                        <option value="main">مستودع فرعي ثابت</option>
                                    </select>
                                    <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {whData.type === 'van' && (
                                <>
                                    <div>
                                        <label className="block font-semibold text-slate-300 mb-1">المندوب المسؤول</label>
                                        <div className="relative">
                                            <select
                                                value={whData.sales_rep_id}
                                                onChange={(e) => setWhData('sales_rep_id', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                                style={{ backgroundImage: 'none' }}
                                            >
                                                <option value="">اختر مندوب</option>
                                                {sales_reps.map((sr) => (
                                                    <option key={sr.id} value={sr.id}>{sr.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-slate-300 mb-1">رقم لوحة السيارة</label>
                                        <input
                                            type="text"
                                            value={whData.vehicle_plate}
                                            onChange={(e) => setWhData('vehicle_plate', e.target.value)}
                                            placeholder="ط س ع 5678"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setNewWarehouseModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingWh}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                >
                                    {processingWh ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MerchantLayout>
    );
}
