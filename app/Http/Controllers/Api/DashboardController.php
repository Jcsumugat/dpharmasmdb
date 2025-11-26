<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Prescription;
use App\Models\POSTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for admin
     */
    public function getStats(Request $request)
    {
        try {
            $period = $request->input('period', 'today'); // today, week, month, year

            $stats = [
                'overview' => $this->getOverviewStats($period),
                'revenue' => $this->getRevenueStats($period),
                'orders' => $this->getOrderStats($period),
                'products' => $this->getProductStats(),
                'customers' => $this->getCustomerStats($period),
                'prescriptions' => $this->getPrescriptionStats($period),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activity for dashboard
     */
    public function getRecentActivity(Request $request)
    {
        try {
            $limit = $request->input('limit', 10);

            $recentOrders = Order::with('user:_id,name,email')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->_id,
                        'type' => 'order',
                        'customer' => $order->user->name ?? 'Unknown',
                        'status' => $order->status,
                        'amount' => $order->total_amount,
                        'created_at' => $order->created_at,
                    ];
                });

            $recentPrescriptions = Prescription::with('user:_id,name,email')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($prescription) {
                    return [
                        'id' => $prescription->_id,
                        'type' => 'prescription',
                        'customer' => $prescription->user->name ?? 'Unknown',
                        'status' => $prescription->status,
                        'created_at' => $prescription->created_at,
                    ];
                });

            // Merge and sort by created_at
            $activities = $recentOrders->concat($recentPrescriptions)
                ->sortByDesc('created_at')
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'data' => $activities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent activity',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get overview statistics
     */
    private function getOverviewStats($period)
    {
        $dateRange = $this->getDateRange($period);

        $totalRevenue = Order::whereBetween('created_at', $dateRange)
            ->whereIn('status', ['completed', 'delivered'])
            ->sum('total_amount');

        $totalOrders = Order::whereBetween('created_at', $dateRange)->count();

        $totalCustomers = User::where('role', User::ROLE_CUSTOMER)
            ->whereBetween('created_at', $dateRange)
            ->count();

        $pendingPrescriptions = Prescription::where('status', 'pending')
            ->whereBetween('created_at', $dateRange)
            ->count();

        // Calculate percentage changes (compare with previous period)
        $previousRange = $this->getPreviousDateRange($period);

        $previousRevenue = Order::whereBetween('created_at', $previousRange)
            ->whereIn('status', ['completed', 'delivered'])
            ->sum('total_amount');

        $previousOrders = Order::whereBetween('created_at', $previousRange)->count();

        return [
            'total_revenue' => [
                'value' => $totalRevenue,
                'change' => $this->calculatePercentageChange($totalRevenue, $previousRevenue)
            ],
            'total_orders' => [
                'value' => $totalOrders,
                'change' => $this->calculatePercentageChange($totalOrders, $previousOrders)
            ],
            'total_customers' => $totalCustomers,
            'pending_prescriptions' => $pendingPrescriptions,
        ];
    }

    /**
     * Get revenue statistics
     */
    private function getRevenueStats($period)
    {
        $dateRange = $this->getDateRange($period);

        $onlineRevenue = Order::whereBetween('created_at', $dateRange)
            ->whereIn('status', ['completed', 'delivered'])
            ->sum('total_amount');

        $posRevenue = POSTransaction::whereBetween('created_at', $dateRange)
            ->where('status', 'completed')
            ->sum('total_amount');

        return [
            'online' => $onlineRevenue,
            'pos' => $posRevenue,
            'total' => $onlineRevenue + $posRevenue,
        ];
    }

    /**
     * Get order statistics
     */
    private function getOrderStats($period)
    {
        $dateRange = $this->getDateRange($period);

        $orders = Order::whereBetween('created_at', $dateRange)->get();

        return [
            'pending' => $orders->where('status', 'pending')->count(),
            'processing' => $orders->where('status', 'processing')->count(),
            'shipped' => $orders->where('status', 'shipped')->count(),
            'delivered' => $orders->where('status', 'delivered')->count(),
            'cancelled' => $orders->where('status', 'cancelled')->count(),
            'total' => $orders->count(),
        ];
    }

    /**
     * Get product statistics
     */
    private function getProductStats()
    {
        $totalProducts = Product::where('status', 'active')->count();

        $lowStockProducts = Product::where('status', 'active')
            ->where(function ($query) {
                $query->whereRaw('quantity <= low_stock_threshold');
            })
            ->count();

        $outOfStockProducts = Product::where('status', 'active')
            ->where('quantity', 0)
            ->count();

        $expiringSoon = Product::where('status', 'active')
            ->where('batches.expiry_date', '<=', Carbon::now()->addMonths(3))
            ->count();

        return [
            'total' => $totalProducts,
            'low_stock' => $lowStockProducts,
            'out_of_stock' => $outOfStockProducts,
            'expiring_soon' => $expiringSoon,
        ];
    }

    /**
     * Get customer statistics
     */
    private function getCustomerStats($period)
    {
        $dateRange = $this->getDateRange($period);

        $totalCustomers = User::where('role', User::ROLE_CUSTOMER)->count();

        $newCustomers = User::where('role', User::ROLE_CUSTOMER)
            ->whereBetween('created_at', $dateRange)
            ->count();

        $activeCustomers = User::where('role', User::ROLE_CUSTOMER)
            ->where('status', 'active')
            ->count();

        return [
            'total' => $totalCustomers,
            'new' => $newCustomers,
            'active' => $activeCustomers,
        ];
    }

    /**
     * Get prescription statistics
     */
    private function getPrescriptionStats($period)
    {
        $dateRange = $this->getDateRange($period);

        $prescriptions = Prescription::whereBetween('created_at', $dateRange)->get();

        return [
            'pending' => $prescriptions->where('status', 'pending')->count(),
            'verified' => $prescriptions->where('status', 'verified')->count(),
            'rejected' => $prescriptions->where('status', 'rejected')->count(),
            'total' => $prescriptions->count(),
        ];
    }

    /**
     * Get date range based on period
     */
    private function getDateRange($period)
    {
        switch ($period) {
            case 'today':
                return [Carbon::today(), Carbon::now()];
            case 'week':
                return [Carbon::now()->startOfWeek(), Carbon::now()];
            case 'month':
                return [Carbon::now()->startOfMonth(), Carbon::now()];
            case 'year':
                return [Carbon::now()->startOfYear(), Carbon::now()];
            default:
                return [Carbon::today(), Carbon::now()];
        }
    }

    /**
     * Get previous period date range
     */
    private function getPreviousDateRange($period)
    {
        switch ($period) {
            case 'today':
                return [Carbon::yesterday()->startOfDay(), Carbon::yesterday()->endOfDay()];
            case 'week':
                return [
                    Carbon::now()->subWeek()->startOfWeek(),
                    Carbon::now()->subWeek()->endOfWeek()
                ];
            case 'month':
                return [
                    Carbon::now()->subMonth()->startOfMonth(),
                    Carbon::now()->subMonth()->endOfMonth()
                ];
            case 'year':
                return [
                    Carbon::now()->subYear()->startOfYear(),
                    Carbon::now()->subYear()->endOfYear()
                ];
            default:
                return [Carbon::yesterday()->startOfDay(), Carbon::yesterday()->endOfDay()];
        }
    }

    /**
     * Calculate percentage change
     */
    private function calculatePercentageChange($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 2);
    }
}
