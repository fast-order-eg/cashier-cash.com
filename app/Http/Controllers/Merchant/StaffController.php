<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    public function index(): Response
    {
        $tenant = app(Tenant::class);

        $staff = User::where('tenant_id', $tenant->id)
            ->latest()
            ->get();

        $maxAllowed = $tenant->maxAllowedEmployees();
        $currentCount = $staff->count();
        $canAdd = $tenant->canAddEmployee();

        return Inertia::render('Merchant/Staff/Index', [
            'staff' => $staff,
            'ownerId' => $tenant->owner_id,
            'maxAllowed' => $maxAllowed,
            'currentCount' => $currentCount,
            'canAdd' => $canAdd,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        if (!$tenant->canAddEmployee()) {
            return back()->with('error', 'لقد وصلت للحد الأقصى لعدد الموظفين المسموح به في باقتك. يرجى ترقية الباقة أو شراء مقاعد إضافية.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|max:20',
            'role' => 'required|in:cashier,sales_rep,admin',
            'password' => 'required|string|min:6',
        ]);

        $tenant->users()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        return back()->with('success', 'تمت إضافة الموظف بنجاح');
    }

    public function update(Request $request, User $staff): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($staff->tenant_id !== $tenant->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $staff->id,
            'phone' => 'required|string|max:20',
            'role' => 'required|in:cashier,sales_rep,admin',
            'password' => 'nullable|string|min:6',
            'is_active' => 'boolean',
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $staff->update($data);

        return back()->with('success', 'تم تعديل بيانات الموظف بنجاح');
    }

    public function destroy(User $staff): RedirectResponse
    {
        $tenant = app(Tenant::class);
        if ($staff->tenant_id !== $tenant->id || $staff->id === $tenant->owner_id) {
            abort(403);
        }

        $staff->delete();

        return back()->with('success', 'تم حذف الموظف بنجاح');
    }
}
