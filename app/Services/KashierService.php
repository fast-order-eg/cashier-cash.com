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

        $this->baseUrl = 'https://payments.kashier.io';
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
     * تنسيق المبلغ بصيغة قياسية متطابقة مع كاشير
     */
    protected function formatAmount(float|int|string $amount): string
    {
        $floatVal = (float) $amount;
        if (fmod($floatVal, 1.0) == 0.0) {
            return (string) (int) round($floatVal);
        }

        return number_format($floatVal, 2, '.', '');
    }

    /**
     * حساب الـ Hash المطلوب لصفحة الدفع المباشر لـ Kashier (يُوقّع باستخدام Payment API Key)
     */
    public function generateHash(string $orderId, float|int|string $amount, string $currency = 'EGP', ?string $customerReference = null): string
    {
        $formattedAmount = $this->formatAmount($amount);
        $path = "/?payment={$this->merchantId}.{$orderId}.{$formattedAmount}.{$currency}";
        if (!empty($customerReference)) {
            $path .= ".{$customerReference}";
        }

        return hash_hmac('sha256', $path, $this->apiKey);
    }

    public function getWebhookUrl(): string
    {
        $appUrl = config('app.url', 'https://cashier-cash.com');
        $parsed = parse_url($appUrl);
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? 'cashier-cash.com';

        if (str_starts_with($host, 'app.')) {
            $host = substr($host, 4);
        }

        $port = isset($parsed['port']) && !in_array($parsed['port'], [80, 443]) ? ':' . $parsed['port'] : '';

        return "{$scheme}://{$host}{$port}/webhook/kashier";
    }

    /**
     * إنشاء رابط صفحة الدفع المباشر لـ Kashier (احتياطي في حال تعذر إنشاء جلسة API v3)
     */
    public function getCheckoutUrl(
        string $orderId,
        float|int|string $amount,
        string $callbackUrl,
        string $currency = 'EGP',
        string $display = 'ar',
        ?string $customerReference = null
    ): string {
        $formattedAmount = $this->formatAmount($amount);
        $hash = $this->generateHash($orderId, $formattedAmount, $currency, $customerReference);

        $params = [
            'merchantId'       => $this->merchantId,
            'orderId'          => $orderId,
            'amount'           => $formattedAmount,
            'currency'         => $currency,
            'hash'             => $hash,
            'merchantRedirect' => $callbackUrl,
            'serverWebhook'    => $this->getWebhookUrl(),
            'mode'             => $this->mode,
            'display'          => $display,
            'allowedMethods'   => 'card,wallet',
            'brandColor'       => '#4F46E5',
        ];

        if (!empty($customerReference)) {
            $params['customerReference'] = $customerReference;
        }

        return $this->baseUrl . '/?' . http_build_query($params);
    }

    /**
     * إنشاء جلسة دفع رسمية عبر واجهة كاشير الحديثة (API v3 Sessions)
     */
    public function createPaymentSession(
        string $orderId,
        float|int|string $amount,
        string $callbackUrl,
        string $email = 'customer@cashier-cash.com',
        string $currency = 'EGP',
        ?string $customerReference = null
    ): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'بيانات بوابة الدفع غير مكتملة في إعدادات المنصة.',
            ];
        }

        $endpoint = $this->getApiBaseUrl() . '/v3/payment/sessions';
        $reference = $customerReference ?: ('order-' . $orderId);
        $payload = [
            'amount'           => number_format((float) $amount, 2, '.', ''),
            'currency'         => $currency,
            'order'            => $orderId,
            'merchantId'       => $this->merchantId,
            'merchantRedirect' => $callbackUrl,
            'serverWebhook'    => $this->getWebhookUrl(),
            'display'          => 'ar',
            'type'             => 'one-time',
            'allowedMethods'   => 'card,wallet',
            'customer'         => [
                'email'     => $email,
                'reference' => $reference,
            ],
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->secretKey,
                'api-key'       => $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(25)->post($endpoint, $payload);

            $data = $response->json() ?? [];
            $sessionUrl = $data['sessionUrl'] ?? null;
            $sessionId = $data['_id'] ?? null;

            // في كاشير API v3 قد ترجع sessionUrl بنجاح (200) أو حتى مع 400 إذا كانت هناك جلسة مفتوحة لنفس الطلب
            if (!empty($sessionUrl)) {
                return [
                    'success'      => true,
                    'redirect_url' => $sessionUrl,
                    'session_id'   => $sessionId,
                ];
            }

            Log::warning('Kashier API v3 Session creation returned error, falling back to Hosted Checkout URL', [
                'status'   => $response->status(),
                'response' => $response->body(),
                'order'    => $orderId,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Kashier API v3 Session exception: ' . $e->getMessage() . ', falling back to Hosted Checkout URL', [
                'order' => $orderId,
            ]);
        }

        // Fallback to Hosted Checkout (with valid API Key HMAC signature)
        return [
            'success'      => true,
            'redirect_url' => $this->getCheckoutUrl($orderId, $amount, $callbackUrl, $currency),
            'session_id'   => null,
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
            $val = isset($params[$field]) && $params[$field] !== '' && $params[$field] !== null && is_scalar($params[$field])
                ? (string) $params[$field]
                : 'null';
            $dataParts[] = "{$field}={$val}";
        }

        $message = implode('&', $dataParts);
        $cleanSig = strtolower(trim($signature));

        $sigApi = strtolower(hash_hmac('sha256', $message, $this->apiKey));
        $sigSec = strtolower(hash_hmac('sha256', $message, $this->secretKey));

        return hash_equals($sigApi, $cleanSig) || hash_equals($sigSec, $cleanSig);
    }

    /**
     * التحقق من توقيع الـ Webhook الوارد من Kashier بأمان ضد جميع صيغ API v2 و v3
     */
    public function validateWebhookSignature(array $data, string $signature, ?string $rawBody = null): bool
    {
        $cleanSig = strtolower(trim($signature));
        if (empty($cleanSig)) {
            return false;
        }

        // 1. صيغة الـ 10 حقول القياسية
        if ($this->verifySignature($data, $cleanSig)) {
            return true;
        }

        // 2. صيغة signatureKeys الرسمية في Kashier Webhook v3
        if (!empty($data['signatureKeys']) && is_array($data['signatureKeys'])) {
            $keys = $data['signatureKeys'];
            sort($keys);
            $parts = [];
            foreach ($keys as $k) {
                if (isset($data[$k]) && is_scalar($data[$k])) {
                    $parts[] = $k . '=' . $data[$k];
                }
            }
            $qs = implode('&', $parts);
            $sigApi = strtolower(hash_hmac('sha256', $qs, $this->apiKey));
            $sigSec = strtolower(hash_hmac('sha256', $qs, $this->secretKey));
            if (hash_equals($sigApi, $cleanSig) || hash_equals($sigSec, $cleanSig)) {
                return true;
            }
        }

        // 3. صيغة الحقول النصية المرتبة أبجدياً (مع تجاهل المصفوفات لتجنب Array to string conversion)
        $signatureKeys = [];
        foreach ($data as $key => $val) {
            if ($key !== 'signature' && $key !== 'mode' && is_scalar($val)) {
                $signatureKeys[$key] = $val;
            }
        }
        ksort($signatureKeys);

        $queryString = '';
        foreach ($signatureKeys as $key => $value) {
            $queryString .= '&' . $key . '=' . $value;
        }
        $queryString = ltrim($queryString, '&');

        $expectedApi = strtolower(hash_hmac('sha256', $queryString, $this->apiKey));
        $expectedSec = strtolower(hash_hmac('sha256', $queryString, $this->secretKey));
        if (hash_equals($expectedApi, $cleanSig) || hash_equals($expectedSec, $cleanSig)) {
            return true;
        }

        // 4. توقيع الـ Raw Body بـ Secret Key أو API Key
        if (!empty($rawBody)) {
            $rawSec = strtolower(hash_hmac('sha256', $rawBody, $this->secretKey));
            $rawApi = strtolower(hash_hmac('sha256', $rawBody, $this->apiKey));
            if (hash_equals($rawSec, $cleanSig) || hash_equals($rawApi, $cleanSig)) {
                return true;
            }
        }

        return false;
    }

    public function getMerchantId(): string
    {
        return $this->merchantId;
    }

    public function getApiKey(): string
    {
        return $this->apiKey;
    }

    public function getSecretKey(): string
    {
        return $this->secretKey;
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
