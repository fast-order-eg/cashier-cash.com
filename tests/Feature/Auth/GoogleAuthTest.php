<?php

namespace Tests\Feature\Auth;

use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        SubscriptionPlan::create([
            'name' => 'الباقة الأساسية',
            'slug' => 'basic',
            'price_monthly' => 199,
            'price_yearly' => 1990,
            'max_employees' => 2,
            'extra_employee_price' => 50,
            'features' => ['pos', 'offline'],
            'is_active' => true,
        ]);
    }

    public function test_google_redirect_route_works(): void
    {
        $response = $this->get('/auth/google');
        $response->assertRedirect();
        $this->assertStringContainsString('accounts.google.com', $response->getTargetUrl());
    }

    public function test_google_callback_creates_new_user_and_tenant_with_trial(): void
    {
        $fakeGoogleUser = new SocialiteUser();
        $fakeGoogleUser->id = 'google-id-12345';
        $fakeGoogleUser->name = 'أحمد التاجر';
        $fakeGoogleUser->email = 'ahmed.merchant@gmail.com';
        $fakeGoogleUser->avatar = 'https://example.com/avatar.jpg';

        $providerMock = Mockery::mock('Laravel\Socialite\Two\GoogleProvider');
        $providerMock->shouldReceive('stateless')->andReturnSelf();
        $providerMock->shouldReceive('setHttpClient')->andReturnSelf();
        $providerMock->shouldReceive('user')->andReturn($fakeGoogleUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($providerMock);

        $response = $this->get('/auth/google/callback');

        // يجب أن يتم إنشاء المستخدم
        $user = User::where('email', 'ahmed.merchant@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('google-id-12345', $user->google_id);
        $this->assertEquals('admin', $user->role);
        $this->assertNotNull($user->tenant_id);

        // يجب أن يتم إنشاء المتجر بفترة تجريبية 7 أيام
        $tenant = $user->tenant;
        $this->assertNotNull($tenant);
        $this->assertEquals('trial', $tenant->subscription_status);
        $this->assertTrue($tenant->trial_ends_at->isFuture());

        // التحويل يكون عبر SSO إلى متجره
        $response->assertRedirect();
        $this->assertStringContainsString('/auth/sso-entry?token=', $response->getTargetUrl());
    }

    public function test_google_callback_for_existing_user(): void
    {
        $tenant = Tenant::create([
            'name' => 'متجر النور',
            'slug' => 'alnoor',
            'email' => 'alnoor@gmail.com',
            'subscription_status' => 'active',
            'trial_ends_at' => now()->addDays(30),
            'subscription_ends_at' => now()->addDays(30),
            'is_active' => true,
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'محمود النور',
            'email' => 'alnoor@gmail.com',
            'role' => 'admin',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $fakeGoogleUser = new SocialiteUser();
        $fakeGoogleUser->id = 'google-id-99999';
        $fakeGoogleUser->name = 'محمود النور';
        $fakeGoogleUser->email = 'alnoor@gmail.com';
        $fakeGoogleUser->avatar = 'https://example.com/avatar2.jpg';

        $providerMock = Mockery::mock('Laravel\Socialite\Two\GoogleProvider');
        $providerMock->shouldReceive('stateless')->andReturnSelf();
        $providerMock->shouldReceive('setHttpClient')->andReturnSelf();
        $providerMock->shouldReceive('user')->andReturn($fakeGoogleUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($providerMock);

        $response = $this->get('/auth/google/callback');

        $user->refresh();
        $this->assertEquals('google-id-99999', $user->google_id);

        $response->assertRedirect();
        $this->assertStringContainsString('/auth/sso-entry?token=', $response->getTargetUrl());
    }
}
