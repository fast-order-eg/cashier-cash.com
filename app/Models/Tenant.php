<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'custom_domain',
        'logo',
        'phone',
        'email',
        'address',
        'owner_id',
        'subscription_status',
        'trial_ends_at',
        'subscription_ends_at',
        'is_active',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'trial_ends_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($tenant) {
            if (empty($tenant->uuid)) {
                $tenant->uuid = (string) Str::uuid();
            }
            if (empty($tenant->settings)) {
                $tenant->settings = [
                    'currency' => 'ج.م',
                    'tax_rate' => 14,
                    'tax_enabled' => false,
                    'tax_number' => '',
                    'receipt_header' => 'أهلاً بكم - نسعد بخدمتكم',
                    'receipt_footer' => 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوم',
                    'allow_negative_stock' => true,
                ];
            }
        });

        static::created(function ($tenant) {
            // إنشاء المخزن الرئيسي للمحل تلقائياً
            $tenant->warehouses()->create([
                'name' => 'المخزن الرئيسي',
                'type' => 'main',
                'is_active' => true,
            ]);

            // إضافة أقسام افتراضية
            $defaultCategories = [
                ['name' => 'عام', 'color' => '#3B82F6'],
                ['name' => 'مشروبات ومأكولات', 'color' => '#10B981'],
                ['name' => 'منظفات وعناية', 'color' => '#F59E0B'],
            ];

            foreach ($defaultCategories as $cat) {
                $tenant->categories()->create($cat);
            }

            // إضافة أقسام مصروفات افتراضية
            $defaultExpenseCategories = ['إيجار', 'كهرباء ومياه', 'رواتب', 'بنزين وكارتات سيارات', 'صيانة', 'بوفيه وضيافة'];
            foreach ($defaultExpenseCategories as $expCat) {
                $tenant->expenseCategories()->create(['name' => $expCat]);
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function mainWarehouse(): HasOne
    {
        return $this->hasOne(Warehouse::class)->where('type', 'main');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function currentSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function expenseCategories(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class);
    }

    public function isSubscriptionExpired(): bool
    {
        if ($this->subscription_status === 'trial') {
            return $this->trial_ends_at && $this->trial_ends_at->isPast();
        }

        if ($this->subscription_ends_at) {
            return $this->subscription_ends_at->isPast();
        }

        return false;
    }

    public function maxAllowedEmployees(): int
    {
        if ($this->subscription_status === 'trial' || $this->isSubscriptionExpired()) {
            return 2; // التجربة المجانية بحد أقصى 2 موظف فقط
        }

        $sub = $this->currentSubscription;
        if (!$sub || !$sub->plan) {
            return 2; // الحد الافتراضي في حال عدم وجود باقة
        }

        return (int) ($sub->plan->max_employees + $sub->extra_employees_count);
    }

    public function canAddEmployee(): bool
    {
        $currentCount = $this->users()->count();
        return $currentCount < $this->maxAllowedEmployees();
    }

    public function getSubdomainAttribute(): string
    {
        return $this->slug;
    }

    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where($field ?? 'id', $value)
            ->orWhere('slug', $value)
            ->first() ?? abort(404, 'المتجر غير موجود');
    }
}
