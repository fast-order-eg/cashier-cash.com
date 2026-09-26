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
    public function index(): Response
    {
        $tenant = app(Tenant::class);
        $categories = Category::where('tenant_id', $tenant->id)
            ->withCount('products')
            ->latest()
            ->get();

        return Inertia::render('Merchant/Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $tenant->categories()->create([
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#3B82F6',
            'is_active' => true,
        ]);

        return back()->with('success', 'تمت إضافة القسم بنجاح');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($category->tenant_id !== $tenant->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'تم تعديل بيانات القسم بنجاح');
    }

    public function destroy(Category $category): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($category->tenant_id !== $tenant->id) abort(403);

        if ($category->products()->count() > 0) {
            return back()->with('error', 'لا يمكن حذف القسم لاحتوائه على منتجات مرتبطة');
        }

        $category->delete();

        return back()->with('success', 'تم حذف القسم بنجاح');
    }
}
