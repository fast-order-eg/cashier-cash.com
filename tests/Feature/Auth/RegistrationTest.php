<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $plan = \App\Models\SubscriptionPlan::create([
            'name' => 'خطة اختبار',
            'slug' => 'test-starter',
            'description' => 'وصف',
            'price_monthly' => 100,
            'price_yearly' => 1000,
            'max_employees' => 2,
            'extra_employee_price' => 20,
            'is_active' => true,
        ]);

        $response = $this->post('/register', [
            'store_name' => 'سوبرماركت النور',
            'slug' => 'alnoor',
            'owner_name' => 'محمود رضوان',
            'email' => 'owner@alnoor.com',
            'phone' => '01012345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
            'extra_employees' => 0,
        ]);

        $response->assertRedirect();
        $this->assertStringContainsString('alnoor.', $response->getTargetUrl());
        $this->assertStringContainsString('/auth/sso-entry?token=', $response->getTargetUrl());
        $this->assertDatabaseHas('tenants', [
            'slug' => 'alnoor',
            'name' => 'سوبرماركت النور',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'owner@alnoor.com',
            'role' => 'admin',
        ]);
    }
}
