<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
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

        return Inertia::render('Merchant/Settings/Index', [
            'tenant' => $tenant,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $tenant = $this->getTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'logo' => 'nullable|image|max:2048',
            'currency' => 'nullable|string|max:10',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'tax_enabled' => 'boolean',
            'tax_number' => 'nullable|string|max:50',
            'receipt_header' => 'nullable|string|max:255',
            'receipt_footer' => 'nullable|string|max:255',
            'allow_negative_stock' => 'boolean',
        ]);

        $settings = $tenant->settings ?? [];
        $settings['currency'] = $validated['currency'] ?? $settings['currency'] ?? 'ج.م';
        $settings['tax_rate'] = $validated['tax_rate'] ?? 0;
        $settings['tax_enabled'] = $validated['tax_enabled'] ?? false;
        $settings['tax_number'] = $validated['tax_number'] ?? '';
        $settings['receipt_header'] = $validated['receipt_header'] ?? '';
        $settings['receipt_footer'] = $validated['receipt_footer'] ?? '';
        $settings['allow_negative_stock'] = $validated['allow_negative_stock'] ?? true;

        $updateData = [
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'settings' => $settings,
        ];

        if ($request->hasFile('logo')) {
            if ($tenant->logo) {
                Storage::disk('public')->delete($tenant->logo);
            }
            $updateData['logo'] = $request->file('logo')->store('logos/' . $tenant->id, 'public');
        }

        $tenant->update($updateData);

        return redirect('/admin/settings')->with('success', 'تم حفظ إعدادات المتجر بنجاح');
    }
}
