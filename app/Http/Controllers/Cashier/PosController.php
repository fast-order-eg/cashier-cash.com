<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index(): Response
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // الوردية المفتوحة حالياً لهذا الكاشير
        $currentShift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        $categories = Category::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        $products = Product::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select(['id', 'name', 'barcode', 'retail_price', 'cost_price', 'category_id', 'stock_quantity', 'unit'])
            ->get();

        $mainWarehouse = $tenant->mainWarehouse;

        return Inertia::render('Cashier/Pos', [
            'currentShift' => $currentShift,
            'categories' => $categories,
            'products' => $products,
            'mainWarehouse' => $mainWarehouse,
            'storeSettings' => $tenant->settings,
        ]);
    }

    public function openShift(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        // التأكد من عدم وجود وردية مفتوحة بالفعل
        $existing = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return back()->with('warning', 'لديك وردية مفتوحة بالفعل');
        }

        $validated = $request->validate([
            'opening_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        CashierShift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'opening_balance' => $validated['opening_balance'],
            'cash_sales' => 0,
            'card_sales' => 0,
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'تم فتح الوردية بنجاح، بالتوفيق!');
    }

    public function closeShift(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);
        $user = auth()->user();

        $shift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->firstOrFail();

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

        return back()->with('success', 'تم إغلاق الوردية ومطابقة النقدية بنجاح');
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

        $mainWarehouse = $tenant->mainWarehouse;
        $shift = CashierShift::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        $invoice = null;

        DB::transaction(function () use ($tenant, $user, $mainWarehouse, $shift, $validated, &$invoice) {
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
                'cashier_id' => $user->id,
                'warehouse_id' => $mainWarehouse->id,
                'shift_id' => $shift?->id,
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'subtotal' => $validated['subtotal'],
                'discount_amount' => $validated['discount_amount'] ?? 0,
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
                    'discount_amount' => $inv['discount_amount'] ?? 0,
                    'tax_amount' => $inv['tax_amount'] ?? 0,
                    'total_amount' => $inv['total_amount'],
                    'cost_total' => $costTotal,
                    'paid_amount' => $inv['paid_amount'],
                    'remaining_amount' => 0,
                    'payment_method' => $inv['payment_method'],
                    'status' => 'completed',
                    'created_at' => $inv['created_at'] ?? now(),
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
}
