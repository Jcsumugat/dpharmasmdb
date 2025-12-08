<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\POSTransaction;
use App\Models\Prescription;
use Carbon\Carbon;
use MongoDB\BSON\UTCDateTime;

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
                'total_customers' => User::where('role', 'customer')->count(),
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
                'total' => User::where('role', 'customer')->count(),
                'new' => User::where('role', 'customer')
                    ->whereBetween('created_at', $dateRange)
                    ->count(),
                'active' => User::where('role', 'customer')
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
        try {
            $period = request('period', 'today');
            $dateRange = $this->getDateRange($period);
            $previousDateRange = $this->getPreviousDateRange($period);

            return response()->json([
                'success' => true,
                'overview' => [
                    'total_revenue' => [
                        'value' => $this->getTotalRevenue($dateRange),
                        'change' => $this->getRevenueChange($dateRange, $previousDateRange),
                    ],
                    'total_orders' => [
                        'value' => $this->getTotalOrders($dateRange),
                        'change' => $this->getOrdersChange($dateRange, $previousDateRange),
                    ],
                    'total_customers' => User::where('role', 'customer')->count(),
                    'pending_prescriptions' => Prescription::where('status', 'pending')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activity
     */
    public function getRecentActivity()
    {
        try {
            $recentOrders = Order::with('customer')
                ->latest()
                ->take(5)
                ->get();

            $recentPrescriptions = Prescription::with('customer')
                ->latest()
                ->take(5)
                ->get();

            return response()->json([
                'success' => true,
                'recent_orders' => $recentOrders,
                'recent_prescriptions' => $recentPrescriptions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching recent activity: ' . $e->getMessage()
            ], 500);
        }
    }

    // Private helper methods
    private function getDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'week':
                $start = $now->copy()->startOfWeek();
                $end = $now->copy()->endOfWeek();
                break;
            case 'month':
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                break;
            case 'year':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->endOfYear();
                break;
            default:
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
        }

        // Convert to MongoDB UTCDateTime
        return [
            new UTCDateTime($start->timestamp * 1000),
            new UTCDateTime($end->timestamp * 1000)
        ];
    }

    private function getPreviousDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                $start = $now->copy()->subDay()->startOfDay();
                $end = $now->copy()->subDay()->endOfDay();
                break;
            case 'week':
                $start = $now->copy()->subWeek()->startOfWeek();
                $end = $now->copy()->subWeek()->endOfWeek();
                break;
            case 'month':
                $start = $now->copy()->subMonth()->startOfMonth();
                $end = $now->copy()->subMonth()->endOfMonth();
                break;
            case 'year':
                $start = $now->copy()->subYear()->startOfYear();
                $end = $now->copy()->subYear()->endOfYear();
                break;
            default:
                $start = $now->copy()->subDay()->startOfDay();
                $end = $now->copy()->subDay()->endOfDay();
        }

        // Convert to MongoDB UTCDateTime
        return [
            new UTCDateTime($start->timestamp * 1000),
            new UTCDateTime($end->timestamp * 1000)
        ];
    }

    private function getTotalRevenue($dateRange)
    {
        $posRevenue = POSTransaction::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');

        $orderRevenue = Order::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');

        return (float) ($posRevenue + $orderRevenue);
    }

    private function getOnlineRevenue($dateRange)
    {
        return (float) Order::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');
    }

    private function getPOSRevenue($dateRange)
    {
        return (float) POSTransaction::whereBetween('created_at', $dateRange)
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
