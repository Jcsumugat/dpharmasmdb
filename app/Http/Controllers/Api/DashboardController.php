<?php
// FILE: app/Http/Controllers/Api/DashboardController.php
// REPLACE EVERYTHING with MongoDB-compatible queries

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\PosTransaction;
use App\Models\Prescription;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard
     */
    public function index()
    {
        $period = request('period', 'today');

        // Get date ranges
        $dateRange = $this->getDateRange($period);
        $previousDateRange = $this->getPreviousDateRange($period);

        // Calculate stats
        $stats = [
            'overview' => [
                'total_revenue' => [
                    'value' => $this->getTotalRevenue($dateRange),
                    'change' => $this->getRevenueChange($dateRange, $previousDateRange),
                ],
                'total_orders' => [
                    'value' => $this->getTotalOrders($dateRange),
                    'change' => $this->getOrdersChange($dateRange, $previousDateRange),
                ],
                'total_customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'pending_prescriptions' => Prescription::where('status', 'pending')->count(),
            ],
            'revenue' => [
                'online' => $this->getOnlineRevenue($dateRange),
                'pos' => $this->getPOSRevenue($dateRange),
                'total' => $this->getTotalRevenue($dateRange),
            ],
            'orders' => [
                'pending' => Order::where('status', 'pending')->count(),
                'processing' => Order::where('status', 'approved')->count(),
                'shipped' => 0,
                'delivered' => Order::where('status', 'completed')->count(),
                'cancelled' => Order::where('status', 'cancelled')->count(),
                'total' => Order::count(),
            ],
            'products' => [
                'total' => Product::count(),
                'low_stock' => $this->getLowStockCount(),
                'out_of_stock' => Product::where('stock_quantity', 0)->count(),
                'expiring_soon' => $this->getExpiringSoonCount(),
            ],
            'customers' => [
                'total' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'new' => User::where('role', User::ROLE_CUSTOMER)
                    ->whereBetween('created_at', $dateRange)
                    ->count(),
                'active' => User::where('role', User::ROLE_CUSTOMER)
                    ->where('status', 'active')
                    ->count(),
            ],
            'prescriptions' => [
                'pending' => Prescription::where('status', 'pending')->count(),
                'verified' => Prescription::where('status', 'approved')->count(),
                'rejected' => Prescription::where('status', 'declined')->count(),
                'total' => Prescription::count(),
            ],
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
        ]);
    }

    /**
     * Get stats via API (for AJAX calls)
     */
    public function getStats()
    {
        $period = request('period', 'today');
        $dateRange = $this->getDateRange($period);
        $previousDateRange = $this->getPreviousDateRange($period);

        return response()->json([
            'overview' => [
                'total_revenue' => [
                    'value' => $this->getTotalRevenue($dateRange),
                    'change' => $this->getRevenueChange($dateRange, $previousDateRange),
                ],
                'total_orders' => [
                    'value' => $this->getTotalOrders($dateRange),
                    'change' => $this->getOrdersChange($dateRange, $previousDateRange),
                ],
                'total_customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'pending_prescriptions' => Prescription::where('status', 'pending')->count(),
            ],
        ]);
    }

    /**
     * Get recent activity
     */
    public function getRecentActivity()
    {
        $recentOrders = Order::with('customer')
            ->latest()
            ->take(5)
            ->get();

        $recentPrescriptions = Prescription::with('customer')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'recent_orders' => $recentOrders,
            'recent_prescriptions' => $recentPrescriptions,
        ]);
    }

    // Private helper methods
    private function getDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            case 'week':
                return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'month':
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
            case 'year':
                return [$now->copy()->startOfYear(), $now->copy()->endOfYear()];
            default:
                return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
        }
    }

    private function getPreviousDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                return [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()];
            case 'week':
                return [$now->copy()->subWeek()->startOfWeek(), $now->copy()->subWeek()->endOfWeek()];
            case 'month':
                return [$now->copy()->subMonth()->startOfMonth(), $now->copy()->subMonth()->endOfMonth()];
            case 'year':
                return [$now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear()];
            default:
                return [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()];
        }
    }

    private function getTotalRevenue($dateRange)
    {
        $posRevenue = PosTransaction::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');

        $orderRevenue = Order::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');

        return $posRevenue + $orderRevenue;
    }

    private function getOnlineRevenue($dateRange)
    {
        return Order::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');
    }

    private function getPOSRevenue($dateRange)
    {
        return PosTransaction::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');
    }

    private function getTotalOrders($dateRange)
    {
        return Order::whereBetween('created_at', $dateRange)->count();
    }

    private function getRevenueChange($currentRange, $previousRange)
    {
        $current = $this->getTotalRevenue($currentRange);
        $previous = $this->getTotalRevenue($previousRange);

        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return (($current - $previous) / $previous) * 100;
    }

    private function getOrdersChange($currentRange, $previousRange)
    {
        $current = $this->getTotalOrders($currentRange);
        $previous = $this->getTotalOrders($previousRange);

        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return (($current - $previous) / $previous) * 100;
    }

    /**
     * MongoDB-compatible low stock count
     * Can't use whereRaw with MongoDB, need to iterate
     */
    private function getLowStockCount()
    {
        $count = 0;
        $products = Product::where('stock_quantity', '>', 0)->get();

        foreach ($products as $product) {
            if ($product->stock_quantity <= $product->reorder_level) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * MongoDB-compatible expiring soon count
     */
    private function getExpiringSoonCount()
    {
        $count = 0;
        $thirtyDaysFromNow = Carbon::now()->addDays(30);

        $products = Product::all();

        foreach ($products as $product) {
            if (!isset($product->batches) || !is_array($product->batches)) {
                continue;
            }

            foreach ($product->batches as $batch) {
                if (!isset($batch['expiration_date']) || !isset($batch['quantity_remaining'])) {
                    continue;
                }

                try {
                    $expiryDate = Carbon::parse($batch['expiration_date']);

                    if ($expiryDate->lte($thirtyDaysFromNow) &&
                        $expiryDate->gt(Carbon::now()) &&
                        $batch['quantity_remaining'] > 0) {
                        $count++;
                        break; // Count product once even if multiple batches are expiring
                    }
                } catch (\Exception $e) {
                    // Skip invalid dates
                    continue;
                }
            }
        }

        return $count;
    }
}
