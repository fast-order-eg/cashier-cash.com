<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseAuditLog;
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
            ->with(['category', 'user', 'vanTrip.salesRep', 'auditLogs.user'])
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

        // استبعاد بيانات الاختبار إن لم يتم طلب تضمينها
        if ($request->boolean('exclude_test', true)) {
            $query->where('is_test', false);
        }

        $totalExpenses = (clone $query)->sum('amount');
        $expenses = $query->paginate(20)->withQueryString();
        $categories = ExpenseCategory::where('tenant_id', $tenant->id)->get();

        return Inertia::render('Merchant/Expenses/Index', [
            'expenses' => $expenses,
            'categories' => $categories,
            'total_amount' => $totalExpenses,
            'filters' => $request->only(['category_id', 'from_date', 'to_date', 'exclude_test']),
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
            'is_test' => 'nullable|boolean',
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
            'is_test' => $request->boolean('is_test', false),
        ]);

        return back()->with('success', 'تم تسجيل المصروف بنجاح');
    }

    /**
     * تعديل بيانات المصروف والتحقق وحفظ سجل التدقيق بالقيم السابقة والجديدة
     */
    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($expense->tenant_id !== $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'audit_notes' => 'nullable|string|max:500',
        ], [
            'title.required' => 'يرجى كتابة بيان المصروف.',
            'category_id.required' => 'يرجى اختيار قسم المصروف.',
            'category_id.exists' => 'قسم المصروف غير صحيح.',
            'amount.required' => 'المبلغ مطلوب.',
            'amount.min' => 'المبلغ يجب أن يكون أكبر من صفر.',
            'expense_date.required' => 'تاريخ المصروف مطلوب.',
            'expense_date.date' => 'يرجى إدخال تاريخ صالح.',
        ]);

        // تجهيز القيم قبل التعديل
        $oldCategory = $expense->category;
        $oldValues = [
            'title' => $expense->title,
            'category_id' => $expense->category_id,
            'category_name' => $oldCategory?->name,
            'amount' => (float) $expense->amount,
            'expense_date' => $expense->expense_date ? $expense->expense_date->format('Y-m-d') : null,
            'notes' => $expense->notes,
        ];

        $newCategory = ExpenseCategory::find($validated['category_id']);
        $newValues = [
            'title' => $validated['title'],
            'category_id' => (int) $validated['category_id'],
            'category_name' => $newCategory?->name,
            'amount' => (float) $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'notes' => $validated['notes'] ?? null,
        ];

        // تسجيل في جدول التدقيق إذا حدث أي تعديل
        $hasChanges = false;
        foreach (['title', 'category_id', 'amount', 'expense_date', 'notes'] as $field) {
            if ((string)$oldValues[$field] !== (string)$newValues[$field]) {
                $hasChanges = true;
                break;
            }
        }

        if ($hasChanges) {
            ExpenseAuditLog::create([
                'tenant_id' => $tenant->id,
                'expense_id' => $expense->id,
                'user_id' => auth()->id(),
                'action' => 'update',
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'notes' => $validated['audit_notes'] ?? 'تعديل بيانات المصروف',
            ]);

            $expense->update([
                'title' => $validated['title'],
                'category_id' => $validated['category_id'],
                'amount' => $validated['amount'],
                'expense_date' => $validated['expense_date'],
                'notes' => $validated['notes'] ?? null,
            ]);
        }

        return back()->with('success', 'تم حفظ تعديلات المصروف وتوثيقها في سجل التدقيق بنجاح');
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
