<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class PosController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // موظفو الكاشير والإدارة المتاحون لهذا المتجر
        $cashiers = User::where('tenant_id', $tenant->id)
            ->whereIn('role', ['cashier', 'admin'])
            ->where('is_active', true)
            ->select(['id', 'name', 'email', 'role'])
            ->orderBy('name')
            ->get();

        $selectedCashierId = $request->input('cashier_id');
        $effectiveCashier = $user;

        if ($selectedCashierId && $user->isAdmin()) {
            $matched = $cashiers->firstWhere('id', (int) $selectedCashierId);
            if ($matched) {
                $effectiveCashier = $matched;
            }
        }

        // الوردية المفتوحة حالياً لهذا الكاشير
        $currentShift = CashierShift::with('cashier')
            ->where('tenant_id', $tenant->id)
            ->where('status', 'open')
            ->where('user_id', $effectiveCashier->id)
            ->latest('opened_at')
            ->first();

        // لو المدير داخل ومش محدد كاشير وما عندوش وردية خاصة بيه، يشوف أحدث وردية مفتوحة بالمتجر للمتابعة
        if (!$currentShift && $user->isAdmin() && !$request->filled('cashier_id')) {
            $currentShift = CashierShift::with('cashier')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();
            if ($currentShift && $currentShift->cashier) {
                $effectiveCashier = $currentShift->cashier;
            }
        }

        $activeCashierName = $effectiveCashier->name;

        $categories = Category::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        $products = Product::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select(['id', 'name', 'barcode', 'retail_price', 'cost_price', 'category_id', 'stock_quantity', 'unit'])
            ->get();

        $mainWarehouse = $tenant->mainWarehouse;

        // فواتير الوردية الحالية للكاشير
        $shiftInvoices = $currentShift
            ? Invoice::with('items')
                ->where('tenant_id', $tenant->id)
                ->where('shift_id', $currentShift->id)
                ->latest()
                ->get()
            : Invoice::with('items')
                ->where('tenant_id', $tenant->id)
                ->where('cashier_id', $effectiveCashier->id)
                ->whereDate('created_at', today())
                ->latest()
                ->take(30)
                ->get();

        return Inertia::render('Cashier/Pos', [
            'activeCashier' => $effectiveCashier,
            'cashierName' => $activeCashierName,
            'cashiers' => $cashiers,
            'currentShift' => $currentShift,
            'shiftInvoices' => $shiftInvoices,
            'categories' => $categories,
            'products' => $products,
            'mainWarehouse' => $mainWarehouse,
            'storeSettings' => $tenant->settings,
        ]);
    }

    public function openShift(Request $request): RedirectResponse|JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $validated = $request->validate([
            'opening_balance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:255',
            'cashier_id' => 'nullable|exists:users,id',
        ]);

        $openingBalance = isset($validated['opening_balance']) && is_numeric($validated['opening_balance'])
            ? (float) $validated['opening_balance']
            : 0.0;

        // إذا كان المستخدم مديراً وحدد كاشيراً معيناً للوردية
        $assignedUser = $user;
        if ($user->isAdmin() && !empty($validated['cashier_id'])) {
            $target = User::where('tenant_id', $tenant->id)->find($validated['cashier_id']);
            if ($target) {
                $assignedUser = $target;
            }
        }

        // التأكد من عدم وجود وردية مفتوحة بالفعل لهذا الكاشير
        $existing = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $assignedUser->id)
            ->where('status', 'open')
            ->first();

        if ($existing) {
            $msg = "يوجد وردية مفتوحة بالفعل باسم ({$assignedUser->name})";
            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['success' => false, 'message' => $msg, 'shift' => $existing], 422);
            }
            return back()->with('warning', $msg);
        }

        $shift = CashierShift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $assignedUser->id,
            'opening_balance' => $openingBalance,
            'cash_sales' => 0,
            'card_sales' => 0,
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        $shift->load('cashier');

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'success' => true, 
                'message' => "تم فتح الوردية باسم ({$assignedUser->name}) بنجاح بمبلغ عهدة (" . number_format($openingBalance, 2) . " ج.م)", 
                'shift' => $shift
            ]);
        }

        return back()->with('success', "تم فتح الوردية للكاشير ({$assignedUser->name}) بنجاح بمبلغ عهدة (" . number_format($openingBalance, 2) . " ج.م)، بالتوفيق!");
    }

    public function closeShift(Request $request): SymfonyResponse|RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $shiftQuery = CashierShift::where('tenant_id', $tenant->id)
            ->where('status', 'open');

        // إذا أُرسل shift_id محدد
        if ($request->filled('shift_id')) {
            $shiftQuery->where('id', $request->input('shift_id'));
            // الكاشير العادي لا يستطيع إغلاق سوى ورديته حصراً
            if ($user->isCashier()) {
                $shiftQuery->where('user_id', $user->id);
            }
        } else {
            // لو لم يُرسل shift_id
            if ($user->isCashier()) {
                $shiftQuery->where('user_id', $user->id);
            } else {
                // إذا كان مديراً، نبحث عن وردية خاصة به أولاً، وإن لم توجد نغلق أحدث وردية مفتوحة بالمتجر
                $adminShift = CashierShift::where('tenant_id', $tenant->id)
                    ->where('status', 'open')
                    ->where('user_id', $user->id)
                    ->latest('opened_at')
                    ->first();

                if ($adminShift) {
                    $shiftQuery->where('id', $adminShift->id);
                } else {
                    $latestStoreShift = CashierShift::where('tenant_id', $tenant->id)
                        ->where('status', 'open')
                        ->latest('opened_at')
                        ->first();
                    if ($latestStoreShift) {
                        $shiftQuery->where('id', $latestStoreShift->id);
                    }
                }
            }
        }

        $shift = $shiftQuery->latest('opened_at')->first();

        if (!$shift) {
            return back()->with('error', 'لا توجد وردية مفتوحة حالياً لإغلاقها');
        }

        $validated = $request->validate([
            'closing_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $expectedCash = $shift->opening_balance + $shift->cash_sales;
        $actualCash = (float) $validated['closing_balance'];
        $variance = $actualCash - $expectedCash; // سالب = عجز، موجب = زيادة

        $shift->update([
            'closing_balance' => $actualCash,
            'variance' => $variance,
            'status' => 'closed',
            'closed_at' => now(),
            'notes' => $validated['notes'] ?? $shift->notes,
        ]);

        $cashierName = $shift->cashier ? $shift->cashier->name : ($user->name ?? 'الكاشير');
        $formattedBalance = number_format($actualCash, 2);

        // تسجيل الخروج التلقائي فور تقفيل الوردية لضمان الأمان وتسليم الخزينة
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // مسح كوكيز التذكر والانتحال
        Cookie::queue(Cookie::forget('impersonate_token'));
        Cookie::queue(Cookie::forget('impersonated_tenant_id'));
        if (Auth::guard('web')->getRecallerName()) {
            Cookie::queue(Cookie::forget(Auth::guard('web')->getRecallerName()));
        }

        // توليد رابط صفحة الدخول مع رسالة التأكيد والمبلغ المسجل
        $centralLoginUrl = AuthenticatedSessionController::getCentralLoginUrl($request);
        $redirectUrl = $centralLoginUrl . (str_contains($centralLoginUrl, '?') ? '&' : '?') 
            . 'shift_closed=1&amount=' . urlencode($formattedBalance) 
            . '&cashier=' . urlencode($cashierName);

        if ($request->header('X-Inertia')) {
            return Inertia::location($redirectUrl);
        }

        return redirect()->away($redirectUrl);
    }

    /**
     * إتمام عملية البيع أونلاين
     */
    public function checkout(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,credit,split',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
        ]);

        $mainWarehouse = $tenant->mainWarehouse ?? \App\Models\Warehouse::firstOrCreate(
            ['tenant_id' => $tenant->id, 'type' => 'main'],
            ['name' => 'المخزن الرئيسي', 'is_active' => true]
        );
        $requestedCashierId = $request->input('cashier_id');
        $shift = null;
        if ($request->filled('shift_id')) {
            $shift = CashierShift::where('tenant_id', $tenant->id)
                ->where('status', 'open')
                ->find($request->shift_id);
        }

        if (!$shift && $requestedCashierId && $user->isAdmin()) {
            $shift = CashierShift::where('tenant_id', $tenant->id)
                ->where('user_id', $requestedCashierId)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();
        }

        if (!$shift) {
            $shift = CashierShift::where('tenant_id', $tenant->id)
                ->where('user_id', $user->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();
        }

        if (!$shift && $user->isAdmin()) {
            $shift = CashierShift::where('tenant_id', $tenant->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();
        }

        $effectiveCashierId = $shift?->user_id ?: ($requestedCashierId && $user->isAdmin() ? (int) $requestedCashierId : $user->id);

        $invoice = null;

        DB::transaction(function () use ($tenant, $user, $effectiveCashierId, $mainWarehouse, $shift, $validated, &$invoice) {
            $invoiceNumber = 'INV-' . date('ymd') . '-' . rand(1000, 9999);
            $costTotal = 0;

            // حساب إجمالي تكلفة البضاعة المباعة
            foreach ($validated['items'] as $item) {
                $p = Product::find($item['product_id']);
                $costTotal += ($p ? $p->cost_price : 0) * (float) $item['quantity'];
            }

            $invoice = Invoice::create([
                'tenant_id' => $tenant->id,
                'invoice_number' => $invoiceNumber,
                'type' => 'retail',
                'cashier_id' => $effectiveCashierId,
                'warehouse_id' => $mainWarehouse->id,
                'shift_id' => $shift?->id,
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'subtotal' => $validated['subtotal'],
                'discount_amount' => min((float) $validated['subtotal'], max(0, (float) ($validated['discount_amount'] ?? 0))),
                'tax_amount' => $validated['tax_amount'] ?? 0,
                'total_amount' => $validated['total_amount'],
                'cost_total' => $costTotal,
                'paid_amount' => $validated['paid_amount'],
                'remaining_amount' => max(0, $validated['total_amount'] - $validated['paid_amount']),
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
            ]);

            // إضافة البنود وخصم المخزون
            foreach ($validated['items'] as $item) {
                $p = Product::find($item['product_id']);
                $qty = (float) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];

                $invoice->items()->create([
                    'product_id' => $p?->id,
                    'product_name' => $p ? $p->name : 'صنف مخصص',
                    'quantity' => $qty,
                    'cost_price' => $p ? $p->cost_price : 0,
                    'unit_price' => $unitPrice,
                    'total_price' => $qty * $unitPrice,
                ]);

                if ($p) {
                    $p->decrement('stock_quantity', $qty);

                    $stock = ProductWarehouseStock::firstOrCreate(
                        ['tenant_id' => $tenant->id, 'warehouse_id' => $mainWarehouse->id, 'product_id' => $p->id],
                        ['quantity' => 0]
                    );
                    $stock->decrement('quantity', $qty);
                }
            }

            // تحديث إجمالي الوردية
            if ($shift) {
                if ($validated['payment_method'] === 'cash') {
                    $shift->increment('cash_sales', $validated['total_amount']);
                } else {
                    $shift->increment('card_sales', $validated['total_amount']);
                }
            }
        });

        return response()->json([
            'success' => true,
            'invoice' => $invoice->load('items'),
            'message' => 'تم إصدار الفاتورة وطباعة الإيصال بنجاح',
        ]);
    }

    /**
     * المزامنة الخلفية للفواتير المعلقة التي أُنشئت أوفلاين
     */
    public function syncOfflineInvoices(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();
        $invoices = $request->input('invoices', []);
        $syncedUuids = [];

        $mainWarehouse = $tenant->mainWarehouse;
        $activeShift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        foreach ($invoices as $inv) {
            $uuid = $inv['offline_uuid'] ?? null;
            if (!$uuid) continue;

            // إذا كانت الفاتورة متزامنة مسبقاً، تخطاها
            if (Invoice::where('tenant_id', $tenant->id)->where('offline_uuid', $uuid)->exists()) {
                $syncedUuids[] = $uuid;
                continue;
            }

            DB::transaction(function () use ($tenant, $user, $mainWarehouse, $activeShift, $inv, $uuid, &$syncedUuids) {
                $costTotal = 0;
                foreach ($inv['items'] as $it) {
                    $p = Product::find($it['product_id']);
                    $costTotal += ($p ? $p->cost_price : 0) * (float) $it['quantity'];
                }

                $createdInvoice = Invoice::create([
                    'tenant_id' => $tenant->id,
                    'invoice_number' => $inv['invoice_number'],
                    'offline_uuid' => $uuid,
                    'is_offline_sync' => true,
                    'type' => 'retail',
                    'cashier_id' => $user->id,
                    'warehouse_id' => $mainWarehouse->id,
                    'shift_id' => $activeShift?->id,
                    'customer_name' => $inv['customer_name'] ?? null,
                    'customer_phone' => $inv['customer_phone'] ?? null,
                    'subtotal' => $inv['subtotal'],
                    'discount_amount' => min((float) $inv['subtotal'], max(0, (float) ($inv['discount_amount'] ?? 0))),
                    'tax_amount' => $inv['tax_amount'] ?? 0,
                    'total_amount' => $inv['total_amount'],
                    'cost_total' => $costTotal,
                    'paid_amount' => $inv['paid_amount'],
                    'remaining_amount' => 0,
                    'payment_method' => $inv['payment_method'],
                    'status' => 'completed',
                    'created_at' => !empty($inv['created_at']) ? \Carbon\Carbon::parse($inv['created_at']) : now(),
                ]);

                foreach ($inv['items'] as $it) {
                    $p = Product::find($it['product_id']);
                    $qty = (float) $it['quantity'];
                    $unitPrice = (float) $it['unit_price'];

                    $createdInvoice->items()->create([
                        'product_id' => $p?->id,
                        'product_name' => $it['product_name'] ?? ($p ? $p->name : 'صنف'),
                        'quantity' => $qty,
                        'cost_price' => $p ? $p->cost_price : 0,
                        'unit_price' => $unitPrice,
                        'total_price' => $qty * $unitPrice,
                    ]);

                    // خصم المخزون حتى لو أصبح سالباً نتيجة البيع أوفلاين
                    if ($p) {
                        $p->decrement('stock_quantity', $qty);

                        $stock = ProductWarehouseStock::firstOrCreate(
                            ['tenant_id' => $tenant->id, 'warehouse_id' => $mainWarehouse->id, 'product_id' => $p->id],
                            ['quantity' => 0]
                        );
                        $stock->decrement('quantity', $qty);
                    }
                }

                if ($activeShift) {
                    if ($inv['payment_method'] === 'cash') {
                        $activeShift->increment('cash_sales', $inv['total_amount']);
                    } else {
                        $activeShift->increment('card_sales', $inv['total_amount']);
                    }
                }

                $syncedUuids[] = $uuid;
            });
        }

        return response()->json([
            'success' => true,
            'synced_uuids' => $syncedUuids,
            'message' => 'تمت مزامنة جميع الفواتير المحلية بنجاح وتحديث المخزون',
        ]);
    }

    /**
     * تحديث الكتالوج والمنتجات في متصفح الكاشير
     */
    public function getCatalog(): JsonResponse
    {
        $tenant = app(Tenant::class);

        $products = Product::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select(['id', 'name', 'barcode', 'retail_price', 'cost_price', 'category_id', 'stock_quantity', 'unit'])
            ->get();

        $categories = Category::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'products' => $products,
            'categories' => $categories,
            'timestamp' => now()->timestamp,
        ]);
    }

    /**
     * جلب فواتير الوردية الحالية للكاشير
     */
    public function getInvoices(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $currentShift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        $query = Invoice::with('items')
            ->where('tenant_id', $tenant->id)
            ->where('cashier_id', $user->id);

        if ($currentShift) {
            $query->where('shift_id', $currentShift->id);
        } else {
            $query->whereDate('created_at', today());
        }

        $invoices = $query->latest()->take(50)->get();

        return response()->json([
            'success' => true,
            'invoices' => $invoices,
        ]);
    }

    /**
     * استرجاع فاتورة وإعادة الأصناف للمخزن وخصمها من مبيعات الوردية
     */
    public function refundInvoice(Invoice $invoice, Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // التأكد من أن الفاتورة تتبع نفس المتجر
        if ($invoice->tenant_id !== $tenant->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح'], 403);
        }

        if ($invoice->status === 'refunded') {
            return response()->json(['success' => false, 'message' => 'هذه الفاتورة تم استرجاعها مسبقاً'], 422);
        }

        $mainWarehouse = $tenant->mainWarehouse;
        $activeShift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        DB::transaction(function () use ($invoice, $tenant, $mainWarehouse, $activeShift) {
            // 1. إعادة البضاعة للمخزن
            foreach ($invoice->items as $item) {
                if ($item->product_id) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->increment('stock_quantity', $item->quantity);
                    }

                    if ($mainWarehouse) {
                        $stock = ProductWarehouseStock::firstOrCreate(
                            ['tenant_id' => $tenant->id, 'warehouse_id' => $mainWarehouse->id, 'product_id' => $item->product_id],
                            ['quantity' => 0]
                        );
                        $stock->increment('quantity', $item->quantity);
                    }
                }
            }

            // 2. تحديث حالة الفاتورة
            $invoice->update([
                'status' => 'refunded',
                'notes' => trim(($invoice->notes ?? '') . ' | تم استرجاع الفاتورة بتاريخ ' . now()->format('Y-m-d H:i')),
            ]);

            // 3. خصم المبلغ من مبيعات الوردية الحالية إن وُجدت
            $targetShift = $invoice->shift ?? $activeShift;
            if ($targetShift) {
                if ($invoice->payment_method === 'cash') {
                    $targetShift->decrement('cash_sales', min($targetShift->cash_sales, $invoice->total_amount));
                } else {
                    $targetShift->decrement('card_sales', min($targetShift->card_sales, $invoice->total_amount));
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'تم استرجاع الفاتورة وإعادة الأصناف للمخزن بنجاح',
            'invoice' => $invoice->fresh(['items']),
        ]);
    }
}
