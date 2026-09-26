<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductWarehouseStock;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $query = Product::where('tenant_id', $tenant->id)
            ->with(['category', 'warehouseStocks.warehouse'])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'min_stock_alert');
        }

        if ($request->boolean('negative_stock')) {
            $query->where('stock_quantity', '<', 0);
        }

        $products = $query->paginate(20)->withQueryString();
        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();

        return Inertia::render('Merchant/Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'low_stock', 'negative_stock']),
        ]);
    }

    public function create(): Response
    {
        $tenant = app(Tenant::class);
        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();

        return Inertia::render('Merchant/Products/Create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'barcode' => 'nullable|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'required|numeric|min:0',
            'wholesale_price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|numeric',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'image' => 'nullable|image|max:2048',
        ]);

        // إذا لم يدخل باركود، نولّد باركود فريد
        $barcode = $validated['barcode'] ?: (string) rand(100000000000, 999999999999);

        // التأكد من عدم تكرار الباركود في نفس المتجر
        if (Product::where('tenant_id', $tenant->id)->where('barcode', $barcode)->exists()) {
            return back()->withErrors(['barcode' => 'هذا الباركود مستخدم بالفعل لصنف آخر']);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products/' . $tenant->id, 'public');
        }

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'barcode' => $barcode,
            'cost_price' => $validated['cost_price'],
            'retail_price' => $validated['retail_price'],
            'wholesale_price' => $validated['wholesale_price'],
            'stock_quantity' => $validated['stock_quantity'],
            'min_stock_alert' => $validated['min_stock_alert'] ?? 5,
            'unit' => $validated['unit'] ?? 'قطعة',
            'image_path' => $imagePath,
            'is_active' => true,
        ]);

        // إضافة الرصيد إلى المخزن الرئيسي للمتجر
        $mainWarehouse = $tenant->mainWarehouse;
        if ($mainWarehouse) {
            ProductWarehouseStock::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'warehouse_id' => $mainWarehouse->id,
                    'product_id' => $product->id,
                ],
                [
                    'quantity' => $validated['stock_quantity'],
                ]
            );
        }

        return redirect()->route('admin.products.index')->with('success', 'تمت إضافة الصنف بنجاح');
    }

    public function edit(Product $product): Response
    {
        $tenant = app(Tenant::class);
        if ($product->tenant_id !== $tenant->id) abort(403);

        $categories = Category::where('tenant_id', $tenant->id)->where('is_active', true)->get();
        $product->load('warehouseStocks.warehouse');

        return Inertia::render('Merchant/Products/Edit', [
            'product' => $product,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($product->tenant_id !== $tenant->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'barcode' => 'required|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'required|numeric|min:0',
            'wholesale_price' => 'required|numeric|min:0',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'image' => 'nullable|image|max:2048',
        ]);

        if (Product::where('tenant_id', $tenant->id)->where('barcode', $validated['barcode'])->where('id', '!=', $product->id)->exists()) {
            return back()->withErrors(['barcode' => 'هذا الباركود مستخدم بالفعل لصنف آخر']);
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products/' . $tenant->id, 'public');
        }

        $product->update($validated);

        return redirect()->route('admin.products.index')->with('success', 'تم تحديث بيانات الصنف بنجاح');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($product->tenant_id !== $tenant->id) abort(403);

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return back()->with('success', 'تم حذف الصنف بنجاح');
    }
}
