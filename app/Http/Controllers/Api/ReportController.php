<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Prescription;
use App\Models\POSTransaction;
use App\Models\User;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Carbon\Carbon;
use MongoDB\BSON\UTCDateTime;


class ReportController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function dashboard(Request $request)
    {
        $period = $request->get('period', 'today'); // today, week, month, year
        $dateRange = $this->getDateRange($period);

        $stats = [
            'sales' => $this->getSalesStats($dateRange),
            'orders' => $this->getOrdersStats($dateRange),
            'inventory' => $this->getInventoryStats(),
            'customers' => $this->getCustomersStats($dateRange),
            'revenue' => $this->getRevenueStats($dateRange),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'period' => $period
        ]);
    }

    /**
     * Get sales report
     */
    public function sales(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'group_by' => 'nullable|in:day,week,month',
        ]);

        $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
        $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);

        // POS Transactions
        $posTransactions = POSTransaction::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        // Orders
        $orders = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $totalRevenue = $posTransactions->sum('total_amount') + $orders->sum('total_amount');
        $totalTransactions = $posTransactions->count() + $orders->count();

        $salesByDate = $this->groupSalesByDate(
            $posTransactions,
            $orders,
            $validated['group_by'] ?? 'day'
        );

        return response()->json([
            'success' => true,
            'report' => [
                'total_revenue' => $totalRevenue,
                'total_transactions' => $totalTransactions,
                'average_transaction' => $totalTransactions > 0 ? $totalRevenue / $totalTransactions : 0,
                'pos_revenue' => $posTransactions->sum('total_amount'),
                'orders_revenue' => $orders->sum('total_amount'),
                'sales_by_date' => $salesByDate,
            ]
        ]);
    }

    /**
     * Get inventory report
     */
    public function inventory(Request $request)
    {
        $type = $request->get('type', 'all'); // all, low_stock, expiring, out_of_stock

        $query = Product::query();

        switch ($type) {
            case 'low_stock':
                $query->whereRaw('this.stock_quantity <= this.reorder_level');
                break;
            case 'out_of_stock':
                $query->where('stock_quantity', '<=', 0);
                break;
            case 'expiring':
                // Products with batches expiring in next 30 days
                $thirtyDaysFromNow = new UTCDateTime(Carbon::now()->addDays(30)->timestamp * 1000);
                $query->where('batches.expiration_date', '<=', $thirtyDaysFromNow)
                      ->where('batches.expiration_date', '>', new UTCDateTime(Carbon::now()->timestamp * 1000));
                break;
        }

        $products = $query->with(['category', 'supplier'])->get();

        $summary = [
            'total_products' => Product::count(),
            'low_stock_count' => Product::whereRaw('this.stock_quantity <= this.reorder_level')->count(),
            'out_of_stock_count' => Product::where('stock_quantity', '<=', 0)->count(),
            'total_inventory_value' => $this->calculateInventoryValue(),
        ];

        return response()->json([
            'success' => true,
            'report' => [
                'products' => $products,
                'summary' => $summary
            ]
        ]);
    }

    /**
     * Get top selling products
     */
    public function topProducts(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $limit = $validated['limit'] ?? 10;
        $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
        $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);

        // Get stock movements for sales
        $movements = StockMovement::whereIn('type', ['sale', 'pos_transaction'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        // Group by product and sum quantities
        $productSales = $movements->groupBy('product_id')->map(function ($group) {
            return [
                'product_id' => $group->first()->product_id,
                'total_quantity' => abs($group->sum('quantity')),
                'transaction_count' => $group->count()
            ];
        })->sortByDesc('total_quantity')->take($limit)->values();

        // Enrich with product data
        $products = [];
        foreach ($productSales as $sale) {
            $product = Product::find($sale['product_id']);
            if ($product) {
                $products[] = [
                    'product' => $product,
                    'total_quantity' => $sale['total_quantity'],
                    'transaction_count' => $sale['transaction_count']
                ];
            }
        }

        return response()->json([
            'success' => true,
            'report' => $products
        ]);
    }

    /**
     * Get expiring products report
     */
    public function expiringProducts(Request $request)
    {
        $days = $request->get('days', 30);
        $futureDate = Carbon::now()->addDays($days);

        $products = Product::where('batches', 'exists', true)
            ->get()
            ->filter(function ($product) use ($futureDate) {
                return collect($product->batches)->some(function ($batch) use ($futureDate) {
                    return $batch['quantity_remaining'] > 0
                        && isset($batch['expiration_date'])
                        && Carbon::parse($batch['expiration_date'])->lte($futureDate)
                        && Carbon::parse($batch['expiration_date'])->gte(Carbon::now());
                });
            })
            ->map(function ($product) use ($futureDate) {
                $expiringBatches = collect($product->batches)->filter(function ($batch) use ($futureDate) {
                    return $batch['quantity_remaining'] > 0
                        && isset($batch['expiration_date'])
                        && Carbon::parse($batch['expiration_date'])->lte($futureDate)
                        && Carbon::parse($batch['expiration_date'])->gte(Carbon::now());
                })->values();

                $product->expiring_batches = $expiringBatches;
                return $product;
            })
            ->values();

        return response()->json([
            'success' => true,
            'report' => [
                'products' => $products,
                'total_expiring' => $products->count(),
                'days_threshold' => $days
            ]
        ]);
    }

    /**
     * Get customer analytics
     */
    public function customers(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $stats = [
            'total_customers' => User::where('role', 'customer')->count(),
            'active_customers' => User::where('role', 'customer')->where('status', 'active')->count(),
            'new_customers' => $this->getNewCustomersCount($validated),
            'top_customers' => $this->getTopCustomers($validated),
        ];

        return response()->json([
            'success' => true,
            'report' => $stats
        ]);
    }

    /**
     * Get prescription analytics
     */
    public function prescriptions(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = Prescription::query();

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
            $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        $prescriptions = $query->get();

        $stats = [
            'total' => $prescriptions->count(),
            'pending' => $prescriptions->where('status', 'pending')->count(),
            'approved' => $prescriptions->where('status', 'approved')->count(),
            'declined' => $prescriptions->where('status', 'declined')->count(),
            'completed' => $prescriptions->where('status', 'completed')->count(),
            'by_type' => [
                'prescription' => $prescriptions->where('order_type', 'prescription')->count(),
                'online_order' => $prescriptions->where('order_type', 'online_order')->count(),
            ]
        ];

        return response()->json([
            'success' => true,
            'report' => $stats
        ]);
    }

    // Helper methods

    private function getDateRange($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                return [
                    new UTCDateTime($now->startOfDay()->timestamp * 1000),
                    new UTCDateTime($now->endOfDay()->timestamp * 1000)
                ];
            case 'week':
                return [
                    new UTCDateTime($now->startOfWeek()->timestamp * 1000),
                    new UTCDateTime($now->endOfWeek()->timestamp * 1000)
                ];
            case 'month':
                return [
                    new UTCDateTime($now->startOfMonth()->timestamp * 1000),
                    new UTCDateTime($now->endOfMonth()->timestamp * 1000)
                ];
            case 'year':
                return [
                    new UTCDateTime($now->startOfYear()->timestamp * 1000),
                    new UTCDateTime($now->endOfYear()->timestamp * 1000)
                ];
            default:
                return [
                    new UTCDateTime($now->startOfDay()->timestamp * 1000),
                    new UTCDateTime($now->endOfDay()->timestamp * 1000)
                ];
        }
    }

    private function getSalesStats($dateRange)
    {
        $posRevenue = POSTransaction::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->sum('total_amount');

        $ordersRevenue = Order::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->sum('total_amount');

        return [
            'total_revenue' => $posRevenue + $ordersRevenue,
            'pos_revenue' => $posRevenue,
            'orders_revenue' => $ordersRevenue,
            'transaction_count' => POSTransaction::whereBetween('created_at', $dateRange)->count() +
                                   Order::whereBetween('created_at', $dateRange)->count()
        ];
    }

    private function getOrdersStats($dateRange)
    {
        $orders = Order::whereBetween('created_at', $dateRange)->get();

        return [
            'total' => $orders->count(),
            'pending' => $orders->where('status', 'pending')->count(),
            'completed' => $orders->where('status', 'completed')->count(),
            'cancelled' => $orders->where('status', 'cancelled')->count(),
        ];
    }

    private function getInventoryStats()
    {
        return [
            'total_products' => Product::count(),
            'low_stock' => Product::whereRaw('this.stock_quantity <= this.reorder_level')->count(),
            'out_of_stock' => Product::where('stock_quantity', '<=', 0)->count(),
            'total_value' => $this->calculateInventoryValue(),
        ];
    }

    private function getCustomersStats($dateRange)
    {
        return [
            'total' => User::where('role', 'customer')->count(),
            'active' => User::where('role', 'customer')->where('status', 'active')->count(),
            'new' => User::where('role', 'customer')->whereBetween('created_at', $dateRange)->count(),
        ];
    }

    private function getRevenueStats($dateRange)
    {
        $posRevenue = POSTransaction::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->sum('total_amount');

        $ordersRevenue = Order::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->sum('total_amount');

        return [
            'total' => $posRevenue + $ordersRevenue,
            'pos' => $posRevenue,
            'orders' => $ordersRevenue,
        ];
    }

    private function calculateInventoryValue()
    {
        $products = Product::all();
        $totalValue = 0;

        foreach ($products as $product) {
            if (isset($product->batches) && is_array($product->batches)) {
                foreach ($product->batches as $batch) {
                    $totalValue += ($batch['quantity_remaining'] ?? 0) * ($batch['unit_cost'] ?? 0);
                }
            }
        }

        return $totalValue;
    }

    private function groupSalesByDate($posTransactions, $orders, $groupBy)
    {
        $allTransactions = collect();

        foreach ($posTransactions as $transaction) {
            $allTransactions->push([
                'date' => Carbon::parse($transaction->created_at),
                'amount' => $transaction->total_amount
            ]);
        }

        foreach ($orders as $order) {
            $allTransactions->push([
                'date' => Carbon::parse($order->created_at),
                'amount' => $order->total_amount
            ]);
        }

        $grouped = $allTransactions->groupBy(function ($item) use ($groupBy) {
            switch ($groupBy) {
                case 'week':
                    return $item['date']->format('Y-W');
                case 'month':
                    return $item['date']->format('Y-m');
                default:
                    return $item['date']->format('Y-m-d');
            }
        })->map(function ($group) {
            return [
                'total' => $group->sum('amount'),
                'count' => $group->count()
            ];
        });

        return $grouped;
    }

    private function getNewCustomersCount($validated)
    {
        $query = User::where('role', 'customer');

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
            $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        return $query->count();
    }

    private function getTopCustomers($validated)
    {
        $startDate = isset($validated['start_date'])
            ? new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000)
            : new UTCDateTime(Carbon::now()->subYear()->timestamp * 1000);

        $endDate = isset($validated['end_date'])
            ? new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000)
            : new UTCDateTime(Carbon::now()->timestamp * 1000);

        $orders = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $customerSpending = $orders->groupBy('customer_id')->map(function ($group) {
            return [
                'customer_id' => $group->first()->customer_id,
                'total_spent' => $group->sum('total_amount'),
                'order_count' => $group->count()
            ];
        })->sortByDesc('total_spent')->take(10)->values();

        $topCustomers = [];
        foreach ($customerSpending as $spending) {
            $customer = User::find($spending['customer_id']);
            if ($customer) {
                $topCustomers[] = [
                    'customer' => $customer,
                    'total_spent' => $spending['total_spent'],
                    'order_count' => $spending['order_count']
                ];
            }
        }

        return $topCustomers;
    }
}
