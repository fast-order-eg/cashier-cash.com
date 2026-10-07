<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentSettingController extends Controller
{
    public function index(): Response
    {
        $settings = PlatformSetting::getAll();

        return Inertia::render('SuperAdmin/PaymentSettings', [
            'settings' => [
                'active_gateway' => $settings['active_gateway'] ?? 'paymob',
                // Paymob
                'paymob_api_key' => $settings['paymob_api_key'] ?? '',
                'paymob_secret_key' => $settings['paymob_secret_key'] ?? '',
                'paymob_public_key' => $settings['paymob_public_key'] ?? '',
                'paymob_card_integration_id' => $settings['paymob_card_integration_id'] ?? '',
                'paymob_wallet_integration_id' => $settings['paymob_wallet_integration_id'] ?? '',
                'paymob_iframe_id' => $settings['paymob_iframe_id'] ?? '',
                'paymob_mode' => $settings['paymob_mode'] ?? 'test',
                // Kashier
                'kashier_merchant_id' => $settings['kashier_merchant_id'] ?? '',
                'kashier_api_key' => $settings['kashier_api_key'] ?? '',
                'kashier_secret_key' => $settings['kashier_secret_key'] ?? '',
                'kashier_mode' => $settings['kashier_mode'] ?? 'test',
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'active_gateway' => 'required|string|in:paymob,kashier,test',
            // Paymob
            'paymob_api_key' => 'nullable|string',
            'paymob_secret_key' => 'nullable|string',
            'paymob_public_key' => 'nullable|string',
            'paymob_card_integration_id' => 'nullable|string',
            'paymob_wallet_integration_id' => 'nullable|string',
            'paymob_iframe_id' => 'nullable|string',
            'paymob_mode' => 'required|string|in:test,live',
            // Kashier
            'kashier_merchant_id' => 'nullable|string',
            'kashier_api_key' => 'nullable|string',
            'kashier_secret_key' => 'nullable|string',
            'kashier_mode' => 'required|string|in:test,live',
        ]);

        PlatformSetting::setMany($validated);

        return back()->with('success', 'تم حفظ إعدادات بوابات الدفع الإلكتروني بنجاح!');
    }
}
