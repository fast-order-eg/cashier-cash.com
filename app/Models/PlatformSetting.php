<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * جلب قيمة إعداد معين مع قيمة افتراضية
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || $setting->value === null) {
            return $default;
        }
        return $setting->value;
    }

    /**
     * تعيين أو تحديث قيمة إعداد
     */
    public static function set(string $key, $value): static
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]
        );
    }

    /**
     * تحديث مجموعة إعدادات دفعة واحدة
     */
    public static function setMany(array $settings): void
    {
        foreach ($settings as $key => $value) {
            static::set($key, $value);
        }
    }

    /**
     * جلب كل الإعدادات كمصفوفة مفاتيح وقيم
     */
    public static function getAll(): array
    {
        return static::pluck('value', 'key')->toArray();
    }
}
