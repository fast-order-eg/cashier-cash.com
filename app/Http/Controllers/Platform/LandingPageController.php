<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingPageController extends Controller
{
    public function index(): Response
    {
        $plans = SubscriptionPlan::where('is_active', true)->get();

        return Inertia::render('Platform/Landing', [
            'plans' => $plans,
        ]);
    }
}
