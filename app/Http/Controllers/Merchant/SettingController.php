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
    public function index(): Response
    {
        $tenant = app(Tenant::class);

        return Inertia::render('Merchant/Settings/Index', [
            'tenant' => $tenant,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $tenant = app(Tenant::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'logo' => 'nullable|image|max:2048',
            'currency' => 'required|string|max:10',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'tax_enabled' => 'boolean',
            'tax_number' => 'nullable|string|max:50',
            'receipt_header' => 'nullable|string|max:255',
            'receipt_footer' => 'nullable|string|max:255',
            'allow_negative_stock' => 'boolean',
        ]);

        $settings = $tenant->settings ?? [];
        $settings['currency'] = $validated['currency'];
        $settings['tax_rate'] = $validated['tax_rate'] ?? 0;
        $settings['tax_enabled'] = $validated['tax_enabled'] ?? false;
        $settings['tax_number'] = $validated['tax_number'] ?? '';
        $settings['receipt_header'] = $validated['receipt_header'] ?? '';
        $settings['receipt_footer'] = $validated['receipt_footer'] ?? '';
        $settings['allow_negative_stock'] = $validated['allow_negative_stock'] ?? true;

        $updateData = [
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'settings' => $settings,
        ];

        if ($request->hasFile('logo')) {
            if ($tenant->logo) {
                Storage::disk('public')->delete($tenant->logo);
            }
            $updateData['logo'] = $request->file('logo')->store('logos/' . $tenant->id, 'public');
        }

        $tenant->update($updateData);

        return back()->with('success', 'تم حفظ إعدادات المتجر بنجاح');
    }
}
