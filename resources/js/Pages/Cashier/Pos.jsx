import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
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
    LayoutDashboard,
    Check,
    Receipt,
    RotateCcw,
    User,
    ShieldCheck,
    Copy,
    ArrowLeft
} from 'lucide-react';
import SubscriptionExpiredModal from '@/Components/SubscriptionExpiredModal';
import { 
    syncCatalogToIndexedDB, 
    getProductByBarcodeOffline, 
    searchProductsOffline, 
    saveOfflineInvoiceToIndexedDB, 
    getPendingOfflineInvoices, 
    markInvoicesAsSyncedInIndexedDB 
} from '@/offline/db';
import { formatNumber, formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';

export default function Pos({ currentShift, categories = [], products = [], storeSettings, cashierName, shiftInvoices = [], activeCashier, cashiers = [] }) {
    const { impersonation, auth, tenant } = usePage().props;

    const isAdmin = auth?.user?.role === 'admin';
    const effectiveCashier = activeCashier || currentShift?.cashier || auth?.user;
    const [selectedCashierId, setSelectedCashierId] = useState(effectiveCashier?.id || auth?.user?.id);
    const activeCashierName = effectiveCashier?.name || currentShift?.cashier?.name || cashierName || auth?.user?.name || 'الكاشير';
    const [subscriptionExpiredModalOpen, setSubscriptionExpiredModalOpen] = useState(false);

    // Online / Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Invoices & Returns State
    const [invoicesList, setInvoicesList] = useState(shiftInvoices || []);
    const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
    const [refundingId, setRefundingId] = useState(null);
    const [refundConfirmInvoice, setRefundConfirmInvoice] = useState(null);

    // Products & Catalog State
    const [productsList, setProductsList] = useState(products || []);
    const [categoriesList, setCategoriesList] = useState(categories || []);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [productsError, setProductsError] = useState(null);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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
    const [openingBalance, setOpeningBalance] = useState('0');
    const [closingActualCash, setClosingActualCash] = useState('');
    const [receiptModal, setReceiptModal] = useState(null);
    const [isOpeningShift, setIsOpeningShift] = useState(false);
    const [isClosingShift, setIsClosingShift] = useState(false);
    const [shiftError, setShiftError] = useState('');

    // User Feedback Toast State
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 3200);
    };

    // Format invoice text for sharing & copying
    const getInvoiceShareText = (receipt) => {
        if (!receipt) return '';
        const dateStr = receipt.created_at ? formatDateTime(receipt.created_at) : formatDateTime(new Date());
        const storeName = storeSettings?.store_name || 'كاشير مبيعات';
        const cName = receipt.cashier?.name || activeCashierName;
        
        let text = `🧾 *فاتورة مبيعات - ${storeName}*\n`;
        text += `🔢 رقم الفاتورة: ${receipt.invoice_number}\n`;
        text += `📅 التاريخ: ${dateStr}\n`;
        text += `👤 الكاشير: ${cName}\n`;
        if (receipt.customer_name) text += `🏪 العميل: ${receipt.customer_name}\n`;
        text += `------------------------\n`;
        text += `📦 *الأصناف:*\n`;
        receipt.items?.forEach((it, i) => {
            const pName = it.name || it.product_name;
            const qty = formatNumber(it.quantity);
            const total = formatCurrency(it.unit_price * it.quantity);
            text += `${i + 1}. ${pName} (${qty} × ${formatNumber(it.unit_price)} ج.م) = ${total}\n`;
        });
        text += `------------------------\n`;
        text += `💰 *الإجمالي: ${formatCurrency(receipt.total_amount)}*\n`;
        text += `💵 طريقة الدفع: ${receipt.payment_method === 'cash' ? 'نقدي' : 'فيزا'}\n`;
        return text;
    };

    const handleCopyInvoiceText = async (receipt) => {
        const text = getInvoiceShareText(receipt);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
            showToast('تم نسخ تفاصيل الفاتورة للمشاركة بنجاح', 'success');
        } catch (e) {
            showToast('تعذر نسخ الفاتورة تلقائياً', 'error');
        }
    };

    // Sync open shift modal state with currentShift prop
    useEffect(() => {
        if (currentShift) {
            setOpenShiftModal(false);
        } else {
            setOpenShiftModal(true);
        }
    }, [currentShift]);

    // Filtered invoices for search
    const filteredInvoices = invoicesList.filter(inv => {
        if (!invoiceSearchQuery.trim()) return true;
        const q = invoiceSearchQuery.toLowerCase();
        return (
            inv.invoice_number?.toLowerCase().includes(q) ||
            inv.customer_name?.toLowerCase().includes(q) ||
            inv.customer_phone?.includes(q)
        );
    });

    // Handle invoice refund
    const handleRefundInvoice = async (invoice) => {
        if (tenant?.is_subscription_expired) {
            setSubscriptionExpiredModalOpen(true);
            return;
        }

        setRefundingId(invoice.id);
        try {
            const res = await axios.post(`/pos/invoices/${invoice.id}/refund`);
            if (res.data.success) {
                playBeep();
                const updated = res.data.invoice;
                setInvoicesList(prev => prev.map(inv => inv.id === invoice.id ? updated : inv));

                // Restock products in state
                if (invoice.items) {
                    setProductsList(prev => prev.map(p => {
                        const matchedItem = invoice.items.find(it => it.product_id === p.id);
                        if (matchedItem) {
                            return { ...p, stock_quantity: Number(p.stock_quantity || 0) + Number(matchedItem.quantity) };
                        }
                        return p;
                    }));
                }

                setRefundConfirmInvoice(null);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'تعذر استرجاع الفاتورة');
        } finally {
            setRefundingId(null);
        }
    };

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

    // Keep products and categories synced with incoming props
    useEffect(() => {
        if (products && Array.isArray(products) && products.length > 0) {
            setProductsList(products);
            setProductsError(null);
            syncCatalogToIndexedDB(products, categories || []);
        }
    }, [products]);

    useEffect(() => {
        if (categories && Array.isArray(categories)) {
            setCategoriesList(categories);
        }
    }, [categories]);

    // Fetch / Reload catalog from API with error handling and retry option
    const loadCatalog = async (forceRefresh = false) => {
        setIsLoadingProducts(true);
        setProductsError(null);
        try {
            const res = await axios.get('/pos/catalog');
            if (res.data && Array.isArray(res.data.products)) {
                setProductsList(res.data.products);
                if (res.data.categories) setCategoriesList(res.data.categories);
                await syncCatalogToIndexedDB(res.data.products, res.data.categories || []);
            } else {
                throw new Error('بيانات الأصناف غير صحيحة');
            }
        } catch (err) {
            console.error('Failed to load catalog:', err);
            // Fallback: try to read from IndexedDB
            try {
                const cached = await searchProductsOffline('', null);
                if (cached && cached.length > 0) {
                    setProductsList(cached);
                    setIsLoadingProducts(false);
                    return;
                }
            } catch (dbErr) {
                console.error('IndexedDB fallback failed:', dbErr);
            }

            if (!productsList || productsList.length === 0) {
                setProductsError('تعذر تحميل الأصناف من الخادم. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.');
            }
        } finally {
            setIsLoadingProducts(false);
        }
    };

    // 1. Sync catalog to IndexedDB and register Service Worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/pos' }).catch(err => {
                console.log('SW registration notice:', err);
            });
        }

        // Cache products into IndexedDB for offline operation
        if (products && products.length > 0) {
            syncCatalogToIndexedDB(products, categories || []);
        } else {
            loadCatalog();
        }

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

    // Instant, reactive in-memory filtering (never wiped out by async Dexie race condition)
    const displayedProducts = useMemo(() => {
        let list = productsList || [];
        if (activeCategoryId !== null) {
            list = list.filter(p => Number(p.category_id) === Number(activeCategoryId));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) || 
                (p.barcode && String(p.barcode).includes(q))
            );
        }
        return list;
    }, [productsList, activeCategoryId, searchQuery]);

    // Barcode Scanner Listener
    const handleBarcodeKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const scannedCode = searchQuery.trim();
            if (!scannedCode) return;

            // Search product in memory first
            let found = productsList.find(p => p.barcode && String(p.barcode).trim() === scannedCode);
            if (!found) {
                // Fallback to IndexedDB
                found = await getProductByBarcodeOffline(scannedCode);
            }

            if (found) {
                const availableStock = Number(found.stock_quantity || 0);
                if (availableStock <= 0) {
                    showToast(`الصنف (${found.name}) نفد من المخزون تماماً (المتاح: 0) ولا يمكن بيعه`, 'error');
                    return;
                }

                const inCartItem = cart.find(item => item.product_id === found.id);
                if (inCartItem && inCartItem.quantity >= availableStock) {
                    showToast(`تم الوصول للحد الأقصى للكمية المتاحة للصنف (${found.name}) بالمخزن (${availableStock})`, 'warning');
                    return;
                }

                addToCart(found);
                playBeep();
                setSearchQuery('');
                showToast(`تمت إضافة (${found.name}) للسلة`, 'success');
            } else {
                showToast(`لم يتم العثور على أي صنف مسجل بهذا الباركود: "${scannedCode}"`, 'error');
            }
        }
    };

    // Add product to cart with strict stock availability check
    const addToCart = (product) => {
        const availableStock = Number(product.stock_quantity || 0);
        if (availableStock <= 0) {
            showToast(`عفواً، الصنف (${product.name}) غير متوفر بالمخزن (المتاح: 0)`, 'error');
            return;
        }

        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.product_id === product.id);
            if (existingIndex > -1) {
                const currentQty = prev[existingIndex].quantity;
                if (currentQty + 1 > availableStock) {
                    showToast(`الرصيد المتاح للصنف (${product.name}) بالمخزن هو (${availableStock}) فقط`, 'warning');
                    return prev;
                }
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

    // Update cart item quantity with stock boundary enforcement
    const updateQuantity = (index, delta) => {
        setCart(prev => {
            const item = prev[index];
            if (!item) return prev;
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                return prev.filter((_, idx) => idx !== index);
            }

            if (delta > 0) {
                const matchedProduct = productsList.find(p => p.id === item.product_id);
                const availableStock = matchedProduct ? Number(matchedProduct.stock_quantity || 0) : Infinity;
                if (newQty > availableStock) {
                    showToast(`الكمية المطلوبة تتجاوز الرصيد المتاح بالمخزن (${availableStock}) للصنف (${item.name})`, 'warning');
                    return prev;
                }
            }

            const updated = [...prev];
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

    // Calculations with sanitization
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const validDiscount = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0));
    const taxRate = storeSettings?.tax_enabled ? (Number(storeSettings?.tax_rate) || 0) : 0;
    const taxableAmount = Math.max(0, subtotal - validDiscount);
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalAmount = Math.max(0, taxableAmount + taxAmount);
    const effectivePaid = paidAmount === '' ? totalAmount : Math.max(0, Number(paidAmount) || 0);
    const changeDue = Math.max(0, effectivePaid - totalAmount);

    // ضبط الخصم تلقائياً بحيث لا يتجاوز إجمالي السلة عند تعديل الأصناف أو الكميات
    useEffect(() => {
        if (subtotal > 0 && Number(discountAmount) > subtotal) {
            setDiscountAmount(subtotal);
            setToast({
                show: true,
                message: `تم ضبط الخصم ليتوافق مع أقصى حد للفاتورة (${formatCurrency(subtotal)})`,
                type: 'info'
            });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        } else if (subtotal === 0 && Number(discountAmount) > 0) {
            setDiscountAmount(0);
        }
    }, [subtotal]);

    // معالجة تغيير قيمة الخصم وضبط الحد الأقصى مساوياً لإجمالي الفاتورة
    const handleDiscountChange = (val) => {
        if (val === '' || val === null) {
            setDiscountAmount('');
            return;
        }
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            setDiscountAmount(0);
            return;
        }
        if (num > subtotal) {
            setDiscountAmount(subtotal);
            setToast({
                show: true,
                message: `الخصم المقبول أقصاه إجمالي الفاتورة (${formatCurrency(subtotal)})`,
                type: 'warning'
            });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        setDiscountAmount(num);
    };

    // Checkout (Online or Offline)
    const handleCheckout = async () => {
        if (tenant?.is_subscription_expired) {
            setSubscriptionExpiredModalOpen(true);
            return;
        }

        if (cart.length === 0) {
            alert('السلة فارغة، يرجى إضافة أصناف أولاً');
            return;
        }

        const invoiceData = {
            items: cart,
            subtotal,
            discount_amount: validDiscount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            paid_amount: effectivePaid,
            payment_method: paymentMethod,
            customer_name: customerName,
            customer_phone: customerPhone,
            cashier_id: selectedCashierId || effectiveCashier?.id,
        };

        if (isOnline) {
            try {
                const response = await axios.post('/pos/checkout', invoiceData);
                if (response.data.success) {
                    playBeep();
                    setReceiptModal(response.data.invoice);
                    setInvoicesList(prev => [response.data.invoice, ...prev]);
                    // Update stock locally
                    setProductsList(prev => prev.map(p => {
                        const cartItem = cart.find(ci => ci.product_id === p.id);
                        if (cartItem) {
                            return { ...p, stock_quantity: Math.max(0, Number(p.stock_quantity || 0) - Number(cartItem.quantity)) };
                        }
                        return p;
                    }));
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
            cashier_id: selectedCashierId || effectiveCashier?.id,
            created_at: new Date().toISOString(),
        };

        await saveOfflineInvoiceToIndexedDB(offlineInvoice);
        await checkPendingInvoices();
        playBeep();

        setReceiptModal(offlineInvoice);
        setInvoicesList(prev => [offlineInvoice, ...prev]);
        // Update stock locally
        setProductsList(prev => prev.map(p => {
            const cartItem = cart.find(ci => ci.product_id === p.id);
            if (cartItem) {
                return { ...p, stock_quantity: Math.max(0, Number(p.stock_quantity || 0) - Number(cartItem.quantity)) };
            }
            return p;
        }));
        clearCart();
    };

    const handlePrintReceipt = () => {
        try {
            window.print();
            showToast('تم إرسال أمر الطباعة بنجاح', 'success');
        } catch (e) {
            showToast('فشل بدء أمر الطباعة', 'error');
        } finally {
            setReceiptModal(null);
            setTimeout(() => {
                barcodeInputRef.current?.focus();
            }, 100);
        }
    };

    // الاستماع لزر Enter و Escape أثناء فتح نافذة الإيصال لإتمام الطباعة والتحويل للعميل التالي فوراً
    useEffect(() => {
        if (!receiptModal) return;

        const handleReceiptKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handlePrintReceipt();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setReceiptModal(null);
                setTimeout(() => {
                    barcodeInputRef.current?.focus();
                }, 100);
            }
        };

        window.addEventListener('keydown', handleReceiptKeyDown, true);
        return () => window.removeEventListener('keydown', handleReceiptKeyDown, true);
    }, [receiptModal]);

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

            {/* Thermal Print Scoped Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-receipt, #printable-receipt * {
                        visibility: visible !important;
                    }
                    #printable-receipt {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            {/* Floating Toast Notification */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold transition-all border ${
                    toast.type === 'error'
                        ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                        : toast.type === 'warning'
                        ? 'bg-amber-950/95 border-amber-500/50 text-amber-200'
                        : toast.type === 'success'
                        ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900/95 border-indigo-500/50 text-indigo-200'
                }`}>
                    {toast.type === 'error' && <AlertTriangle size={15} className="text-rose-400 flex-shrink-0" />}
                    {toast.type === 'warning' && <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />}
                    {toast.type === 'success' && <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Impersonation Banner */}
            {impersonation?.active && (
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-lg z-50 border-b border-amber-600 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-950 text-amber-400 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                            وضع السوبر أدمن
                        </span>
                        <span className="text-slate-900 font-extrabold">
                            أنت الآن تتصفح واجهة الكاشير منتحلاً هوية: <span className="underline">{impersonation.user_name || 'الكاشير'}</span>
                        </span>
                    </div>
                    <a 
                        href={impersonation.leave_url || '/admin/impersonate-leave'} 
                        className="bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        إنهاء المعاينة والعودة للسوبر أدمن ←
                    </a>
                </div>
            )}

            {/* Subscription Expired Sticky Alert Banner */}
            {tenant?.is_subscription_expired && (
                <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg z-50 flex-shrink-0 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-rose-400 animate-bounce" />
                            <span>انتهى اشتراك المتجر!</span>
                        </span>
                        <span className="text-rose-100 font-medium">
                            عمليات البيع وفتح الورديات متوقفة حالياً. يرجى تجديد الاشتراك لاستئناف البيع.
                        </span>
                    </div>
                    <a
                        href="/admin/subscriptions"
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1 active:scale-95"
                    >
                        <span>تجديد الاشتراك الآن</span>
                        <ArrowLeft size={13} />
                    </a>
                </div>
            )}

            {/* Top Bar */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
                        <Scan size={18} />
                    </div>
                    <div>
                        <span className="font-extrabold text-sm text-white block">{storeSettings?.store_name || 'نقطة البيع (POS)'}</span>
                        <span className="text-[11px] text-slate-400 block -mt-0.5">
                            الوردية: {currentShift ? `رقم #${currentShift.id}` : 'مغلقة'}
                        </span>
                    </div>

                    {/* Prominent Cashier Name Badge - Always Visible */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/70 text-slate-200 mr-2 shadow-inner">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            <User size={13} />
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 block leading-none">الكاشير المسئول</span>
                            <span className="text-xs font-bold text-emerald-400 leading-tight">
                                {activeCashierName}
                            </span>
                        </div>
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
                            onClick={() => {
                                if (tenant?.is_subscription_expired) {
                                    setSubscriptionExpiredModalOpen(true);
                                } else {
                                    setOpenShiftModal(true);
                                }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                            + فتح وردية جديدة
                        </button>
                    )}

                    {/* Shift Invoices Button */}
                    <button
                        onClick={() => setInvoicesModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/60 shadow-sm"
                        title="عرض فواتير الوردية والاسترجاع"
                    >
                        <Receipt size={14} className="text-emerald-400" />
                        <span>فواتير الوردية</span>
                        {invoicesList.length > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {invoicesList.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                        title="ملء الشاشة"
                    >
                        <Maximize size={16} />
                    </button>

                    {auth?.user?.role === 'admin' && (
                        <a
                            href="/admin/dashboard"
                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                            title="العودة للإدارة"
                        >
                            <LayoutDashboard size={16} />
                        </a>
                    )}
                    <a
                        href="/logout"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/60"
                        title={auth?.user?.role === 'admin' ? "تسجيل الخروج" : "تسجيل الخروج أو تبديل الكاشير"}
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">{auth?.user?.role === 'admin' ? "خروج" : "تبديل الكاشير"}</span>
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
                            <span className="hidden sm:inline">Scan</span>
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
                            الكل ({productsList.length})
                        </button>
                        {categoriesList.map((c) => {
                            const catCount = productsList.filter(p => Number(p.category_id) === Number(c.id)).length;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCategoryId(c.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
                                        activeCategoryId === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    {catCount > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                            activeCategoryId === c.id ? 'bg-white/20 text-white font-bold' : 'bg-slate-700/80 text-slate-300'
                                        }`}>
                                            {catCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Product Cards Grid Area with Loading, Error, and Retry States */}
                    <div className="flex-1 p-3 overflow-y-auto min-h-0">
                        {isLoadingProducts ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 space-y-3">
                                <RefreshCw size={32} className="animate-spin text-indigo-500" />
                                <span className="text-sm font-bold text-slate-300">جاري تحميل الأصناف...</span>
                            </div>
                        ) : productsError && productsList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-rose-400 py-16 space-y-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                                    <AlertTriangle size={26} />
                                </div>
                                <div className="max-w-xs">
                                    <p className="text-sm font-bold text-white mb-1">{productsError}</p>
                                    <p className="text-xs text-slate-400">تأكد من الاتصال بالإنترنت ثم أعد المحاولة</p>
                                </div>
                                <button
                                    onClick={() => loadCatalog(true)}
                                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    <RefreshCw size={14} />
                                    <span>إعادة المحاولة</span>
                                </button>
                            </div>
                        ) : displayedProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                                    <Search size={24} />
                                </div>
                                {productsList.length === 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-300">لا توجد أصناف مسجلة في هذا المتجر</p>
                                        <button
                                            onClick={() => loadCatalog(true)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto"
                                        >
                                            <RefreshCw size={13} />
                                            <span>تحديث القائمة</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-300">لم يتم العثور على أي صنف يطابق البحث أو القسم</p>
                                        <button
                                            onClick={() => { setSearchQuery(''); setActiveCategoryId(null); }}
                                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold transition"
                                        >
                                            عرض جميع الأصناف ({productsList.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                                {displayedProducts.map((p) => {
                                    const stock = Number(p.stock_quantity || 0);
                                    const isOutOfStock = stock <= 0;
                                    const isLowStock = stock > 0 && stock <= 5;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => { 
                                                if (isOutOfStock) {
                                                    showToast(`الصنف (${p.name}) غير متوفر حالياً بالمخزن`, 'error');
                                                    return;
                                                }
                                                addToCart(p); 
                                                playBeep(); 
                                            }}
                                            className={`border p-3.5 rounded-2xl transition flex flex-col justify-between group shadow-sm ${
                                                isOutOfStock
                                                    ? 'bg-slate-950/60 border-rose-900/40 opacity-60 cursor-not-allowed'
                                                    : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 cursor-pointer active:scale-[0.98] hover:shadow-indigo-500/5'
                                            }`}
                                        >
                                            <div>
                                                <div className={`font-bold text-xs line-clamp-2 leading-snug transition-colors ${
                                                    isOutOfStock ? 'text-slate-400' : 'text-white group-hover:text-indigo-300'
                                                }`}>
                                                    {p.name}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                                    {p.barcode || '—'}
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                                                <span className={`text-base font-black font-mono ${
                                                    isOutOfStock ? 'text-slate-500' : 'text-emerald-400'
                                                }`}>
                                                    {formatCurrency(p.retail_price)}
                                                </span>
                                                
                                                {isOutOfStock ? (
                                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                        نفد المخزون
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20" title="تنبيه: رصيد منخفض">
                                                        متبقي {formatNumber(stock)} فقط!
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">
                                                        المتاح: {formatNumber(stock)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="حذف الكل"
                            >
                                <Trash2 size={15} />
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
                                            {formatNumber(item.unit_price)} ج.م × {formatNumber(item.quantity)} = {formatCurrency(item.unit_price * item.quantity)}
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
                        <div className="space-y-1">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500/50 transition">
                                    <span className="text-slate-400 text-[11px] whitespace-nowrap">خصم:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max={subtotal}
                                        value={discountAmount}
                                        onChange={(e) => handleDiscountChange(e.target.value)}
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

                            {/* توضيح أقصى خصم مقبول للكاشير */}
                            {subtotal > 0 && (
                                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                                    <span>الخصم المقبول أقصاه إجمالي الفاتورة:</span>
                                    <span className="font-mono text-emerald-400 font-bold">{formatCurrency(subtotal)}</span>
                                </div>
                            )}
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCheckout();
                                            }
                                        }}
                                        placeholder={Math.round(totalAmount).toString()}
                                        className="w-full bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                                    />
                                    <span className="text-[10px] text-slate-400">ج.م</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                                    <span className="text-slate-400">الباقي: </span>
                                    <strong className="text-amber-400 font-mono">{formatCurrency(changeDue)}</strong>
                                </div>
                            </div>
                        )}

                        {/* Totals Summary */}
                        <div className="space-y-1 text-xs pt-1 border-t border-slate-850">
                            <div className="flex justify-between text-slate-400">
                                <span>المجموع الفرعي:</span>
                                <span className="font-mono">{formatCurrency(subtotal)}</span>
                            </div>
                            {validDiscount > 0 && (
                                <div className="flex justify-between text-rose-400 font-semibold">
                                    <span>الخصم المطبق:</span>
                                    <span className="font-mono">-{formatCurrency(validDiscount)}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>الضريبة ({taxRate}%):</span>
                                    <span className="font-mono text-indigo-400">+{formatCurrency(taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-1 text-base">
                                <span className="font-bold text-white">المبلغ المطلوب:</span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(totalAmount)}
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
                <div 
                    className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setReceiptModal(null);
                    }}
                >
                    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div className="text-right">
                                <span className="font-bold text-white text-sm block">معاينة وطباعة الفاتورة</span>
                                <span className="text-[11px] text-slate-400 font-mono">#{receiptModal.invoice_number}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleCopyInvoiceText(receiptModal)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                                    title="نسخ نص الفاتورة"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        setReceiptModal(null);
                                        setTimeout(() => barcodeInputRef.current?.focus(), 100);
                                    }}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                                    title="إغلاق والعودة للعميل التالي (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Thermal Receipt View (80mm width standard) */}
                        <div id="printable-receipt" className="bg-white text-black p-4 rounded-xl text-right text-xs space-y-2 font-mono border border-gray-300 select-text max-h-[60vh] overflow-y-auto">
                            <div className="text-center font-bold text-sm">{storeSettings?.store_name || 'فاتورة مبيعات'}</div>
                            {storeSettings?.receipt_header && (
                                <div className="text-center text-[10px] text-gray-600">{storeSettings.receipt_header}</div>
                            )}
                            <div className="border-b border-dashed border-gray-400 my-1" />
                            <div className="text-[10px] space-y-0.5">
                                <div>رقم الفاتورة: {receiptModal.invoice_number}</div>
                                <div>التاريخ: {formatDateTime(receiptModal.created_at || new Date())}</div>
                                <div>الكاشير: {receiptModal.cashier?.name || activeCashierName}</div>
                                {receiptModal.customer_name && <div>العميل: {receiptModal.customer_name}</div>}
                            </div>
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
                            {receiptModal.discount_amount > 0 && (
                                <div className="flex justify-between text-[11px] text-gray-600">
                                    <span>الخصم:</span>
                                    <span>-{formatCurrency(receiptModal.discount_amount)}</span>
                                </div>
                            )}
                            {receiptModal.tax_amount > 0 && (
                                <div className="flex justify-between text-[11px] text-gray-600">
                                    <span>الضريبة:</span>
                                    <span>+{formatCurrency(receiptModal.tax_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-sm">
                                <span>الإجمالي:</span>
                                <span>{formatCurrency(receiptModal.total_amount)}</span>
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
                                autoFocus
                                onClick={handlePrintReceipt}
                                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95 ring-2 ring-emerald-400/40"
                            >
                                <Printer size={16} />
                                <span>طباعة الفاتورة للعميل (Enter ↵)</span>
                            </button>
                            <button
                                onClick={() => {
                                    setReceiptModal(null);
                                    setTimeout(() => barcodeInputRef.current?.focus(), 100);
                                }}
                                className="px-4 py-3 rounded-2xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                            >
                                تخطي للعميل التالي (Esc)
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

                        {shiftError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl font-bold">
                                {shiftError}
                            </div>
                        )}

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (tenant?.is_subscription_expired) {
                                setOpenShiftModal(false);
                                setSubscriptionExpiredModalOpen(true);
                                return;
                            }
                            setIsOpeningShift(true);
                            setShiftError('');
                            const balanceVal = (openingBalance === '' || openingBalance === null || isNaN(Number(openingBalance))) 
                                ? 0 
                                : Number(openingBalance);
                            router.post('/pos/shift/open', { 
                                opening_balance: balanceVal,
                                cashier_id: selectedCashierId || effectiveCashier?.id,
                            }, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setOpenShiftModal(false);
                                    setIsOpeningShift(false);
                                },
                                onError: (errors) => {
                                    setIsOpeningShift(false);
                                    setShiftError(errors.opening_balance || errors.message || 'حدث خطأ أثناء فتح الوردية');
                                },
                                onFinish: () => {
                                    setIsOpeningShift(false);
                                }
                            });
                        }} className="space-y-4 text-xs">
                            {/* Cashier Identity Card / Selector for Admin */}
                            {isAdmin && cashiers && cashiers.length > 0 ? (
                                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-3.5 text-right space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-indigo-300">
                                            فتح الوردية باسم الموظف:
                                        </label>
                                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                                            صلاحية مدير
                                        </span>
                                    </div>
                                    <select
                                        value={selectedCashierId}
                                        onChange={(e) => {
                                            const newId = Number(e.target.value);
                                            setSelectedCashierId(newId);
                                            router.visit(`/pos?cashier_id=${newId}`);
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        {cashiers.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.role === 'admin' ? 'مدير' : 'كاشير'})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="text-[10px] text-slate-400">
                                        🔒 سيتم فتح الوردية وتسجيل الفواتير رسمياً باسم الموظف المختار.
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 text-right space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block leading-tight">الموظف المسؤول عن الوردية</span>
                                                <span className="text-sm font-black text-white block mt-0.5">
                                                    {activeCashierName}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            <ShieldCheck size={12} />
                                            <span>حساب معتمد</span>
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                                        <span className="text-slate-400">🔒 الوردية تُسجل بحسابك تلقائياً لضمان مطابقة العهدة</span>
                                        <a
                                            href="/logout"
                                            className="text-amber-400 hover:text-amber-300 font-bold hover:underline transition text-[11px] flex items-center gap-1"
                                            title="تسجيل خروج ودخول كاشير آخر"
                                        >
                                            <span>تبديل الحساب؟</span>
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] text-slate-400">يمكنك البدء بـ 0 إذا كان الدرج فارغاً</span>
                                    <label className="font-semibold text-slate-300">
                                        مبلغ عهدة البداية (ج.م)
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    autoFocus
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black text-emerald-400 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                />
                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpeningBalance('0')}
                                        className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition ${
                                            openingBalance === '0' || openingBalance === 0
                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                        }`}
                                    >
                                        0 ج.م (فارغ)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpeningBalance('100')}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                                    >
                                        100 ج.م
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpeningBalance('200')}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                                    >
                                        200 ج.م
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpeningBalance('500')}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                                    >
                                        500 ج.م
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isOpeningShift}
                                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                            >
                                {isOpeningShift ? 'جاري فتح الوردية...' : 'فتح الوردية وبدء العمل'}
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
                            <span className="font-bold text-white text-sm">
                                تقفيل وردية: <span className="text-amber-400 font-bold">{activeCashierName}</span>
                            </span>
                            <button onClick={() => setCloseShiftModal(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right space-y-1.5">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                                <AlertTriangle size={16} />
                                <span>جرد النقدية بالدرج (العد الفعلي)</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                قم بعدّ النقدية الموجودة في الدرج يدوياً واكتب المبلغ الإجمالي بالكامل. سيتم احتساب المطابقة والعجز أو الزيادة تلقائياً في تقرير الإدارة، وسيتم تسجيل خروجك بأمان.
                            </p>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setIsClosingShift(true);
                            const actualVal = (closingActualCash === '' || closingActualCash === null || isNaN(Number(closingActualCash)))
                                ? 0
                                : Number(closingActualCash);
                            router.post('/pos/shift/close', { 
                                closing_balance: actualVal,
                                shift_id: currentShift?.id || null,
                            }, {
                                preserveScroll: false,
                                onSuccess: () => {
                                    setCloseShiftModal(false);
                                    setClosingActualCash('');
                                    // التحويل لصفحة تسجيل الدخول يتم من الباك إند تلقائياً
                                },
                                onError: () => {
                                    setIsClosingShift(false);
                                    setCloseShiftModal(false);
                                },
                                onFinish: () => {
                                    setIsClosingShift(false);
                                }
                            });
                        }} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    المبلغ الفعلي الموجود بالدرج (ج.م)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    autoFocus
                                    value={closingActualCash}
                                    onChange={(e) => setClosingActualCash(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black text-amber-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                                />
                                <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setClosingActualCash('0')}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                                    >
                                        0 ج.م (الدرج فارغ)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const expected = (parseFloat(currentShift?.opening_balance || 0) + parseFloat(currentShift?.cash_sales || 0)).toFixed(2);
                                            setClosingActualCash(expected);
                                        }}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
                                    >
                                        مطابق للمتوقع
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClosingActualCash('')}
                                        className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition"
                                    >
                                        مسح
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isClosingShift}
                                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isClosingShift ? (
                                    <span>جاري تقفيل الوردية وتسجيل الخروج...</span>
                                ) : (
                                    <span>إغلاق الوردية وتسليم الدرج والخروج</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Shift Invoices & Returns */}
            {invoicesModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                                        <span>فواتير الوردية الحالية</span>
                                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                                            {filteredInvoices.length} فاتورة
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        مراجعة وإعادة طباعة فواتيرك، أو استرجاع وإلغاء أي فاتورة وإعادة الأصناف للمخزن
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInvoicesModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-800/80 bg-slate-900 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    value={invoiceSearchQuery}
                                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                    placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                                />
                            </div>
                            {invoiceSearchQuery && (
                                <button
                                    onClick={() => setInvoiceSearchQuery('')}
                                    className="text-xs text-slate-400 hover:text-white"
                                >
                                    مسح
                                </button>
                            )}
                        </div>

                        {/* Invoices List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                            {filteredInvoices.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 space-y-2">
                                    <Receipt size={36} className="mx-auto opacity-30" />
                                    <p className="text-xs">لا توجد فواتير مسجلة مطابقة للبحث</p>
                                </div>
                            ) : (
                                filteredInvoices.map((inv) => {
                                    const isRefunded = inv.status === 'refunded';
                                    const itemsCount = inv.items?.reduce((s, it) => s + (Number(it.quantity) || 1), 0) || inv.items?.length || 0;
                                    return (
                                        <div
                                            key={inv.id || inv.invoice_number}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                                isRefunded
                                                    ? 'bg-rose-950/10 border-rose-500/20 opacity-75'
                                                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                                                    isRefunded ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                    {isRefunded ? <RotateCcw size={16} /> : <Receipt size={16} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-white text-xs">
                                                            {inv.invoice_number}
                                                        </span>
                                                        {isRefunded ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                                مرتجعة
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                مكتملة
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                            ({inv.payment_method === 'cash' ? 'نقدي' : 'فيزا'})
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                                                        <span>{inv.created_at ? formatDateTime(inv.created_at) : 'الآن'}</span>
                                                        <span>•</span>
                                                        <span>{itemsCount} قطعة ({inv.items?.length || 0} أصناف)</span>
                                                        {inv.customer_name && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-slate-300">{inv.customer_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                                                <div className="text-left">
                                                    <div className={`font-mono font-black text-sm ${isRefunded ? 'text-rose-400 line-through' : 'text-emerald-400'}`}>
                                                        {formatCurrency(inv.total_amount)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setReceiptModal(inv);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                                                        title="عرض الإيصال والطباعة"
                                                    >
                                                        <Printer size={13} />
                                                        <span>معاينة / طباعة</span>
                                                    </button>

                                                    {!isRefunded && (
                                                        <button
                                                            onClick={() => setRefundConfirmInvoice(inv)}
                                                            disabled={refundingId === inv.id}
                                                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                                            title="استرجاع الفاتورة بالكامل وإعادة الأصناف للمخزن"
                                                        >
                                                            <RotateCcw size={13} className={refundingId === inv.id ? 'animate-spin' : ''} />
                                                            <span>استرجاع</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                            <div className="text-xs text-slate-400">
                                إجمالي المبيعات النشطة:{' '}
                                <span className="text-emerald-400 font-mono font-bold">
                                    {formatCurrency(
                                        filteredInvoices
                                            .filter(i => i.status !== 'refunded')
                                            .reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={() => setInvoicesModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirm Refund */}
            {refundConfirmInvoice && (
                <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                            <RotateCcw size={24} />
                        </div>
                        <h2 className="text-base font-black text-white">تأكيد استرجاع الفاتورة</h2>
                        <p className="text-slate-300 text-xs leading-relaxed">
                            هل أنت متأكد من استرجاع الفاتورة رقم{' '}
                            <span className="font-mono font-bold text-white text-xs">{refundConfirmInvoice.invoice_number}</span>؟
                        </p>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-right">
                            <div className="flex justify-between text-slate-400">
                                <span>مبلغ الاسترجاع للعميل:</span>
                                <span className="font-mono font-bold text-rose-400">{formatCurrency(refundConfirmInvoice.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>طريقة الدفع الأصلية:</span>
                                <span className="text-white">{refundConfirmInvoice.payment_method === 'cash' ? 'نقدي' : 'فيزا'}</span>
                            </div>
                            <div className="text-[11px] text-amber-400/90 pt-1 border-t border-slate-850">
                                ⚠️ سيتم إعادة جميع كميات الأصناف لمخزن المحل تلقائياً، وخصم المبلغ من مبيعات الوردية.
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => handleRefundInvoice(refundConfirmInvoice)}
                                disabled={refundingId === refundConfirmInvoice.id}
                                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                            >
                                {refundingId === refundConfirmInvoice.id ? 'جاري الاسترجاع...' : 'نعم، استرجاع الفاتورة'}
                            </button>
                            <button
                                onClick={() => setRefundConfirmInvoice(null)}
                                disabled={refundingId === refundConfirmInvoice.id}
                                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                            >
                                إلغاء
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
                message="انتهت فترة اشتراك المتجر (أو انتهت التجربة المجانية 7 أيام). لإتمام عمليات البيع، فتح الورديات واسترجاع الفواتير، برجاء تجديد الاشتراك وتفعيل باقة المتجر."
            />
        </div>
    );
}
