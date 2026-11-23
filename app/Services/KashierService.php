<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KashierService
{
    protected string $merchantId;
    protected string $apiKey;
    protected string $secretKey;
    protected string $mode;
    protected string $baseUrl;

    public function __construct(
        ?string $merchantId = null,
        ?string $apiKey = null,
        ?string $secretKey = null,
        ?string $mode = null
    ) {
        $this->merchantId = $merchantId ?: (string) (PlatformSetting::get('kashier_merchant_id', config('services.kashier.merchant_id', env('KASHIER_MERCHANT_ID', 'MID-52019-895'))) ?: 'MID-52019-895');
        $this->apiKey = $apiKey ?: (string) (PlatformSetting::get('kashier_api_key', config('services.kashier.api_key', env('KASHIER_API_KEY', '0b01aadf-0df2-4d90-864c-913dc3462b1c'))) ?: '0b01aadf-0df2-4d90-864c-913dc3462b1c');
        $this->secretKey = $secretKey ?: (string) (PlatformSetting::get('kashier_secret_key', config('services.kashier.secret_key', env('KASHIER_SECRET_KEY', '20b46d7dd22d75e195c8d0f0f6ed6e41$b47fdd473e076b8e035662ea2fd217bf96c7196524de12cf5c1dbfebd85ef6276888f3a833443645a0a29441f243590e'))) ?: '20b46d7dd22d75e195c8d0f0f6ed6e41$b47fdd473e076b8e035662ea2fd217bf96c7196524de12cf5c1dbfebd85ef6276888f3a833443645a0a29441f243590e');
        $this->mode = $mode ?: (string) (PlatformSetting::get('kashier_mode', config('services.kashier.mode', env('KASHIER_MODE', 'live'))) ?: 'live');
        
        $this->baseUrl = $this->isLiveMode() 
            ? 'https://checkout.kashier.io' 
            : 'https://test-checkout.kashier.io';
    }

    public function isConfigured(): bool
    {
        return !empty($this->merchantId) 
            && !empty($this->apiKey) 
            && !empty($this->secretKey);
    }

    public function isLiveMode(): bool
    {
        return strtolower($this->mode) === 'live';
    }

    public function getApiBaseUrl(): string
    {
        return $this->isLiveMode()
            ? 'https://api.kashier.io'
            : 'https://test-api.kashier.io';
    }

    /**
     * حساب الـ Hash المطلوب لبوابة Kashier
     */
    public function generateHash(string $orderId, float|int $amount, string $currency = 'EGP'): string
    {
        $path = "/?payment={$this->merchantId}.{$orderId}.{$amount}.{$currency}";
        return hash_hmac('sha256', $path, $this->secretKey);
    }

    /**
     * إنشاء رابط صفحة الدفع المباشر لـ Kashier
     */
    public function getCheckoutUrl(
        string $orderId, 
        float|int $amount, 
        string $callbackUrl, 
        string $currency = 'EGP', 
        string $display = 'ar'
    ): string {
        $hash = $this->generateHash($orderId, $amount, $currency);
        $encodedCallback = urlencode($callbackUrl);
        
        return "{$this->baseUrl}/?merchantId={$this->merchantId}&orderId={$orderId}&amount={$amount}&currency={$currency}&hash={$hash}&merchantRedirect={$encodedCallback}&mode={$this->mode}&display={$display}&allowedMethods=card,wallet&brandColor=%234F46E5";
    }

    /**
     * إنشاء جلسة دفع رسمية عبر واجهة كاشير الحديثة (API v3 Sessions)
     */
    public function createPaymentSession(
        string $orderId,
        float|int $amount,
        string $callbackUrl,
        string $email = 'customer@cashier-cash.com',
        string $currency = 'EGP'
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'بيانات بوابة كاشير غير مكتملة في إعدادات المنصة.',
            ];
        }

        $endpoint = $this->getApiBaseUrl() . '/v3/payment/sessions';
        $payload = [
            'amount' => number_format((float) $amount, 2, '.', ''),
            'currency' => $currency,
            'order' => $orderId,
            'merchantId' => $this->merchantId,
            'merchantRedirect' => $callbackUrl,
            'display' => 'ar',
            'type' => 'one-time',
            'allowedMethods' => 'card,wallet',
            'customer' => [
                'email' => $email,
                'reference' => 'order-' . $orderId,
            ],
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->secretKey,
                'api-key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(20)->post($endpoint, $payload);

            if ($response->successful()) {
                $data = $response->json();
                $sessionUrl = $data['sessionUrl'] ?? null;
                $sessionId = $data['_id'] ?? null;

                if (!empty($sessionUrl)) {
                    return [
                        'success' => true,
                        'redirect_url' => $sessionUrl,
                        'session_id' => $sessionId,
                    ];
                }
            }

            Log::warning('Kashier API v3 Session creation returned error, falling back to Hosted Checkout URL', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Kashier API v3 Session exception: ' . $e->getMessage() . ', falling back to Hosted Checkout URL');
        }

        // Fallback to Hosted Checkout
        return [
            'success' => true,
            'redirect_url' => $this->getCheckoutUrl($orderId, $amount, $callbackUrl, $currency),
            'session_id' => null,
        ];
    }

    /**
     * التحقق من توقيع كاشير الرسمي المكون من 10 حقول (API v3)
     */
    public function verifySignature(array $params, ?string $signature): bool
    {
        if (empty($signature)) {
            return false;
        }

        $fields = [
            'paymentStatus',
            'cardDataToken',
            'maskedCard',
            'merchantOrderId',
            'orderId',
            'cardBrand',
            'orderReference',
            'transactionId',
            'amount',
            'currency',
        ];

        $dataParts = [];
        foreach ($fields as $field) {
            $val = isset($params[$field]) && $params[$field] !== '' && $params[$field] !== null
                ? (string) $params[$field]
                : 'null';
            $dataParts[] = "{$field}={$val}";
        }

        $message = implode('&', $dataParts);
        $computedSignature = strtolower(hash_hmac('sha256', $message, $this->apiKey));

        return hash_equals($computedSignature, strtolower(trim($signature)));
    }

    /**
     * التحقق من توقيع الـ Webhook الوارد من Kashier
     */
    public function validateWebhookSignature(array $data, string $signature): bool
    {
        if ($this->verifySignature($data, $signature)) {
            return true;
        }

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

    public function getApiKey(): string
    {
        return $this->apiKey;
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
