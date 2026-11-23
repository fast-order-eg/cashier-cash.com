<?php

use App\Models\PlatformSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        PlatformSetting::setMany([
            'active_gateway' => 'kashier',
            'kashier_merchant_id' => 'MID-52019-895',
            'kashier_api_key' => '0b01aadf-0df2-4d90-864c-913dc3462b1c',
            'kashier_secret_key' => '20b46d7dd22d75e195c8d0f0f6ed6e41$b47fdd473e076b8e035662ea2fd217bf96c7196524de12cf5c1dbfebd85ef6276888f3a833443645a0a29441f243590e',
            'kashier_mode' => 'live',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
