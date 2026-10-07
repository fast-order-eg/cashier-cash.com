<?php

namespace App\Http\Controllers\SalesRep;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Tenant;
use App\Models\VanTrip;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VanSalesController extends Controller
{
    public function index(): Response
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // المخزن الخاص بسيارة هذا المندوب
        $vanWarehouse = Warehouse::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('type', 'van')
            ->first();

        // الرحلة النشطة الحالية
        $activeTrip = VanTrip::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('status', 'open')
            ->first();

        // البضاعة المتاحة داخل سيارة المندوب
        $vanProducts = [];
        if ($vanWarehouse) {
            $vanStocks = ProductWarehouseStock::where('warehouse_id', $vanWarehouse->id)
                ->with('product.category')
                ->get();

            foreach ($vanStocks as $stock) {
                if ($stock->product && $stock->product->is_active) {
                    $vanProducts[] = [
                        'id' => $stock->product->id,
                        'name' => $stock->product->name,
                        'barcode' => $stock->product->barcode,
                        'wholesale_price' => (float) $stock->product->wholesale_price,
                        'cost_price' => (float) $stock->product->cost_price,
                        'stock_in_van' => (float) $stock->quantity,
                        'unit' => $stock->product->unit,
                        'category_name' => $stock->product->category?->name ?? 'عام',
                    ];
                }
            }
        }

        // فواتير رحلة اليوم
        $tripInvoices = $activeTrip ? Invoice::where('van_trip_id', $activeTrip->id)
            ->with('items')
            ->latest()
            ->get() : [];

        // مصاريف رحلة اليوم (بنزين، كارتات)
        $tripExpenses = $activeTrip ? Expense::where('van_trip_id', $activeTrip->id)
            ->with('category')
            ->latest()
            ->get() : [];

        $expenseCategories = ExpenseCategory::where('tenant_id', $tenant->id)->get();

        return Inertia::render('SalesRep/Dashboard', [
            'activeTrip' => $activeTrip,
            'vanWarehouse' => $vanWarehouse,
            'vanProducts' => $vanProducts,
            'tripInvoices' => $tripInvoices,
            'tripExpenses' => $tripExpenses,
            'expenseCategories' => $expenseCategories,
        ]);
    }

    /**
     * بدء الوردية اليومية للسيارة وتسجيل عداد البداية
     */
    public function startTrip(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $vanWarehouse = Warehouse::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('type', 'van')
            ->first();

        if (!$vanWarehouse) {
            return back()->with('error', 'ليس لديك سيارة توزيع مخصصة، يرجى مراجعة إدارة المتجر');
        }

        $validated = $request->validate([
            'start_odometer' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        VanTrip::create([
            'tenant_id' => $tenant->id,
            'sales_rep_id' => $user->id,
            'warehouse_id' => $vanWarehouse->id,
            'start_odometer' => $validated['start_odometer'],
            'status' => 'open',
            'start_time' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'تم بدء رحلة التوزيع وتسجيل قراءة العداد بنجاح');
    }

    /**
     * إنهاء الوردية اليومية للسيارة، تسجيل عداد النهاية، وحساب المسافة المقطوعة
     */
    public function endTrip(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $trip = VanTrip::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('status', 'open')
            ->firstOrFail();

        $validated = $request->validate([
            'end_odometer' => 'required|numeric|gte:' . $trip->start_odometer,
            'total_cash_collected' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $totalDistance = $validated['end_odometer'] - $trip->start_odometer;

        $cashSales = (float) $trip->invoices()
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('paid_amount');

        $totalCashCollected = (float) $validated['total_cash_collected'];
        $difference = round($cashSales - $totalCashCollected, 2);
        $settlementStatus = ($difference == 0) ? 'balanced' : 'unsettled';

        $trip->update([
            'end_odometer' => $validated['end_odometer'],
            'total_distance' => $totalDistance,
            'cash_sales' => $cashSales,
            'total_cash_collected' => $totalCashCollected,
            'difference' => $difference,
            'status' => 'closed',
            'settlement_status' => $settlementStatus,
            'end_time' => now(),
            'notes' => $validated['notes'] ?? $trip->notes,
        ]);

        if ($difference == 0) {
            $statusMsg = "تم إغلاق رحلة اليوم بنجاح وتصفية الحساب بالكامل (متوازنة).";
        } elseif ($difference > 0) {
            $statusMsg = "تم إغلاق الوردية وتسجيل توريد {$totalCashCollected} ج.م. يوجد عجز/رصيد مستحق بقيمة {$difference} ج.م بانتظار اعتماد الإدارة.";
        } else {
            $surplus = abs($difference);
            $statusMsg = "تم إغلاق الوردية وتسجيل توريد {$totalCashCollected} ج.م. يوجد فائض توريد بقيمة {$surplus} ج.م بانتظار اعتماد الإدارة.";
        }

        return back()->with('success', "المسافة المقطوعة: {$totalDistance} كم. {$statusMsg}");
    }

    /**
     * إصدار فاتورة بيع بالجملة وخصم البضاعة من مخزن سيارة المندوب
     */
    public function checkout(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $trip = VanTrip::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$trip) {
            return response()->json(['error' => 'يجب تسجيل عداد بداية اليوم أولاً لبدء البيع'], 422);
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,credit',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $invoice = null;

        DB::transaction(function () use ($tenant, $user, $trip, $validated, &$invoice) {
            $subtotal = 0;
            $costTotal = 0;

            foreach ($validated['items'] as $item) {
                $p = Product::find($item['product_id']);
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];

                $subtotal += $qty * $price;
                $costTotal += ($p ? $p->cost_price : 0) * $qty;
            }

            $discount = (float) ($validated['discount_amount'] ?? 0);
            $totalAmount = max(0, $subtotal - $discount);
            $paidAmount = (float) $validated['paid_amount'];
            $remaining = max(0, $totalAmount - $paidAmount);

            $invoiceNumber = 'VAN-' . date('ymd') . '-' . rand(1000, 9999);

            $invoice = Invoice::create([
                'tenant_id' => $tenant->id,
                'invoice_number' => $invoiceNumber,
                'type' => 'wholesale',
                'sales_rep_id' => $user->id,
                'warehouse_id' => $trip->warehouse_id,
                'van_trip_id' => $trip->id,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'total_amount' => $totalAmount,
                'cost_total' => $costTotal,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remaining,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
            ]);

            // خصم البضاعة من مخزن سيارة المندوب
            foreach ($validated['items'] as $item) {
                $p = Product::find($item['product_id']);
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];

                $invoice->items()->create([
                    'product_id' => $p?->id,
                    'product_name' => $p ? $p->name : 'صنف',
                    'quantity' => $qty,
                    'cost_price' => $p ? $p->cost_price : 0,
                    'unit_price' => $price,
                    'total_price' => $qty * $price,
                ]);

                // خصم من مخزن السيارة
                $vanStock = ProductWarehouseStock::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'warehouse_id' => $trip->warehouse_id, 'product_id' => $p->id],
                    ['quantity' => 0]
                );
                $vanStock->decrement('quantity', $qty);

                // خصم من الرصيد الكلي العام للمتجر
                if ($p) {
                    $p->decrement('stock_quantity', $qty);
                }
            }

            // تحديث إجمالي مبيعات الرحلة والمبيعات النقدية
            $trip->increment('total_sales', $totalAmount);
            if ($validated['payment_method'] === 'cash') {
                $trip->increment('cash_sales', $paidAmount);
            }
        });

        return response()->json([
            'success' => true,
            'invoice' => $invoice->load('items'),
            'message' => 'تم إصدار فاتورة الجملة وتحديث مخزن السيارة بنجاح',
        ]);
    }

    /**
     * تسجيل مصروف خاص برحلة السيارة (بنزين، كارتات، غسيل)
     */
    public function recordExpense(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $trip = VanTrip::where('tenant_id', $tenant->id)
            ->where('sales_rep_id', $user->id)
            ->where('status', 'open')
            ->first();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:255',
        ]);

        Expense::create([
            'tenant_id' => $tenant->id,
            'category_id' => $validated['category_id'],
            'user_id' => $user->id,
            'van_trip_id' => $trip?->id,
            'title' => $validated['title'],
            'amount' => $validated['amount'],
            'expense_date' => now()->toDateString(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'تم تسجيل مصروف السيارة بنجاح');
    }
}
