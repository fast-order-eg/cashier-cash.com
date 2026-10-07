<?php

namespace App\Services;

use App\Models\PlatformSetting;

class KashierService
{
    protected string $merchantId;
    protected string $apiKey;
    protected string $secretKey;
    protected string $mode;
    protected string $baseUrl;

    public function __construct()
    {
        $this->merchantId = (string) PlatformSetting::get('kashier_merchant_id', config('services.kashier.merchant_id', env('KASHIER_MERCHANT_ID', 'MID-DEMO-001')));
        $this->apiKey = (string) PlatformSetting::get('kashier_api_key', config('services.kashier.api_key', env('KASHIER_API_KEY', 'test_api_key')));
        $this->secretKey = (string) PlatformSetting::get('kashier_secret_key', config('services.kashier.secret_key', env('KASHIER_SECRET_KEY', 'test_secret_key')));
        $this->mode = (string) PlatformSetting::get('kashier_mode', config('services.kashier.mode', env('KASHIER_MODE', 'test')));
        $this->baseUrl = $this->mode === 'live' 
            ? 'https://checkout.kashier.io' 
            : 'https://test-checkout.kashier.io';
    }

    /**
     * حساب الـ Hash المطلوب لبوابة Kashier
     */
    public function generateHash(string $orderId, float $amount, string $currency = 'EGP'): string
    {
        $path = "/?payment={$this->merchantId}.{$orderId}.{$amount}.{$currency}";
        return hash_hmac('sha256', $path, $this->secretKey);
    }

    /**
     * التحقق من توقيع الـ Webhook الوارد من Kashier
     */
    public function validateWebhookSignature(array $data, string $signature): bool
    {
        $signatureKeys = [];
        foreach ($data as $key => $val) {
            if ($key !== 'signature' && $key !== 'mode') {
                $signatureKeys[$key] = $val;
            }
        }
        ksort($signatureKeys);
        
        $queryString = '';
        foreach ($signatureKeys as $key => $value) {
            $queryString .= '&' . $key . '=' . $value;
        }
        $queryString = ltrim($queryString, '&');
        
        $expectedSignature = hash_hmac('sha256', $queryString, $this->apiKey);
        return hash_equals($expectedSignature, $signature);
    }

    public function getMerchantId(): string
    {
        return $this->merchantId;
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }
}
