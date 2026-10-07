import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    MapPin,
    ChevronDown,
    User,
    AlertCircle,
    Share2,
    Copy,
    Eye
} from 'lucide-react';
import SubscriptionExpiredModal from '@/Components/SubscriptionExpiredModal';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Dashboard({ 
    activeTrip, 
    vanWarehouse, 
    vanProducts, 
    tripInvoices, 
    tripExpenses, 
    expenseCategories 
}) {
    const { impersonation, auth, flash, tenant } = usePage().props;
    const [activeTab, setActiveTab] = useState('sales'); // sales, inventory, expenses, invoices
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Modals
    const [startTripModal, setStartTripModal] = useState(!activeTrip && !tenant?.is_subscription_expired);
    const [endTripModal, setEndTripModal] = useState(false);
    const [subscriptionExpiredModalOpen, setSubscriptionExpiredModalOpen] = useState(false);
    const [startOdoInput, setStartOdoInput] = useState('');
    const [endOdoInput, setEndOdoInput] = useState('');
    const [cashHandover, setCashHandover] = useState(activeTrip?.total_cash_collected || '');
    const [receiptModal, setReceiptModal] = useState(null);
    const [copiedToast, setCopiedToast] = useState(false);

    // Expense Form
    const [expenseModal, setExpenseModal] = useState(false);
    const [expTitle, setExpTitle] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expCatId, setExpCatId] = useState(expenseCategories[0]?.id || '');

    // Format invoice text for sharing & copying
    const getInvoiceShareText = (receipt) => {
        if (!receipt) return '';
        const dateStr = receipt.created_at ? formatDateTime(receipt.created_at) : formatDateTime(new Date());
        const repName = auth?.user?.name || vanWarehouse?.sales_rep?.name || 'مندوب التوزيع';
        const vanName = vanWarehouse ? `${vanWarehouse.name} (${vanWarehouse.vehicle_plate || ''})` : '';
        
        let text = `🧾 *فاتورة مبيعات جملة*\n`;
        text += `🏢 المتجر: ${tenant?.name || 'المتجر'}\n`;
        if (vanName) text += `🚚 السيارة: ${vanName}\n`;
        text += `👤 المندوب: ${repName}\n`;
        text += `🔢 رقم الفاتورة: ${receipt.invoice_number}\n`;
        text += `🏪 العميل: ${receipt.customer_name}\n`;
        text += `📅 التاريخ: ${dateStr}\n`;
        text += `------------------------\n`;
        text += `📦 *الأصناف:*\n`;
        receipt.items?.forEach((item, i) => {
            const pName = item.name || item.product_name;
            const qty = formatNumber(item.quantity);
            const total = formatCurrency(item.unit_price * item.quantity);
            text += `${i + 1}. ${pName} (${qty} × ${formatNumber(item.unit_price)} ج.م) = ${total}\n`;
        });
        text += `------------------------\n`;
        text += `💰 *الإجمالي: ${formatCurrency(receipt.total_amount)}*\n`;
        text += `💵 طريقة الدفع: ${receipt.payment_method === 'cash' ? 'كاش نقدي' : 'آجل'}\n`;
        return text;
    };

    const handleCopyInvoiceText = async (receipt) => {
        const text = getInvoiceShareText(receipt);
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
            setCopiedToast(true);
            setTimeout(() => setCopiedToast(false), 2500);
        } catch (e) {
            alert('تعذر النسخ التلقائي');
        }
    };

    const handleShareInvoice = async (receipt) => {
        const text = getInvoiceShareText(receipt);
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `فاتورة رقم ${receipt.invoice_number}`,
                    text: text,
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        await handleCopyInvoiceText(receipt);
    };

    // Add product to wholesale cart
    const addToCart = (product) => {
        const availableStock = Number(product.stock_in_van) || 0;
        if (availableStock <= 0) {
            alert('الكمية المتاحة بالسيارة من هذا المنتج نفدت بالكامل!');
            return;
        }

        setCart(prev => {
            const index = prev.findIndex(item => item.product_id === product.id);
            if (index > -1) {
                const currentQty = Number(prev[index].quantity) || 0;
                if (currentQty + 1 > availableStock) {
                    alert(`أقصى كمية متوفرة بالسيارة لهذا الصنف هي ${availableStock} ${product.unit || 'قطعة'}`);
                    return prev;
                }
                const updated = [...prev];
                updated[index].quantity = currentQty + 1;
                return updated;
            } else {
                return [...prev, {
                    product_id: product.id,
                    name: product.name,
                    wholesale_price: Number(product.wholesale_price) || 0,
                    quantity: 1,
                    unit: product.unit || 'قطعة',
                    max_stock: availableStock,
                }];
            }
        });
    };

    // Update quantity by delta (+1 / -1)
    const updateQuantity = (index, delta) => {
        setCart(prev => {
            const updated = [...prev];
            const item = updated[index];
            if (!item) return prev;

            const maxStock = item.max_stock ?? (vanProducts.find(p => p.id === item.product_id)?.stock_in_van || 999999);
            const currentQty = Number(item.quantity) || 0;
            const newQty = currentQty + delta;

            if (newQty <= 0) {
                return updated.filter((_, idx) => idx !== index);
            }
            if (newQty > maxStock) {
                alert(`أقصى كمية متوفرة بالسيارة لهذا الصنف هي ${maxStock} ${item.unit || 'قطعة'}`);
                item.quantity = maxStock;
                return updated;
            }

            item.quantity = newQty;
            return updated;
        });
    };

    // Set manual quantity directly when user types in the input
    const setManualQuantity = (index, rawValue) => {
        if (rawValue === '') {
            setCart(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index].quantity = '';
                return updated;
            });
            return;
        }

        const parsed = parseFloat(rawValue);
        if (isNaN(parsed) || parsed < 0) return;

        setCart(prev => {
            const updated = [...prev];
            const item = updated[index];
            if (!item) return prev;

            const maxStock = item.max_stock ?? (vanProducts.find(p => p.id === item.product_id)?.stock_in_van || 999999);
            if (parsed > maxStock) {
                alert(`أقصى كمية متوفرة بالسيارة لهذا الصنف هي ${maxStock} ${item.unit || 'قطعة'}`);
                item.quantity = maxStock;
            } else {
                item.quantity = parsed;
            }
            return updated;
        });
    };

    // Handle blur on manual input to ensure it is at least 1
    const handleManualQuantityBlur = (index) => {
        setCart(prev => {
            const updated = [...prev];
            const item = updated[index];
            if (!item) return prev;

            if (!item.quantity || Number(item.quantity) <= 0) {
                item.quantity = 1;
            }
            return updated;
        });
    };

    // Remove single item from cart
    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, idx) => idx !== index));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.wholesale_price * (Number(item.quantity) || 0)), 0);

    const handleCheckout = async () => {
        if (tenant?.is_subscription_expired) {
            setSubscriptionExpiredModalOpen(true);
            return;
        }

        if (!customerName.trim()) {
            alert('يرجى إدخال اسم العميل / المحل التجاري');
            return;
        }
        if (cart.length === 0) {
            alert('السلة فارغة، يرجى اختيار بضاعة للبيع');
            return;
        }

        const invalidItem = cart.find(it => !it.quantity || Number(it.quantity) <= 0);
        if (invalidItem) {
            alert(`يرجى تحديد كمية صحيحة للمنتج: ${invalidItem.name}`);
            return;
        }

        try {
            const res = await axios.post('/van-sales/checkout', {
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: Number(item.quantity),
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
            alert(err.response?.data?.message || err.response?.data?.error || 'حدث خطأ أثناء إصدار الفاتورة');
        }
    };

    const handleStartTrip = (e) => {
        e.preventDefault();
        if (tenant?.is_subscription_expired) {
            setStartTripModal(false);
            setSubscriptionExpiredModalOpen(true);
            return;
        }
        router.post('/van-sales/trip/start', { start_odometer: startOdoInput }, {
            onSuccess: (page) => {
                if (page.props.activeTrip) {
                    setStartTripModal(false);
                }
            }
        });
    };

    const handleEndTrip = (e) => {
        e.preventDefault();
        router.post('/van-sales/trip/end', {
            end_odometer: endOdoInput,
            total_cash_collected: cashHandover,
        }, {
            onSuccess: (page) => {
                if (!page.props.activeTrip) {
                    setEndTripModal(false);
                }
            }
        });
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (tenant?.is_subscription_expired) {
            setExpenseModal(false);
            setSubscriptionExpiredModalOpen(true);
            return;
        }
        router.post('/van-sales/expense', {
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

            {/* Impersonation Banner */}
            {impersonation?.active && (
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-amber-600 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-950 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                            وضع السوبر أدمن
                        </span>
                        <span className="text-slate-900 font-extrabold">
                            أنت الآن تتصفح واجهة المندوب وسيارات الجملة منتحلاً هوية: <span className="underline">{impersonation.user_name || 'مندوب التوزيع'}</span>
                        </span>
                    </div>
                    <a 
                        href={impersonation.leave_url || '/admin/impersonate-leave'} 
                        className="bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                        إنهاء المعاينة والعودة للسوبر أدمن ←
                    </a>
                </div>
            )}

            {/* Subscription Expired Sticky Alert Banner */}
            {tenant?.is_subscription_expired && (
                <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/40 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-0 z-50 flex-shrink-0 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1.5">
                            <AlertCircle size={15} className="text-rose-400 animate-bounce" />
                            <span>انتهى اشتراك المتجر!</span>
                        </span>
                        <span className="text-rose-100 font-medium">
                            عمليات التوزيع والبيع والمصروفات متوقفة حالياً. يرجى تجديد الاشتراك لاستئناف العمليات.
                        </span>
                    </div>
                    <a
                        href="/admin/subscriptions"
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1 active:scale-95"
                    >
                        <span>تجديد الاشتراك الآن</span>
                        <ChevronDown size={14} className="rotate-90" />
                    </a>
                </div>
            )}

            {/* Top Navigation */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold flex-shrink-0">
                        <Truck size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[110px] sm:max-w-none">
                                {vanWarehouse ? vanWarehouse.name : 'سيارة التوزيع'}
                            </span>
                            {vanWarehouse?.vehicle_plate && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700 flex-shrink-0">
                                    {vanWarehouse.vehicle_plate}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-indigo-300/90 font-medium truncate">
                            <User size={11} className="text-indigo-400 flex-shrink-0" />
                            <span className="truncate">المندوب: <strong className="text-white">{auth?.user?.name || 'غير محدد'}</strong></span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {activeTrip ? (
                        <button
                            onClick={() => setEndTripModal(true)}
                            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                            title="قفل العداد وإنهاء وردية اليوم وتوريد النقدية"
                        >
                            <Gauge size={13} className="text-amber-400" />
                            <span className="hidden xs:inline">قفل العداد والوردية</span>
                            <span className="xs:hidden">قفل العداد</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (tenant?.is_subscription_expired) {
                                    setSubscriptionExpiredModalOpen(true);
                                } else {
                                    setStartTripModal(true);
                                }
                            }}
                            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95"
                            title="بدء وردية جديدة للسيارة وتسجيل قراءة العداد"
                        >
                            <Gauge size={13} />
                            <span className="hidden xs:inline">+ بدء وردية السيارة</span>
                            <span className="xs:hidden">+ بدء الوردية</span>
                        </button>
                    )}

                    <a
                        href="/logout"
                        className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition border border-slate-700/60 active:scale-95"
                        title="تسجيل الخروج"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">خروج</span>
                    </a>
                </div>
            </header>

            {/* Flash Messages */}
            {flash?.error && (
                <div className="bg-rose-500/20 border-b border-rose-500/30 text-rose-300 px-4 py-2 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0 text-rose-400" />
                    <span>{flash.error}</span>
                </div>
            )}
            {flash?.success && (
                <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-400" />
                    <span>{flash.success}</span>
                </div>
            )}

            {/* Warning if no vehicle assigned */}
            {!vanWarehouse && (
                <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 px-4 py-3 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 text-amber-400" />
                        <span><strong>تنبيه:</strong> لم يتم تخصيص سيارة توزيع لهذا الحساب بعد. يرجى من إدارة المتجر تعيين سيارة لك من لوحة التحكم (المخازن) لتتمكن من تسجيل العداد وبدء البيع.</span>
                    </div>
                </div>
            )}

            {/* Odometer & Status Banner */}
            {activeTrip ? (
                <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Gauge size={16} className="text-indigo-400" />
                        <span>عداد بداية اليوم: <strong className="text-white font-mono">{formatNumber(activeTrip.start_odometer)} كم</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-400">
                            المبيعات: <strong className="text-emerald-400 font-mono">{formatCurrency(activeTrip.total_sales)}</strong>
                        </span>
                        <span className="text-slate-400 hidden sm:inline">
                            كاش محصل: <strong className="text-indigo-400 font-mono">{formatCurrency(activeTrip.total_cash_collected)}</strong>
                        </span>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-300">
                        <AlertCircle size={15} className="flex-shrink-0" />
                        <span>الوردية غير مبدوءة حالياً (العداد مقفول). اضغط على <strong>"+ بدء وردية السيارة"</strong> لتسجيل عداد البداية وبدء البيع بالجملة.</span>
                    </div>
                </div>
            )}

            {/* Mobile Tab Navigation */}
            <div className="bg-slate-900 border-b border-slate-800 flex items-center p-1.5 gap-1 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                        activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <ShoppingCart size={14} className="flex-shrink-0" />
                    <span>البيع</span>
                    {cart.length > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono font-black">
                            {cart.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 min-w-[85px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                        activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <Package size={14} className="flex-shrink-0" />
                    <span>البضاعة</span>
                    <span className="text-[10px] opacity-75 font-mono">({formatNumber(vanProducts.length)})</span>
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                        activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <Fuel size={14} className="flex-shrink-0" />
                    <span>مصاريف</span>
                    <span className="text-[10px] opacity-75 font-mono">({formatNumber(tripExpenses.length)})</span>
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                        activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <FileText size={14} className="flex-shrink-0" />
                    <span>الفواتير</span>
                    <span className="text-[10px] opacity-75 font-mono">({formatNumber(tripInvoices.length)})</span>
                </button>
            </div>

            {/* Main Tab Content */}
            <main className="flex-1 p-3 sm:p-4 overflow-y-auto max-w-5xl mx-auto w-full">
                {/* 1. Wholesale POS Tab */}
                {activeTab === 'sales' && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Customer Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-xs">
                            <span className="font-bold text-white block">بيانات العميل / السوبرماركت</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="اسم المحل أو التاجر (مطلوب)"
                                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="text"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="رقم الهاتف (اختياري)"
                                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Cart Summary (if has items) */}
                        {cart.length > 0 && (
                            <div className="bg-slate-900 border border-indigo-500/30 shadow-xl rounded-2xl p-3.5 sm:p-4 space-y-3">
                                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
                                    <div className="flex items-center gap-1.5 font-bold text-white">
                                        <ShoppingCart size={15} className="text-indigo-400" />
                                        <span>البضاعة المختارة في الفاتورة ({cart.length})</span>
                                    </div>
                                    {/* زرار تفريغ السلة بعلامة السلة / الحذف */}
                                    <button 
                                        type="button"
                                        onClick={() => setCart([])} 
                                        className="p-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                                        title="تفريغ السلة بالكامل"
                                    >
                                        <Trash2 size={13} />
                                        <span className="text-[11px]">تفريغ</span>
                                    </button>
                                </div>

                                <div className="space-y-2 text-xs">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 transition hover:border-slate-700">
                                            <div className="truncate flex-1 min-w-0">
                                                <div className="font-bold text-white text-xs truncate">{item.name}</div>
                                                <div className="text-indigo-400 font-mono text-[11px] mt-0.5">
                                                    {formatNumber(item.wholesale_price)} ج.م × {item.quantity || 0} = <strong className="text-emerald-400 font-mono">{formatCurrency(item.wholesale_price * (Number(item.quantity) || 0))}</strong>
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    المتبقي بالسيارة: <strong className="text-slate-400 font-mono">{formatNumber(item.max_stock ?? (vanProducts.find(p => p.id === item.product_id)?.stock_in_van || 0))}</strong> {item.unit}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {/* أزرار الكمية + إمكانية التحديد والكتابة اليدوية */}
                                                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(idx, -1)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-90"
                                                        title="تقليل الكمية"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={item.max_stock ?? (vanProducts.find(p => p.id === item.product_id)?.stock_in_van || 999)}
                                                        value={item.quantity}
                                                        onChange={(e) => setManualQuantity(idx, e.target.value)}
                                                        onBlur={() => handleManualQuantityBlur(idx)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-12 h-7 bg-transparent text-center font-mono font-black text-white text-xs border-0 focus:ring-1 focus:ring-indigo-500 rounded p-0 selection:bg-indigo-600"
                                                        title="انقر لتعديل الكمية يدوياً"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(idx, 1)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-90"
                                                        title="زيادة الكمية"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>

                                                {/* زر حذف الصنف الفردي */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(idx)}
                                                    className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center transition active:scale-90"
                                                    title="حذف هذا الصنف من الفاتورة"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                                    <span className="font-bold text-white text-xs sm:text-sm">الإجمالي بالجملة:</span>
                                    <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{formatCurrency(cartTotal)}</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-98"
                                >
                                    <Printer size={16} />
                                    <span>إصدار فاتورة جملة وطباعتها</span>
                                </button>
                            </div>
                        )}

                        {/* Available Products in Van */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-xs sm:text-sm">اختر من بضاعة السيارة (أسعار الجملة):</span>
                                <span className="text-[11px] text-slate-400 font-mono">{vanProducts.length} صنف متاح</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {vanProducts.map((p) => {
                                    const inCart = cart.find(c => c.product_id === p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            className={`p-3 sm:p-3.5 rounded-2xl border transition active:scale-98 cursor-pointer flex items-center justify-between gap-3 ${
                                                inCart 
                                                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10' 
                                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white text-xs truncate">{p.name}</span>
                                                    {inCart && (
                                                        <span className="bg-indigo-600 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold flex-shrink-0">
                                                            {inCart.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                    <span>المتبقي:</span>
                                                    <strong className={p.stock_in_van > 0 ? "text-slate-200 font-mono" : "text-rose-400 font-mono"}>
                                                        {formatNumber(p.stock_in_van)} {p.unit}
                                                    </strong>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <span className="text-sm sm:text-base font-black text-indigo-400 font-mono block">
                                                    {formatCurrency(p.wholesale_price)}
                                                </span>
                                                <span className="text-[10px] text-slate-500 block">سعر جملة</span>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                            <td className="py-3 font-mono text-indigo-400 font-bold">{formatCurrency(p.wholesale_price)}</td>
                                            <td className="py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                                                    p.stock_in_van > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                }`}>
                                                    {formatNumber(p.stock_in_van)} {p.unit}
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
                                onClick={() => {
                                    if (tenant?.is_subscription_expired) {
                                        setSubscriptionExpiredModalOpen(true);
                                    } else {
                                        setExpenseModal(true);
                                    }
                                }}
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
                                                <td className="p-3 font-mono font-bold text-rose-400">{formatCurrency(exp.amount)}</td>
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
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-base">سجل فواتير الجملة اليوم</h3>
                            <span className="text-xs text-slate-400 font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
                                {tripInvoices.length} فاتورة
                            </span>
                        </div>

                        {tripInvoices.length === 0 ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                                لا توجد فواتير مبيعات مسجلة في وردية اليوم حتى الآن.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {tripInvoices.map((inv) => (
                                    <div 
                                        key={inv.id} 
                                        onClick={() => setReceiptModal(inv)}
                                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between gap-3 text-xs transition active:scale-98 group"
                                        title="اضغط لعرض الفاتورة وتكبيرها وطباعتها أو مشاركتها"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition">
                                                    {inv.customer_name}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                                                    {inv.payment_method === 'cash' ? 'كاش نقدي' : 'آجل'}
                                                </span>
                                            </div>
                                            {/* التاريخ والساعة علي سطر */}
                                            <div className="text-slate-400 text-[11px] font-mono mt-1">
                                                {formatDateTime(inv.created_at)}
                                            </div>
                                            {/* رقم الفاتورة علي سطر تاني */}
                                            <div className="text-slate-500 text-[10px] font-mono mt-0.5">
                                                {inv.invoice_number}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            {/* المبلغ واضح جنبه علامة ج فقط وتبقي جنب الرقم مش تحت */}
                                            <div className="flex items-baseline justify-end gap-1 whitespace-nowrap text-emerald-400">
                                                <span className="text-base sm:text-lg font-black font-mono">
                                                    {formatNumber(inv.total_amount)}
                                                </span>
                                                <span className="text-xs font-bold text-emerald-500">ج</span>
                                            </div>

                                            <div className="flex items-center gap-1 text-[11px] text-indigo-400 group-hover:text-indigo-300 font-semibold transition">
                                                <Eye size={13} />
                                                <span>عرض الفاتورة</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modal: Start Trip Odometer */}
            {startTripModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center relative">
                        <button 
                            onClick={() => setStartTripModal(false)}
                            className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                            title="إغلاق مؤقتاً للمعاينة"
                        >
                            <X size={18} />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                            <Gauge size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">تسجيل عداد بداية اليوم</h2>
                            <p className="text-slate-400 text-xs mt-1">أدخل قراءة عداد الكيلومترات للسيارة في بداية اليومية لبدء خط السير</p>
                        </div>

                        {/* تأكيد هوية المندوب والسيارة */}
                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-right text-xs space-y-1.5">
                            <div className="flex justify-between text-slate-400">
                                <span className="flex items-center gap-1"><User size={13} className="text-indigo-400" /> المندوب المسؤول:</span>
                                <span className="font-bold text-white">{auth?.user?.name || 'مندوب التوزيع'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span className="flex items-center gap-1"><Truck size={13} className="text-indigo-400" /> سيارة التوزيع:</span>
                                <span className={`font-bold ${vanWarehouse ? 'text-indigo-300' : 'text-rose-400'}`}>
                                    {vanWarehouse ? `${vanWarehouse.name} ${vanWarehouse.vehicle_plate ? `(${vanWarehouse.vehicle_plate})` : ''}` : 'لا توجد سيارة مخصصة لهذا الحساب'}
                                </span>
                            </div>
                        </div>

                        {!vanWarehouse && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                                يرجى من إدارة المتجر تعيين سيارة توزيع لهذا المندوب من لوحة التحكم (المخازن) أولاً.
                            </div>
                        )}

                        <form onSubmit={handleStartTrip} className="space-y-4 text-xs">
                            <div>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    disabled={!vanWarehouse}
                                    value={startOdoInput}
                                    onChange={(e) => setStartOdoInput(e.target.value)}
                                    placeholder="مثال: 125400"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-black text-white font-mono disabled:opacity-50"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 block">قراءة العداد الحالية بالكيلومتر (كم)</span>
                            </div>

                            <button
                                type="submit"
                                disabled={!vanWarehouse}
                                className={`w-full py-3 rounded-2xl font-bold text-xs shadow-lg transition ${
                                    vanWarehouse 
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                            >
                                {vanWarehouse ? 'تسجيل وبدء الوردية' : 'غير متاح - يجب تخصيص سيارة أولاً'}
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
                            <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                <Gauge size={16} className="text-amber-400" />
                                <span>قفل العداد وإنهاء وردية اليوم</span>
                            </span>
                            <button onClick={() => setEndTripModal(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-400">
                                <span className="flex items-center gap-1"><User size={13} className="text-indigo-400" /> المندوب:</span>
                                <span className="font-bold text-white">{auth?.user?.name || 'مندوب التوزيع'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span className="flex items-center gap-1"><Truck size={13} className="text-indigo-400" /> السيارة:</span>
                                <span className="font-bold text-indigo-300">{vanWarehouse?.name || 'سيارة التوزيع'}</span>
                            </div>
                            <div className="border-b border-slate-800/80 my-1" />
                            <div className="flex justify-between text-slate-400">
                                <span>عداد بداية اليوم:</span>
                                <span className="font-mono text-white font-bold">{formatNumber(activeTrip?.start_odometer)} كم</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>إجمالي مبيعات اليوم:</span>
                                <span className="font-mono text-emerald-400 font-bold">{formatCurrency(activeTrip?.total_sales)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleEndTrip} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    قراءة عداد نهاية اليوم (كم) - قفل العداد
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={activeTrip?.start_odometer || 0}
                                    value={endOdoInput}
                                    onChange={(e) => setEndOdoInput(e.target.value)}
                                    placeholder="أدخل قراءة العداد الحالية"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-bold"
                                />
                                {endOdoInput && Number(endOdoInput) >= Number(activeTrip?.start_odometer) && (
                                    <div className="text-[11px] text-emerald-400 text-center mt-1">
                                        المسافة المقطوعة اليوم: <strong>{formatNumber(Number(endOdoInput) - Number(activeTrip?.start_odometer))} كم</strong>
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
                                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-1.5"
                            >
                                <Gauge size={15} />
                                <span>قفل العداد وتصفية الوردية</span>
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
                                    step="1"
                                    required
                                    value={expAmount}
                                    onChange={(e) => setExpAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">القسم</label>
                                <div className="relative">
                                    <select
                                        value={expCatId}
                                        onChange={(e) => setExpCatId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-white appearance-none focus:outline-none focus:border-indigo-500"
                                        style={{ backgroundImage: 'none' }}
                                    >
                                        {expenseCategories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
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
                <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-4 sm:p-5 space-y-4 text-center my-auto shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                <Receipt size={16} className="text-indigo-400" />
                                <span>فاتورة بيع جملة</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleCopyInvoiceText(receiptModal)}
                                    className="p-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold border border-slate-700/60 active:scale-95"
                                    title="نسخ نص الفاتورة بالكامل"
                                >
                                    {copiedToast ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    <span>{copiedToast ? 'تم النسخ!' : 'نسخ النص'}</span>
                                </button>
                                <button 
                                    onClick={() => setReceiptModal(null)} 
                                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
                                    title="إغلاق"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Thermal Paper View with Selectable Text */}
                        <div className="bg-white text-black p-4 rounded-2xl text-right text-xs space-y-1.5 font-mono border border-gray-300 shadow-inner select-text">
                            <div className="text-center font-bold text-sm">فاتورة جملة - سيارات التوزيع</div>
                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div>رقم الفاتورة: <strong className="select-all">{receiptModal.invoice_number}</strong></div>
                            <div>العميل: <strong>{receiptModal.customer_name}</strong></div>
                            <div>التاريخ: {formatDateTime(receiptModal.created_at || new Date())}</div>
                            <div>المندوب: {auth?.user?.name || vanWarehouse?.sales_rep?.name || 'مندوب التوزيع'}</div>
                            <div className="border-b border-dashed border-gray-400 my-1" />

                            <div className="space-y-1 text-[11px]">
                                {receiptModal.items?.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{it.name || it.product_name} × {formatNumber(it.quantity)}</span>
                                        <span className="font-bold">{formatCurrency(it.unit_price * it.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div className="flex justify-between font-black text-sm">
                                <span>الإجمالي:</span>
                                <span>{formatCurrency(receiptModal.total_amount)}</span>
                            </div>
                        </div>

                        {copiedToast && (
                            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl p-2 text-xs flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
                                <CheckCircle2 size={14} className="text-emerald-400" />
                                <span>تم نسخ نص الفاتورة للحافظة بنجاح!</span>
                            </div>
                        )}

                        {/* زرار المشاركة وزرار الطباعة بدلاً من زر إغلاق */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleShareInvoice(receiptModal)}
                                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-98"
                                title="مشاركة الفاتورة عبر واتساب أو التطبيقات"
                            >
                                <Share2 size={16} />
                                <span>مشاركة الفاتورة</span>
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 transition active:scale-98"
                                title="طباعة الفاتورة"
                            >
                                <Printer size={16} />
                                <span className="hidden xs:inline">طباعة</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Expired Modal */}
            <SubscriptionExpiredModal
                isOpen={subscriptionExpiredModalOpen}
                onClose={() => setSubscriptionExpiredModalOpen(false)}
                title="تنبيه: اشتراك المتجر منتهي"
                message="انتهت فترة اشتراك متجرك (أو انتهت التجربة المجانية 7 أيام). لإتمام رحلات التوزيع، مبيعات الجملة، وتسجيل المصروفات، يرجى تجديد الاشتراك وتفعيل باقة المتجر."
            />
        </div>
    );
}
