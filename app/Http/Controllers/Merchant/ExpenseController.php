<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app(Tenant::class);

        $query = Expense::where('tenant_id', $tenant->id)
            ->with(['category', 'user', 'vanTrip.salesRep'])
            ->latest('expense_date');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('expense_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('expense_date', '<=', $request->to_date);
        }

        $totalExpenses = (clone $query)->sum('amount');
        $expenses = $query->paginate(20)->withQueryString();
        $categories = ExpenseCategory::where('tenant_id', $tenant->id)->get();

        return Inertia::render('Merchant/Expenses/Index', [
            'expenses' => $expenses,
            'categories' => $categories,
            'total_amount' => $totalExpenses,
            'filters' => $request->only(['category_id', 'from_date', 'to_date']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'attachment' => 'nullable|image|max:2048',
            'notes' => 'nullable|string|max:500',
        ]);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('expenses/' . $tenant->id, 'public');
        }

        Expense::create([
            'tenant_id' => $tenant->id,
            'category_id' => $validated['category_id'],
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'amount' => $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'attachment_path' => $attachmentPath,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'تم تسجيل المصروف بنجاح');
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $tenant->expenseCategories()->create([
            'name' => $validated['name'],
        ]);

        return back()->with('success', 'تمت إضافة قسم المصروفات بنجاح');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($expense->tenant_id !== $tenant->id) abort(403);

        if ($expense->attachment_path) {
            Storage::disk('public')->delete($expense->attachment_path);
        }

        $expense->delete();

        return back()->with('success', 'تم حذف المصروف بنجاح');
    }
}
