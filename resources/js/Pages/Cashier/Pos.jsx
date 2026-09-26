import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { 
    Scan, 
    Search, 
    Wifi, 
    WifiOff, 
    RefreshCw, 
    Printer, 
    Trash2, 
    Plus, 
    Minus, 
    DollarSign, 
    CreditCard, 
    Clock, 
    X, 
    CheckCircle2, 
    AlertTriangle,
    Maximize,
    LogOut,
    Check
} from 'lucide-react';
import { 
    syncCatalogToIndexedDB, 
    getProductByBarcodeOffline, 
    searchProductsOffline, 
    saveOfflineInvoiceToIndexedDB, 
    getPendingOfflineInvoices, 
    markInvoicesAsSyncedInIndexedDB 
} from '@/offline/db';

export default function Pos({ currentShift, categories, products, storeSettings }) {
    // Online / Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Catalog & Filter
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayedProducts, setDisplayedProducts] = useState(products || []);

    // Cart
    const [cart, setCart] = useState([]);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Modals
    const [openShiftModal, setOpenShiftModal] = useState(!currentShift);
    const [closeShiftModal, setCloseShiftModal] = useState(false);
    const [openingBalance, setOpeningBalance] = useState('');
    const [closingActualCash, setClosingActualCash] = useState('');
    const [receiptModal, setReceiptModal] = useState(null);

    const barcodeInputRef = useRef(null);

    // Audio Beep generator using Web Audio API
    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1200;
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {
            // Ignore if audio context not allowed
        }
    };

    // 1. Sync catalog to IndexedDB and register Service Worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('SW registration notice:', err);
            });
        }

        // Cache products into IndexedDB for offline operation
        syncCatalogToIndexedDB(products, categories);
        checkPendingInvoices();

        // Online / Offline listeners
        const handleOnline = () => {
            setIsOnline(true);
            autoSyncPendingInvoices();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check count of pending offline invoices
    const checkPendingInvoices = async () => {
        try {
            const pending = await getPendingOfflineInvoices();
            setPendingCount(pending.length);
        } catch (e) {
            console.error('Error checking pending invoices:', e);
        }
    };

    // Auto Sync pending offline invoices to backend
    const autoSyncPendingInvoices = async () => {
        try {
            const pending = await getPendingOfflineInvoices();
            if (pending.length === 0) return;

            setIsSyncing(true);
            const res = await axios.post('/pos/sync-offline', { invoices: pending });
            if (res.data.success) {
                await markInvoicesAsSyncedInIndexedDB(res.data.synced_uuids);
                await checkPendingInvoices();
            }
        } catch (e) {
            console.error('Auto sync failed:', e);
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter products
    useEffect(() => {
        searchProductsOffline(searchQuery, activeCategoryId).then(items => {
            setDisplayedProducts(items.length > 0 || (searchQuery === '' && !activeCategoryId) ? items : products);
        });
    }, [searchQuery, activeCategoryId]);

    // Barcode Scanner Listener
    const handleBarcodeKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const scannedCode = searchQuery.trim();
            if (!scannedCode) return;

            // Search product in IndexedDB
            const found = await getProductByBarcodeOffline(scannedCode);
            if (found) {
                addToCart(found);
                playBeep();
                setSearchQuery('');
            } else {
                alert(`لم يتم العثور على صنف بالباركود: ${scannedCode}`);
            }
        }
    };

    // Add product to cart
    const addToCart = (product) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.product_id === product.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex].quantity += 1;
                return updated;
            } else {
                return [...prev, {
                    product_id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    unit_price: Number(product.retail_price),
                    cost_price: Number(product.cost_price || 0),
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
            if (newQty <= 0) {
                return updated.filter((_, idx) => idx !== index);
            }
            updated[index].quantity = newQty;
            return updated;
        });
    };

    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, idx) => idx !== index));
    };

    const clearCart = () => {
        setCart([]);
        setDiscountAmount(0);
        setPaidAmount('');
        setCustomerName('');
        setCustomerPhone('');
    };

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxRate = storeSettings?.tax_enabled ? (Number(storeSettings?.tax_rate) || 0) : 0;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
    const effectivePaid = paidAmount === '' ? totalAmount : Number(paidAmount);
    const changeDue = Math.max(0, effectivePaid - totalAmount);

    // Checkout (Online or Offline)
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('السلة فارغة، يرجى إضافة أصناف أولاً');
            return;
        }

        const invoiceData = {
            items: cart,
            subtotal,
            discount_amount: Number(discountAmount),
            tax_amount: taxAmount,
            total_amount: totalAmount,
            paid_amount: effectivePaid,
            payment_method: paymentMethod,
            customer_name: customerName,
            customer_phone: customerPhone,
        };

        if (isOnline) {
            try {
                const response = await axios.post('/pos/checkout', invoiceData);
                if (response.data.success) {
                    playBeep();
                    setReceiptModal(response.data.invoice);
                    clearCart();
                }
            } catch (err) {
                console.warn('Online checkout failed, saving offline fallback:', err);
                fallbackToOfflineCheckout(invoiceData);
            }
        } else {
            fallbackToOfflineCheckout(invoiceData);
        }
    };

    const fallbackToOfflineCheckout = async (invoiceData) => {
        const offlineUuid = 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        const invoiceNumber = 'OFF-' + Math.floor(100000 + Math.random() * 900000);

        const offlineInvoice = {
            ...invoiceData,
            offline_uuid: offlineUuid,
            invoice_number: invoiceNumber,
            shift_id: currentShift?.id || null,
        };

        await saveOfflineInvoiceToIndexedDB(offlineInvoice);
        await checkPendingInvoices();
        playBeep();

        setReceiptModal(offlineInvoice);
        clearCart();
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div dir="rtl" className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
            <Head title="شاشة الكاشير - POS" />

            {/* Top Bar */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
                        <Scan size={18} />
                    </div>
                    <div>
                        <span className="font-extrabold text-sm text-white">{storeSettings?.store_name || 'نقطة البيع (POS)'}</span>
                        <span className="text-[11px] text-slate-400 block -mt-0.5">
                            الكاشير: {currentShift?.cashier?.name || 'غير محدد'}
                        </span>
                    </div>

                    {/* Online / Offline Status Badge */}
                    <div className="mr-3">
                        {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>متصل أونلاين</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                <WifiOff size={13} />
                                <span>يعمل أوفلاين (كاش المتصفح)</span>
                            </span>
                        )}
                    </div>

                    {/* Pending Sync Invoices Button */}
                    {pendingCount > 0 && (
                        <button
                            onClick={autoSyncPendingInvoices}
                            disabled={!isOnline || isSyncing}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold transition disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                            <span>مزامنة فواتير الأوفلاين ({pendingCount})</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Shift Controls */}
                    {currentShift ? (
                        <button
                            onClick={() => setCloseShiftModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                            <Clock size={14} className="text-amber-400" />
                            <span>تقفيل الوردية</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setOpenShiftModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                            + فتح وردية جديدة
                        </button>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                        title="ملء الشاشة"
                    >
                        <Maximize size={16} />
                    </button>

                    <a
                        href="/admin/dashboard"
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                        title="العودة للإدارة"
                    >
                        <LogOut size={16} />
                    </a>
                </div>
            </header>

            {/* Main POS Interface (Split Screen) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left 60%: Product Catalog & Barcode Scanner */}
                <div className="flex-1 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
                    {/* Barcode Search Header */}
                    <div className="p-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute right-3.5 top-3 text-slate-400" />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleBarcodeKeyDown}
                                autoFocus
                                placeholder="امسح بالباركود واضغط Enter، أو اكتب اسم الصنف..."
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                            />
                        </div>

                        <button
                            onClick={() => barcodeInputRef.current?.focus()}
                            className="px-3.5 py-2.5 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <Scan size={16} />
                            <span className="hidden sm:inline">مسح</span>
                        </button>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto flex-shrink-0">
                        <button
                            onClick={() => setActiveCategoryId(null)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                                activeCategoryId === null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            الكل ({products.length})
                        </button>
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategoryId(c.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                                    activeCategoryId === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Product Cards Grid */}
                    <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                        {displayedProducts.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => { addToCart(p); playBeep(); }}
                                className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-3.5 rounded-2xl cursor-pointer transition active:scale-[0.98] flex flex-col justify-between"
                            >
                                <div>
                                    <div className="font-bold text-white text-xs line-clamp-2 leading-snug">{p.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1">{p.barcode}</div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-850 flex items-baseline justify-between">
                                    <span className="text-base font-black text-emerald-400 font-mono">
                                        {Number(p.retail_price).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        المتاح: {p.stock_quantity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right 40%: Order Cart & Checkout Panel */}
                <div className="w-[380px] lg:w-[420px] bg-slate-950 flex flex-col flex-shrink-0">
                    {/* Cart Header */}
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">سلة البيع</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                {cart.length} أصناف
                            </span>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                            >
                                <Trash2 size={13} />
                                <span>تفريغ</span>
                            </button>
                        )}
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                                <Scan size={36} className="opacity-30" />
                                <span>السلة فارغة، امسح الباركود أو اختر صنفاً</span>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="p-2.5 rounded-2xl bg-slate-900 border border-slate-850 flex items-center justify-between text-xs">
                                    <div className="flex-1 pr-1 truncate">
                                        <div className="font-bold text-white truncate">{item.name}</div>
                                        <div className="text-[11px] text-emerald-400 font-mono">
                                            {item.unit_price} ج.م × {item.quantity} = {(item.unit_price * item.quantity).toFixed(2)} ج.م
                                        </div>
                                    </div>

                                    {/* Qty +/- */}
                                    <div className="flex items-center gap-1.5 mr-2">
                                        <button
                                            onClick={() => updateQuantity(idx, -1)}
                                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="w-6 text-center font-bold text-white font-mono">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(idx, 1)}
                                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(idx)}
                                        className="p-1 text-slate-500 hover:text-rose-400 mr-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Payment & Totals Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3 flex-shrink-0">
                        {/* Discount & Payment Method */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                                <span className="text-slate-400 text-[11px]">خصم:</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                                />
                                <span className="text-[10px] text-slate-400">ج.م</span>
                            </div>

                            <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                                        paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                                    }`}
                                >
                                    نقدي
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                                        paymentMethod === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                    }`}
                                >
                                    فيزا
                                </button>
                            </div>
                        </div>

                        {/* Paid & Change Due */}
                        {paymentMethod === 'cash' && (
                            <div className="flex items-center gap-2 text-xs">
                                <div className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                                    <span className="text-slate-400 text-[11px]">المستلم:</span>
                                    <input
                                        type="number"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value)}
                                        placeholder={totalAmount.toString()}
                                        className="w-full bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                                    />
                                    <span className="text-[10px] text-slate-400">ج.م</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                                    <span className="text-slate-400">الباقي: </span>
                                    <strong className="text-amber-400 font-mono">{changeDue.toFixed(2)} ج.م</strong>
                                </div>
                            </div>
                        )}

                        {/* Totals Summary */}
                        <div className="space-y-1 text-xs pt-1 border-t border-slate-850">
                            <div className="flex justify-between text-slate-400">
                                <span>المجموع الفرعي:</span>
                                <span className="font-mono">{subtotal.toFixed(2)} ج.م</span>
                            </div>
                            {taxAmount > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>الضريبة ({taxRate}%):</span>
                                    <span className="font-mono text-indigo-400">+{taxAmount.toFixed(2)} ج.م</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-1 text-base">
                                <span className="font-bold text-white">المبلغ المطلوب:</span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {totalAmount.toFixed(2)} ج.م
                                </span>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-40"
                        >
                            <Printer size={18} />
                            <span>إتمام البيع وطباعة الفاتورة</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Thermal Receipt Print Modal */}
            {receiptModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">تم إصدار الفاتورة</span>
                            <button onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thermal Receipt View (80mm width standard) */}
                        <div id="printable-receipt" className="bg-white text-black p-4 rounded-xl text-right text-xs space-y-2 font-mono border border-gray-300">
                            <div className="text-center font-bold text-sm">{storeSettings?.store_name || 'فاتورة مبيعات'}</div>
                            {storeSettings?.receipt_header && (
                                <div className="text-center text-[10px] text-gray-600">{storeSettings.receipt_header}</div>
                            )}
                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div className="text-[10px] space-y-0.5">
                                <div>رقم الفاتورة: {receiptModal.invoice_number}</div>
                                <div>التاريخ: {new Date().toLocaleString('ar-EG')}</div>
                                <div>الكاشير: {currentShift?.cashier?.name}</div>
                            </div>
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
                            <div className="flex justify-between text-[11px] text-gray-700">
                                <span>طريقة الدفع:</span>
                                <span>{receiptModal.payment_method === 'cash' ? 'نقدي' : 'فيزا'}</span>
                            </div>

                            {storeSettings?.receipt_footer && (
                                <>
                                    <div className="border-b border-dashed border-gray-400 my-1" />
                                    <div className="text-center text-[10px] text-gray-600">{storeSettings.receipt_footer}</div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handlePrintReceipt}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
                            >
                                <Printer size={16} />
                                <span>طباعة الآن</span>
                            </button>
                            <button
                                onClick={() => setReceiptModal(null)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                            >
                                تم
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Open Shift */}
            {openShiftModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                            <Clock size={24} />
                        </div>
                        <h2 className="text-lg font-black text-white">فتح وردية كاشير جديدة</h2>
                        <p className="text-slate-400 text-xs">أدخل مبلغ العهدة النقدية في الدرج لبدء تسجيل المبيعات</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            router.post(route('cashier.shift.open'), { opening_balance: openingBalance || 0 }, {
                                onSuccess: () => setOpenShiftModal(false)
                            });
                        }} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-right font-semibold text-slate-300 mb-1">
                                    مبلغ عهدة البداية (ج.م)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="مثال: 500"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black text-emerald-400 font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                            >
                                فتح الوردية وبدء العمل
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Close Shift */}
            {closeShiftModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white text-sm">تقفيل الوردية وتسليم الدرج</span>
                            <button onClick={() => setCloseShiftModal(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-850 space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-400">
                                <span>عهدة البداية:</span>
                                <span className="text-white font-mono">{currentShift?.opening_balance} ج.م</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>مبيعات نقدي (كاش):</span>
                                <span className="text-emerald-400 font-mono font-bold">+{currentShift?.cash_sales} ج.م</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>مبيعات فيزا:</span>
                                <span className="text-indigo-400 font-mono">+{currentShift?.card_sales} ج.م</span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                                <span>الكاش المتوقع بالدرج:</span>
                                <span className="text-sm font-mono text-emerald-400">
                                    {(Number(currentShift?.opening_balance || 0) + Number(currentShift?.cash_sales || 0)).toFixed(2)} ج.م
                                </span>
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            router.post(route('cashier.shift.close'), { closing_balance: closingActualCash }, {
                                onSuccess: () => {
                                    setCloseShiftModal(false);
                                    setOpenShiftModal(true);
                                }
                            });
                        }} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    المبلغ الفعلي الموجود بالدرج (ج.م)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    value={closingActualCash}
                                    onChange={(e) => setClosingActualCash(e.target.value)}
                                    placeholder="أدخل المبلغ بعد العد اليدوي"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-center text-base font-black text-white font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                            >
                                إغلاق الوردية ومطابقة الحساب
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
