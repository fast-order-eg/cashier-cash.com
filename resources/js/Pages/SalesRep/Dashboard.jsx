import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { 
    Truck, 
    Gauge, 
    ShoppingCart, 
    Package, 
    Receipt, 
    FileText, 
    Plus, 
    Minus, 
    Trash2, 
    Printer, 
    X, 
    Check, 
    LogOut,
    DollarSign,
    CheckCircle2,
    Fuel,
    MapPin
} from 'lucide-react';

export default function Dashboard({ 
    activeTrip, 
    vanWarehouse, 
    vanProducts, 
    tripInvoices, 
    tripExpenses, 
    expenseCategories 
}) {
    const [activeTab, setActiveTab] = useState('sales'); // sales, inventory, expenses, invoices
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Modals
    const [startTripModal, setStartTripModal] = useState(!activeTrip);
    const [endTripModal, setEndTripModal] = useState(false);
    const [startOdoInput, setStartOdoInput] = useState('');
    const [endOdoInput, setEndOdoInput] = useState('');
    const [cashHandover, setCashHandover] = useState(activeTrip?.total_cash_collected || '');
    const [receiptModal, setReceiptModal] = useState(null);

    // Expense Form
    const [expenseModal, setExpenseModal] = useState(false);
    const [expTitle, setExpTitle] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expCatId, setExpCatId] = useState(expenseCategories[0]?.id || '');

    // Add product to wholesale cart
    const addToCart = (product) => {
        setCart(prev => {
            const index = prev.findIndex(item => item.product_id === product.id);
            if (index > -1) {
                const updated = [...prev];
                updated[index].quantity += 1;
                return updated;
            } else {
                return [...prev, {
                    product_id: product.id,
                    name: product.name,
                    wholesale_price: product.wholesale_price,
                    quantity: 1,
                    unit: product.unit || 'قطعة',
                }];
            }
        });
    };

    const updateQuantity = (index, delta) => {
        setCart(prev => {
            const updated = [...prev];
            const newQty = updated[index].quantity + delta;
            if (newQty <= 0) return updated.filter((_, idx) => idx !== index);
            updated[index].quantity = newQty;
            return updated;
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.wholesale_price * item.quantity), 0);

    const handleCheckout = async () => {
        if (!customerName.trim()) {
            alert('يرجى إدخال اسم العميل / المحل التجاري');
            return;
        }
        if (cart.length === 0) {
            alert('السلة فارغة، يرجى اختيار بضاعة للبيع');
            return;
        }

        try {
            const res = await axios.post(route('vansales.checkout'), {
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.wholesale_price,
                })),
                paid_amount: cartTotal,
                payment_method: paymentMethod,
            });

            if (res.data.success) {
                setReceiptModal(res.data.invoice);
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                router.reload();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'حدث خطأ أثناء إصدار الفاتورة');
        }
    };

    const handleStartTrip = (e) => {
        e.preventDefault();
        router.post(route('vansales.trip.start'), { start_odometer: startOdoInput }, {
            onSuccess: () => setStartTripModal(false)
        });
    };

    const handleEndTrip = (e) => {
        e.preventDefault();
        router.post(route('vansales.trip.end'), {
            end_odometer: endOdoInput,
            total_cash_collected: cashHandover,
        }, {
            onSuccess: () => setEndTripModal(false)
        });
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        router.post(route('vansales.expense'), {
            title: expTitle,
            amount: expAmount,
            category_id: expCatId,
        }, {
            onSuccess: () => {
                setExpenseModal(false);
                setExpTitle('');
                setExpAmount('');
            }
        });
    };

    return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Head title="واجهة مندوب سيارات الجملة (Van Sales)" />

            {/* Top Navigation */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                        <Truck size={20} />
                    </div>
                    <div>
                        <div className="font-extrabold text-sm text-white">
                            {vanWarehouse ? vanWarehouse.name : 'سيارة التوزيع'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {vanWarehouse?.vehicle_plate || 'مبيعات الجملة'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {activeTrip ? (
                        <button
                            onClick={() => setEndTripModal(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                        >
                            <Gauge size={14} />
                            <span>إنهاء الوردية والعداد</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setStartTripModal(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                            + بدء وردية السيارة
                        </button>
                    )}

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <LogOut size={16} />
                    </Link>
                </div>
            </header>

            {/* Odometer & Today Stats Banner */}
            {activeTrip && (
                <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Gauge size={16} className="text-indigo-400" />
                        <span>عداد بداية اليوم: <strong className="text-white font-mono">{activeTrip.start_odometer} كم</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-400">
                            المبيعات: <strong className="text-emerald-400 font-mono">{activeTrip.total_sales} ج.م</strong>
                        </span>
                        <span className="text-slate-400 hidden sm:inline">
                            كاش محصل: <strong className="text-indigo-400 font-mono">{activeTrip.total_cash_collected} ج.م</strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Mobile Tab Navigation */}
            <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-around text-xs font-bold p-1">
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'sales' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                >
                    <ShoppingCart size={15} />
                    <span>البيع بالجملة</span>
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'inventory' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                >
                    <Package size={15} />
                    <span>بضاعة السيارة ({vanProducts.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'expenses' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                >
                    <Fuel size={15} />
                    <span>مصاريف ({tripExpenses.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                >
                    <FileText size={15} />
                    <span>فواتير اليوم ({tripInvoices.length})</span>
                </button>
            </div>

            {/* Main Tab Content */}
            <main className="flex-1 p-4 overflow-y-auto max-w-5xl mx-auto w-full">
                {/* 1. Wholesale POS Tab */}
                {activeTab === 'sales' && (
                    <div className="space-y-6">
                        {/* Customer Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                            <span className="font-bold text-white block">بيانات العميل / السوبرماركت</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="اسم المحل أو التاجر (مطلوب)"
                                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                                />
                                <input
                                    type="text"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="رقم الهاتف (اختياري)"
                                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                                />
                            </div>
                        </div>

                        {/* Cart Summary (if has items) */}
                        {cart.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                                    <span className="font-bold text-white">البضاعة المختارة في الفاتورة ({cart.length})</span>
                                    <button onClick={() => setCart([])} className="text-rose-400 font-semibold">تفريغ</button>
                                </div>

                                <div className="space-y-2 text-xs">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                                            <div className="truncate flex-1">
                                                <div className="font-bold text-white truncate">{item.name}</div>
                                                <div className="text-indigo-400 font-mono text-[11px]">
                                                    {item.wholesale_price} ج.م × {item.quantity} = {(item.wholesale_price * item.quantity).toFixed(2)} ج.م
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(idx, -1)}
                                                    className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="font-bold text-white font-mono w-5 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(idx, 1)}
                                                    className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                                    <span className="font-bold text-white text-sm">الإجمالي بالجملة:</span>
                                    <span className="text-2xl font-black text-emerald-400 font-mono">{cartTotal.toFixed(2)} ج.م</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                                >
                                    <Printer size={16} />
                                    <span>إصدار فاتورة جملة وطباعتها</span>
                                </button>
                            </div>
                        )}

                        {/* Available Products in Van */}
                        <div className="space-y-3">
                            <span className="font-bold text-white text-sm block">اختر من بضاعة السيارة (أسعار الجملة):</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {vanProducts.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => addToCart(p)}
                                        className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl cursor-pointer transition active:scale-98 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-white text-xs">{p.name}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                المتبقي بالسيارة: <strong className="text-white">{p.stock_in_van} {p.unit}</strong>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-black text-indigo-400 font-mono">
                                                {p.wholesale_price} ج.م
                                            </span>
                                            <span className="block text-[10px] text-slate-500">سعر جملة</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Truck Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="font-bold text-white text-base">جرد بضاعة السيارة الحالية</h3>
                                <p className="text-slate-400 text-xs">الأصناف المتوفرة داخل عهدة السيارة الآن</p>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                {vanProducts.length} صنف
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="pb-3 font-semibold">الصنف</th>
                                        <th className="pb-3 font-semibold">القسم</th>
                                        <th className="pb-3 font-semibold">سعر الجملة</th>
                                        <th className="pb-3 font-semibold text-center">الكمية المتوفرة بالسيارة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850">
                                    {vanProducts.map((p) => (
                                        <tr key={p.id}>
                                            <td className="py-3 font-bold text-white">{p.name}</td>
                                            <td className="py-3 text-slate-400">{p.category_name}</td>
                                            <td className="py-3 font-mono text-indigo-400 font-bold">{p.wholesale_price} ج.م</td>
                                            <td className="py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                                                    p.stock_in_van > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                }`}>
                                                    {p.stock_in_van} {p.unit}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. Expenses Tab */}
                {activeTab === 'expenses' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-base">مصاريف السيارة والرحلة</h3>
                            <button
                                onClick={() => setExpenseModal(true)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
                            >
                                <Plus size={15} />
                                <span>تسجيل بنزين / كارتة</span>
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="p-3 font-semibold">البيان</th>
                                        <th className="p-3 font-semibold">القسم</th>
                                        <th className="p-3 font-semibold">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850">
                                    {tripExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-6 text-center text-slate-500">لا توجد مصاريف مسجلة اليوم</td>
                                        </tr>
                                    ) : (
                                        tripExpenses.map((exp) => (
                                            <tr key={exp.id}>
                                                <td className="p-3 font-bold text-white">{exp.title}</td>
                                                <td className="p-3 text-slate-400">{exp.category?.name}</td>
                                                <td className="p-3 font-mono font-bold text-rose-400">{exp.amount} ج.م</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. Invoices Tab */}
                {activeTab === 'invoices' && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-white text-base">سجل فواتير الجملة اليوم</h3>
                        <div className="space-y-2.5">
                            {tripInvoices.map((inv) => (
                                <div key={inv.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-bold text-white text-sm">{inv.customer_name}</div>
                                        <div className="text-slate-400 mt-0.5 font-mono">{inv.invoice_number} • {new Date(inv.created_at).toLocaleTimeString('ar-EG')}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-black text-emerald-400 font-mono">{inv.total_amount} ج.م</div>
                                        <span className="text-[10px] text-slate-400">{inv.payment_method === 'cash' ? 'كاش نقدي' : 'آجل'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal: Start Trip Odometer */}
            {startTripModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                            <Gauge size={24} />
                        </div>
                        <h2 className="text-lg font-black text-white">تسجيل عداد بداية اليوم</h2>
                        <p className="text-slate-400 text-xs">أدخل قراءة عداد الكيلومترات للسيارة في بداية اليومية لبدء خط السير</p>

                        <form onSubmit={handleStartTrip} className="space-y-4 text-xs">
                            <div>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    value={startOdoInput}
                                    onChange={(e) => setStartOdoInput(e.target.value)}
                                    placeholder="مثال: 125400"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-black text-white font-mono"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 block">قراءة العداد بالكيلومتر (كم)</span>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                            >
                                تسجيل وبدء الوردية
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: End Trip Odometer & Handover */}
            {endTripModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">إنهاء وردية السيارة وتوريد الكاش</span>
                            <button onClick={() => setEndTripModal(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400">
                                <span>عداد بداية اليوم:</span>
                                <span className="font-mono text-white font-bold">{activeTrip?.start_odometer} كم</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>إجمالي مبيعات اليوم:</span>
                                <span className="font-mono text-emerald-400 font-bold">{activeTrip?.total_sales} ج.م</span>
                            </div>
                        </div>

                        <form onSubmit={handleEndTrip} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    قراءة عداد نهاية اليوم (كم)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={activeTrip?.start_odometer || 0}
                                    value={endOdoInput}
                                    onChange={(e) => setEndOdoInput(e.target.value)}
                                    placeholder="أدخل العداد النهائي"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-bold"
                                />
                                {endOdoInput && Number(endOdoInput) >= Number(activeTrip?.start_odometer) && (
                                    <div className="text-[11px] text-emerald-400 text-center mt-1">
                                        المسافة المقطوعة اليوم: <strong>{Number(endOdoInput) - Number(activeTrip?.start_odometer)} كم</strong>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    المبلغ الكاش المورد للمتجر (ج.م)
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={cashHandover}
                                    onChange={(e) => setCashHandover(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-bold text-emerald-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                            >
                                إغلاق الرحلة وتصفية الحساب
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Expense */}
            {expenseModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">تسجيل مصروف للسيارة</span>
                            <button onClick={() => setExpenseModal(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">بيان المصروف</label>
                                <input
                                    type="text"
                                    required
                                    value={expTitle}
                                    onChange={(e) => setExpTitle(e.target.value)}
                                    placeholder="مثال: بنزين 92 أو كارتة طريق"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">المبلغ (ج.م)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={expAmount}
                                    onChange={(e) => setExpAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">القسم</label>
                                <select
                                    value={expCatId}
                                    onChange={(e) => setExpCatId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                                >
                                    {expenseCategories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                            >
                                حفظ المصروف
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Thermal Wholesale Receipt */}
            {receiptModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">فاتورة بيع جملة</span>
                            <button onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-white text-black p-4 rounded-xl text-right text-xs space-y-1.5 font-mono border border-gray-300">
                            <div className="text-center font-bold text-sm">فاتورة جملة - سيارات التوزيع</div>
                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div>رقم الفاتورة: {receiptModal.invoice_number}</div>
                            <div>العميل: {receiptModal.customer_name}</div>
                            <div>التاريخ: {new Date().toLocaleString('ar-EG')}</div>
                            <div>المندوب: {vanWarehouse?.sales_rep?.name}</div>
                            <div className="border-b border-dashed border-gray-400 my-1" />

                            <div className="space-y-1 text-[11px]">
                                {receiptModal.items?.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{it.name || it.product_name} × {it.quantity}</span>
                                        <span className="font-bold">{(it.unit_price * it.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div className="flex justify-between font-black text-sm">
                                <span>الإجمالي:</span>
                                <span>{Number(receiptModal.total_amount).toFixed(2)} ج.م</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                                <Printer size={15} />
                                <span>طباعة الفاتورة</span>
                            </button>
                            <button
                                onClick={() => setReceiptModal(null)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
