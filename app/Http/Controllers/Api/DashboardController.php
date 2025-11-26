<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\PosTransaction;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard
     */
    public function index()
    {
        // Get dashboard statistics
        $stats = [
            'total_products' => Product::count(),
            'low_stock_products' => Product::where('stock_quantity', '<=', function($query) {
                return $query->select('reorder_level');
            })->count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'total_customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
            'today_sales' => PosTransaction::whereDate('created_at', today())
                ->where('status', 'completed')
                ->sum('total_amount'),
            'monthly_sales' => PosTransaction::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->where('status', 'completed')
                ->sum('total_amount'),
        ];

        // Get recent orders
        $recent_orders = Order::with('customer:_id,name,email')
            ->latest()
            ->take(5)
            ->get();

        // Get low stock products
        $low_stock_products = Product::whereRaw('stock_quantity <= reorder_level')
            ->orderBy('stock_quantity', 'asc')
            ->take(10)
            ->get(['product_name', 'stock_quantity', 'reorder_level']);

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recent_orders' => $recent_orders,
            'low_stock_products' => $low_stock_products,
        ]);
    }
}
