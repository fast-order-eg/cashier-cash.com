<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymobService
{
    protected string $apiKey;
    protected string $secretKey;
    protected string $publicKey;
    protected string $cardIntegrationId;
    protected string $walletIntegrationId;
    protected string $iframeId;
    protected string $mode;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) PlatformSetting::get('paymob_api_key', config('services.paymob.api_key', env('PAYMOB_API_KEY', '')));
        $this->secretKey = (string) PlatformSetting::get('paymob_secret_key', config('services.paymob.secret_key', env('PAYMOB_SECRET_KEY', '')));
        $this->publicKey = (string) PlatformSetting::get('paymob_public_key', config('services.paymob.public_key', env('PAYMOB_PUBLIC_KEY', '')));
        $this->cardIntegrationId = (string) PlatformSetting::get('paymob_card_integration_id', config('services.paymob.card_integration_id', env('PAYMOB_CARD_INTEGRATION_ID', '')));
        $this->walletIntegrationId = (string) PlatformSetting::get('paymob_wallet_integration_id', config('services.paymob.wallet_integration_id', env('PAYMOB_WALLET_INTEGRATION_ID', '')));
        $this->iframeId = (string) PlatformSetting::get('paymob_iframe_id', config('services.paymob.iframe_id', env('PAYMOB_IFRAME_ID', '')));
        $this->mode = (string) PlatformSetting::get('paymob_mode', config('services.paymob.mode', env('PAYMOB_MODE', 'test')));
        $this->baseUrl = 'https://accept.paymob.com';
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && (!empty($this->cardIntegrationId) || !empty($this->walletIntegrationId));
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    public function getCardIntegrationId(): string
    {
        return $this->cardIntegrationId;
    }

    public function getWalletIntegrationId(): string
    {
        return $this->walletIntegrationId;
    }

    public function getIframeId(): string
    {
        return $this->iframeId;
    }

    /**
     * 1. طلب توكن المصادقة من Paymob
     */
    public function authenticate(): ?string
    {
        if (empty($this->apiKey)) {
            return null;
        }

        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/api/auth/tokens", [
                'api_key' => $this->apiKey,
            ]);

            if ($response->successful()) {
                return $response->json('token');
            }

            Log::error('Paymob Auth Failed: ' . $response->body());
            return null;
        } catch (\Throwable $e) {
            Log::error('Paymob Auth Exception: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 2. تسجيل أمر الشراء / الطلب
     */
    public function createOrder(string $authToken, float $amount, string $merchantOrderId, string $currency = 'EGP'): ?array
    {
        try {
            $amountCents = (int) round($amount * 100);

            $response = Http::timeout(15)->post("{$this->baseUrl}/api/ecommerce/orders", [
                'auth_token' => $authToken,
                'delivery_needed' => false,
                'amount_cents' => $amountCents,
                'currency' => $currency,
                'merchant_order_id' => $merchantOrderId,
                'items' => [],
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Paymob Order Creation Failed: ' . $response->body());
            return null;
        } catch (\Throwable $e) {
            Log::error('Paymob Order Exception: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 3. توليد Payment Key (سواء للبطاقات / إنستاباي أو المحافظ الإلكترونية فودافون كاش)
     */
    public function generatePaymentKey(
        string $authToken,
        int|string $orderId,
        float $amount,
        string $integrationId,
        array $billingData,
        string $currency = 'EGP'
    ): ?string {
        try {
            $amountCents = (int) round($amount * 100);

            $payload = [
                'auth_token' => $authToken,
                'amount_cents' => $amountCents,
                'expiration' => 3600,
                'order_id' => $orderId,
                'billing_data' => array_merge([
                    'first_name' => 'Store',
                    'last_name' => 'Owner',
                    'email' => 'owner@example.com',
                    'phone_number' => '+201000000000',
                    'apartment' => 'NA',
                    'floor' => 'NA',
                    'street' => 'NA',
                    'building' => 'NA',
                    'shipping_method' => 'NA',
                    'postal_code' => 'NA',
                    'city' => 'Cairo',
                    'country' => 'EG',
                    'state' => 'Cairo',
                ], $billingData),
                'currency' => $currency,
                'integration_id' => (int) $integrationId,
                'lock_order_when_paid' => true,
            ];

            $response = Http::timeout(15)->post("{$this->baseUrl}/api/acceptance/payment_keys", $payload);

            if ($response->successful()) {
                return $response->json('token');
            }

            Log::error('Paymob Payment Key Failed: ' . $response->body());
            return null;
        } catch (\Throwable $e) {
            Log::error('Paymob Payment Key Exception: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 4. طلب دفع محفظة فودافون كاش / المحافظ الإلكترونية
     */
    public function payWithWallet(string $paymentToken, string $walletNumber): ?array
    {
        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/api/acceptance/payments/pay", [
                'source' => [
                    'identifier' => $walletNumber,
                    'subtype' => 'WALLET',
                ],
                'payment_token' => $paymentToken,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Paymob Wallet Pay Failed: ' . $response->body());
            return null;
        } catch (\Throwable $e) {
            Log::error('Paymob Wallet Pay Exception: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * التحقق من توقيع HMAC القادم من Paymob Webhook
     */
    public function validateHmac(array $data, string $hmac): bool
    {
        if (empty($this->secretKey)) {
            return false;
        }

        // الحقول المطلوبة لترتيب HMAC بحسب توثيق Paymob
        $fields = [
            'amount_cents',
            'created_at',
            'currency',
            'error_occured',
            'has_parent_transaction',
            'id',
            'integration_id',
            'is_3d_secure',
            'is_auth',
            'is_capture',
            'is_refunded',
            'is_standalone_payment',
            'is_voided',
            'order.id',
            'owner',
            'pending',
            'source_data.pan',
            'source_data.sub_type',
            'source_data.type',
            'success',
        ];

        $concatenated = '';
        foreach ($fields as $field) {
            $value = data_get($data, $field);
            if (is_bool($value)) {
                $concatenated .= $value ? 'true' : 'false';
            } else {
                $concatenated .= (string) $value;
            }
        }

        $calculatedHmac = hash_hmac('sha512', $concatenated, $this->secretKey);
        return hash_equals($calculatedHmac, $hmac);
    }
}
