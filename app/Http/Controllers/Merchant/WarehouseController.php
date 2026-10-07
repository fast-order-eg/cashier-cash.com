<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WarehouseController extends Controller
{
    private function getTenant(): Tenant
    {
        if (app()->has(Tenant::class)) {
            $t = app(Tenant::class);
            if ($t instanceof Tenant) {
                return $t;
            }
        }

        $user = auth()->user();
        if ($user && $user->tenant_id) {
            $t = Tenant::find($user->tenant_id);
            if ($t) {
                app()->instance(Tenant::class, $t);
                return $t;
            }
        }

        $impersonated = session('impersonated_tenant_id');
        if ($impersonated) {
            $t = Tenant::find($impersonated);
            if ($t) {
                app()->instance(Tenant::class, $t);
                return $t;
            }
        }

        $t = Tenant::first();
        if ($t) {
            app()->instance(Tenant::class, $t);
            return $t;
        }

        abort(404, 'المتجر غير موجود');
    }

    public function index(): Response
    {
        $tenant = $this->getTenant();

        $warehouses = Warehouse::where('tenant_id', $tenant->id)
            ->with(['salesRep', 'productStocks.product'])
            ->get();

        $salesReps = User::where('tenant_id', $tenant->id)
            ->where('role', 'sales_rep')
            ->where('is_active', true)
            ->get();

        $products = Product::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        $recentDispatches = StockMovement::where('tenant_id', $tenant->id)
            ->with(['fromWarehouse', 'toWarehouse', 'dispatcher', 'items.product'])
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('Merchant/Warehouses/Index', [
            'warehouses' => $warehouses,
            'sales_reps' => $salesReps,
            'products' => $products,
            'recent_dispatches' => $recentDispatches,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->getTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:main,van',
            'sales_rep_id' => 'nullable|exists:users,id',
            'vehicle_plate' => 'nullable|string|max:50',
        ]);

        $tenant->warehouses()->create($validated);

        return redirect('/admin/warehouses')->with('success', 'تم إنشاء المخزن / سيارة المندوب بنجاح');
    }

    /**
     * إذن صرف / تحميل بضاعة من المخزن الرئيسي إلى سيارة المندوب
     */
    public function dispatchStock(Request $request): RedirectResponse
    {
        $tenant = $this->getTenant();

        $validated = $request->validate([
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'to_warehouse_id' => 'required|exists:warehouses,id|different:from_warehouse_id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:500',
        ]);

        $fromWarehouse = Warehouse::where('tenant_id', $tenant->id)->findOrFail($validated['from_warehouse_id']);
        $toWarehouse = Warehouse::where('tenant_id', $tenant->id)->findOrFail($validated['to_warehouse_id']);

        DB::transaction(function () use ($tenant, $fromWarehouse, $toWarehouse, $validated) {
            $movement = StockMovement::create([
                'tenant_id' => $tenant->id,
                'from_warehouse_id' => $fromWarehouse->id,
                'to_warehouse_id' => $toWarehouse->id,
                'dispatched_by' => auth()->id(),
                'received_by' => $toWarehouse->sales_rep_id,
                'reference_number' => 'DSP-' . date('Ymd') . '-' . rand(1000, 9999),
                'type' => 'van_dispatch',
                'status' => 'completed',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $productId = $item['product_id'];
                $qty = (float) $item['quantity'];

                // تسجيل بند الحركة
                $movement->items()->create([
                    'product_id' => $productId,
                    'quantity' => $qty,
                ]);

                // خصم من المخزن المرسل
                $fromStock = ProductWarehouseStock::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'warehouse_id' => $fromWarehouse->id, 'product_id' => $productId],
                    ['quantity' => 0]
                );
                $fromStock->decrement('quantity', $qty);

                // إضافة للمخزن المستقبل (سيارة المندوب)
                $toStock = ProductWarehouseStock::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'warehouse_id' => $toWarehouse->id, 'product_id' => $productId],
                    ['quantity' => 0]
                );
                $toStock->increment('quantity', $qty);
            }
        });

        return redirect('/admin/warehouses')->with('success', 'تم تسجيل إذن صرف البضاعة وتحميلها لسيارة المندوب بنجاح');
    }
}
