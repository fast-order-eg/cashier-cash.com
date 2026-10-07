<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    protected function getTenant(): Tenant
    {
        if (app()->bound(Tenant::class)) {
            return app(Tenant::class);
        }

        $tenant = auth()->user()?->tenant ?? Tenant::first();
        if (!$tenant) {
            abort(403, 'لا يوجد متجر متاح');
        }

        app()->instance(Tenant::class, $tenant);
        return $tenant;
    }

    protected function resolveCategory(Category|string|int $category): Category
    {
        if ($category instanceof Category) {
            return $category;
        }

        return Category::findOrFail((int) $category);
    }

    public function index(): Response
    {
        $tenant = $this->getTenant();
        $categories = Category::where('tenant_id', $tenant->id)
            ->withCount('products')
            ->latest()
            ->get();

        return Inertia::render('Merchant/Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $tenant = $this->getTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $category = $tenant->categories()->create([
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#3B82F6',
            'is_active' => true,
        ]);

        // إذا كان الطلب من نافذة إنشاء القسم السريعة عبر Axios وليس طلباً من Inertia
        if (!$request->header('X-Inertia') && ($request->has('json') || $request->wantsJson() || $request->ajax())) {
            return response()->json([
                'success' => true,
                'category' => $category,
                'message' => 'تمت إضافة القسم بنجاح',
            ]);
        }

        return back()->with('success', 'تمت إضافة القسم بنجاح');
    }

    public function update(Request $request, Category|string|int $category): RedirectResponse
    {
        $category = $this->resolveCategory($category);
        $tenant = $this->getTenant();
        if ($category->tenant_id !== $tenant->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'تم تعديل بيانات القسم بنجاح');
    }

    public function destroy(Category|string|int $category): RedirectResponse
    {
        $category = $this->resolveCategory($category);
        $tenant = $this->getTenant();
        if ($category->tenant_id !== $tenant->id) abort(403);

        if ($category->products()->count() > 0) {
            return back()->with('error', 'لا يمكن حذف القسم لاحتوائه على منتجات مرتبطة');
        }

        $category->delete();

        return back()->with('success', 'تم حذف القسم بنجاح');
    }
}
