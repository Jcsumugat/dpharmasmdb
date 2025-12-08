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
        $period = $request->get('period', 'today');
        $dateRange = $this->getDateRange($period);

        $stats = [
            'revenue' => $this->getRevenueStats($dateRange),
            'orders' => $this->getOrdersStats($dateRange),
            'inventory' => $this->getInventoryStats(),
            'customers' => $this->getCustomersStats($dateRange),
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

        try {
            $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
            $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);

            // Get completed transactions
            $posTransactions = POSTransaction::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

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
                    'total_revenue' => (float) $totalRevenue,
                    'total_transactions' => $totalTransactions,
                    'average_transaction' => $totalTransactions > 0 ? (float) ($totalRevenue / $totalTransactions) : 0,
                    'pos_revenue' => (float) $posTransactions->sum('total_amount'),
                    'orders_revenue' => (float) $orders->sum('total_amount'),
                    'pos_transactions' => $posTransactions->count(),
                    'online_orders' => $orders->count(),
                    'sales_by_date' => $salesByDate,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating sales report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory report
     */
    public function inventory(Request $request)
    {
        $type = $request->get('type', 'all');

        $query = Product::query();

        switch ($type) {
            case 'low_stock':
                $query->where(function ($q) {
                    $q->whereRaw([
                        '$expr' => [
                            '$lte' => ['$stock_quantity', '$reorder_level']
                        ]
                    ])->where('stock_quantity', '>', 0);
                });
                break;
            case 'out_of_stock':
                $query->where('stock_quantity', '<=', 0);
                break;
            case 'expiring':
                $thirtyDaysFromNow = Carbon::now()->addDays(30);
                $products = Product::all()->filter(function ($product) use ($thirtyDaysFromNow) {
                    if (!isset($product->batches) || !is_array($product->batches)) {
                        return false;
                    }
                    return collect($product->batches)->some(function ($batch) use ($thirtyDaysFromNow) {
                        return isset($batch['quantity_remaining'])
                            && $batch['quantity_remaining'] > 0
                            && isset($batch['expiration_date'])
                            && Carbon::parse($batch['expiration_date'])->lte($thirtyDaysFromNow)
                            && Carbon::parse($batch['expiration_date'])->gte(Carbon::now());
                    });
                });

                return response()->json([
                    'success' => true,
                    'report' => [
                        'products' => $products->values(),
                        'summary' => [
                            'total_products' => Product::count(),
                            'low_stock_count' => Product::where(function ($q) {
                                $q->whereRaw([
                                    '$expr' => ['$lte' => ['$stock_quantity', '$reorder_level']]
                                ])->where('stock_quantity', '>', 0);
                            })->count(),
                            'out_of_stock_count' => Product::where('stock_quantity', '<=', 0)->count(),
                            'total_inventory_value' => $this->calculateInventoryValue(),
                        ]
                    ]
                ]);
        }

        $products = $query->with(['category', 'supplier'])->get();

        $summary = [
            'total_products' => Product::count(),
            'low_stock_count' => Product::where(function ($q) {
                $q->whereRaw([
                    '$expr' => ['$lte' => ['$stock_quantity', '$reorder_level']]
                ])->where('stock_quantity', '>', 0);
            })->count(),
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

        try {
            $limit = $validated['limit'] ?? 10;
            $startDate = new UTCDateTime(Carbon::parse($validated['start_date'])->startOfDay()->timestamp * 1000);
            $endDate = new UTCDateTime(Carbon::parse($validated['end_date'])->endOfDay()->timestamp * 1000);

            // Get POS transactions
            $posTransactions = POSTransaction::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            // Get Orders
            $orders = Order::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            // Combine and aggregate product sales
            $productSales = [];

            // From POS transactions
            foreach ($posTransactions as $transaction) {
                if (isset($transaction->items) && is_array($transaction->items)) {
                    foreach ($transaction->items as $item) {
                        $productId = $item['product_id'] ?? null;
                        if ($productId) {
                            if (!isset($productSales[$productId])) {
                                $productSales[$productId] = [
                                    'product_id' => $productId,
                                    'total_quantity' => 0,
                                    'transaction_count' => 0,
                                    'total_revenue' => 0
                                ];
                            }
                            $productSales[$productId]['total_quantity'] += $item['quantity'] ?? 0;
                            $productSales[$productId]['transaction_count']++;
                            $productSales[$productId]['total_revenue'] += ($item['quantity'] ?? 0) * ($item['price'] ?? 0);
                        }
                    }
                }
            }

            // From Orders
            foreach ($orders as $order) {
                if (isset($order->items) && is_array($order->items)) {
                    foreach ($order->items as $item) {
                        $productId = $item['product_id'] ?? null;
                        if ($productId) {
                            if (!isset($productSales[$productId])) {
                                $productSales[$productId] = [
                                    'product_id' => $productId,
                                    'total_quantity' => 0,
                                    'transaction_count' => 0,
                                    'total_revenue' => 0
                                ];
                            }
                            $productSales[$productId]['total_quantity'] += $item['quantity'] ?? 0;
                            $productSales[$productId]['transaction_count']++;
                            $productSales[$productId]['total_revenue'] += ($item['quantity'] ?? 0) * ($item['price'] ?? 0);
                        }
                    }
                }
            }

            // Sort by total quantity and limit
            usort($productSales, function($a, $b) {
                return $b['total_quantity'] - $a['total_quantity'];
            });

            $topSales = array_slice($productSales, 0, $limit);

            // Enrich with product data
            $products = [];
            foreach ($topSales as $sale) {
                $product = Product::find($sale['product_id']);
                if ($product) {
                    $products[] = [
                        'product' => $product,
                        'total_quantity' => $sale['total_quantity'],
                        'transaction_count' => $sale['transaction_count'],
                        'total_revenue' => (float) $sale['total_revenue']
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'report' => $products
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating top products report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get expiring products report
     */
    public function expiringProducts(Request $request)
    {
        $days = $request->get('days', 30);
        $futureDate = Carbon::now()->addDays($days);

        $products = Product::all()
            ->filter(function ($product) use ($futureDate) {
                if (!isset($product->batches) || !is_array($product->batches)) {
                    return false;
                }
                return collect($product->batches)->some(function ($batch) use ($futureDate) {
                    return isset($batch['quantity_remaining'])
                        && $batch['quantity_remaining'] > 0
                        && isset($batch['expiration_date'])
                        && Carbon::parse($batch['expiration_date'])->lte($futureDate)
                        && Carbon::parse($batch['expiration_date'])->gte(Carbon::now());
                });
            })
            ->map(function ($product) use ($futureDate) {
                $expiringBatches = collect($product->batches)->filter(function ($batch) use ($futureDate) {
                    return isset($batch['quantity_remaining'])
                        && $batch['quantity_remaining'] > 0
                        && isset($batch['expiration_date'])
                        && Carbon::parse($batch['expiration_date'])->lte($futureDate)
                        && Carbon::parse($batch['expiration_date'])->gte(Carbon::now());
                })->sortBy('expiration_date')->values();

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
                    new UTCDateTime($now->copy()->startOfDay()->timestamp * 1000),
                    new UTCDateTime($now->copy()->endOfDay()->timestamp * 1000)
                ];
            case 'week':
                return [
                    new UTCDateTime($now->copy()->startOfWeek()->timestamp * 1000),
                    new UTCDateTime($now->copy()->endOfWeek()->timestamp * 1000)
                ];
            case 'month':
                return [
                    new UTCDateTime($now->copy()->startOfMonth()->timestamp * 1000),
                    new UTCDateTime($now->copy()->endOfMonth()->timestamp * 1000)
                ];
            case 'year':
                return [
                    new UTCDateTime($now->copy()->startOfYear()->timestamp * 1000),
                    new UTCDateTime($now->copy()->endOfYear()->timestamp * 1000)
                ];
            default:
                return [
                    new UTCDateTime($now->copy()->startOfDay()->timestamp * 1000),
                    new UTCDateTime($now->copy()->endOfDay()->timestamp * 1000)
                ];
        }
    }

    private function getOrdersStats($dateRange)
    {
        $orders = Order::whereBetween('created_at', $dateRange)->get();

        return [
            'total' => $orders->count(),
            'pending' => $orders->where('status', 'pending')->count(),
            'preparing' => $orders->where('status', 'preparing')->count(),
            'ready_for_pickup' => $orders->where('status', 'ready_for_pickup')->count(),
            'completed' => $orders->where('status', 'completed')->count(),
            'cancelled' => $orders->where('status', 'cancelled')->count(),
        ];
    }

    private function getInventoryStats()
    {
        return [
            'total_products' => Product::count(),
            'low_stock' => Product::where(function ($q) {
                $q->whereRaw([
                    '$expr' => ['$lte' => ['$stock_quantity', '$reorder_level']]
                ])->where('stock_quantity', '>', 0);
            })->count(),
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
            'total' => (float) ($posRevenue + $ordersRevenue),
            'pos' => (float) $posRevenue,
            'orders' => (float) $ordersRevenue,
        ];
    }

    private function calculateInventoryValue()
    {
        $products = Product::all();
        $totalValue = 0;

        foreach ($products as $product) {
            if (isset($product->batches) && is_array($product->batches)) {
                foreach ($product->batches as $batch) {
                    $quantity = $batch['quantity_remaining'] ?? 0;
                    $cost = $batch['unit_cost'] ?? 0;
                    $totalValue += $quantity * $cost;
                }
            }
        }

        return (float) $totalValue;
    }

    private function groupSalesByDate($posTransactions, $orders, $groupBy)
    {
        $allTransactions = [];

        foreach ($posTransactions as $transaction) {
            $date = Carbon::parse($transaction->created_at);
            $allTransactions[] = [
                'date' => $date,
                'amount' => $transaction->total_amount
            ];
        }

        foreach ($orders as $order) {
            $date = Carbon::parse($order->created_at);
            $allTransactions[] = [
                'date' => $date,
                'amount' => $order->total_amount
            ];
        }

        // Group by date format
        $grouped = [];
        foreach ($allTransactions as $transaction) {
            $key = '';
            switch ($groupBy) {
                case 'week':
                    $key = $transaction['date']->format('Y-W');
                    break;
                case 'month':
                    $key = $transaction['date']->format('Y-m');
                    break;
                default:
                    $key = $transaction['date']->format('Y-m-d');
                    break;
            }

            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'total' => 0,
                    'count' => 0
                ];
            }

            $grouped[$key]['total'] += (float) $transaction['amount'];
            $grouped[$key]['count']++;
        }

        // Sort by key
        ksort($grouped);

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
                    'total_spent' => (float) $spending['total_spent'],
                    'order_count' => $spending['order_count']
                ];
            }
        }

        return $topCustomers;
    }
}
