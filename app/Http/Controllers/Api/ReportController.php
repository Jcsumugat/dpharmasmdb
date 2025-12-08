<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Prescription;
use App\Models\POSTransaction;
use App\Models\User;
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
        try {
            $period = $request->get('period', 'today');
            $dateRange = $this->getDateRange($period);

            $revenueAndProfit = $this->getRevenueAndProfitStats($dateRange);

            $stats = [
                'revenue' => $revenueAndProfit['revenue'],
                'profit' => $revenueAndProfit['profit'],
                'orders' => $this->getOrdersStats($dateRange),
                'inventory' => $this->getInventoryStats(),
                'customers' => $this->getCustomersStats($dateRange),
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats,
                'period' => $period
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating dashboard: ' . $e->getMessage()
            ], 500);
        }
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

            $posTransactions = POSTransaction::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            $orders = Order::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            // Calculate revenue and profit
            $posRevenue = $posTransactions->sum('total_amount');
            $ordersRevenue = $orders->sum('total_amount');
            $totalRevenue = $posRevenue + $ordersRevenue;

            // Calculate profit by analyzing items
            $profitData = $this->calculateProfitFromTransactions($posTransactions, $orders);

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
                    'total_cost' => (float) $profitData['total_cost'],
                    'total_profit' => (float) $profitData['total_profit'],
                    'profit_margin' => $totalRevenue > 0 ? (float) (($profitData['total_profit'] / $totalRevenue) * 100) : 0,
                    'total_transactions' => $totalTransactions,
                    'average_transaction' => $totalTransactions > 0 ? (float) ($totalRevenue / $totalTransactions) : 0,
                    'pos_revenue' => (float) $posRevenue,
                    'pos_profit' => (float) $profitData['pos_profit'],
                    'orders_revenue' => (float) $ordersRevenue,
                    'orders_profit' => (float) $profitData['orders_profit'],
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
        try {
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
                            if (!isset($batch['expiration_date']) || !isset($batch['quantity_remaining'])) {
                                return false;
                            }

                            try {
                                $expirationDate = Carbon::parse($batch['expiration_date']);
                                return $batch['quantity_remaining'] > 0
                                    && $expirationDate->lte($thirtyDaysFromNow)
                                    && $expirationDate->gte(Carbon::now());
                            } catch (\Exception $e) {
                                return false;
                            }
                        });
                    });

                    return response()->json([
                        'success' => true,
                        'report' => [
                            'products' => $products->values(),
                            'summary' => [
                                'total_products' => Product::count(),
                                'low_stock_count' => $this->getLowStockCount(),
                                'out_of_stock_count' => Product::where('stock_quantity', '<=', 0)->count(),
                                'total_inventory_value' => $this->calculateInventoryValue(),
                            ]
                        ]
                    ]);
            }

            $products = $query->get();

            $summary = [
                'total_products' => Product::count(),
                'low_stock_count' => $this->getLowStockCount(),
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating inventory report: ' . $e->getMessage()
            ], 500);
        }
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

            $posTransactions = POSTransaction::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

            $orders = Order::where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->get();

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

            usort($productSales, function($a, $b) {
                return $b['total_quantity'] - $a['total_quantity'];
            });

            $topSales = array_slice($productSales, 0, $limit);

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
        try {
            $days = (int) $request->get('days', 30);
            $futureDate = Carbon::now()->addDays($days);
            $now = Carbon::now();

            $products = Product::all()
                ->filter(function ($product) use ($futureDate, $now) {
                    if (!isset($product->batches) || !is_array($product->batches)) {
                        return false;
                    }

                    return collect($product->batches)->some(function ($batch) use ($futureDate, $now) {
                        if (!isset($batch['expiration_date']) || !isset($batch['quantity_remaining'])) {
                            return false;
                        }

                        if ($batch['quantity_remaining'] <= 0) {
                            return false;
                        }

                        try {
                            $expirationDate = Carbon::parse($batch['expiration_date']);
                            return $expirationDate->lte($futureDate) && $expirationDate->gte($now);
                        } catch (\Exception $e) {
                            return false;
                        }
                    });
                })
                ->map(function ($product) use ($futureDate, $now) {
                    $expiringBatches = collect($product->batches)
                        ->filter(function ($batch) use ($futureDate, $now) {
                            if (!isset($batch['expiration_date']) || !isset($batch['quantity_remaining'])) {
                                return false;
                            }

                            if ($batch['quantity_remaining'] <= 0) {
                                return false;
                            }

                            try {
                                $expirationDate = Carbon::parse($batch['expiration_date']);
                                return $expirationDate->lte($futureDate) && $expirationDate->gte($now);
                            } catch (\Exception $e) {
                                return false;
                            }
                        })
                        ->sortBy('expiration_date')
                        ->values()
                        ->toArray();

                    return [
                        '_id' => $product->_id,
                        'product_name' => $product->product_name,
                        'product_code' => $product->product_code,
                        'stock_quantity' => $product->stock_quantity,
                        'expiring_batches' => $expiringBatches
                    ];
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating expiring products report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer analytics
     */
    public function customers(Request $request)
    {
        try {
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating customer report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get prescription analytics
     */
    public function prescriptions(Request $request)
    {
        try {
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating prescription report: ' . $e->getMessage()
            ], 500);
        }
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
            'low_stock' => $this->getLowStockCount(),
            'out_of_stock' => Product::where('stock_quantity', '<=', 0)->count(),
            'total_value' => $this->calculateInventoryValue(),
        ];
    }

    private function getLowStockCount()
    {
        return Product::where(function ($q) {
            $q->whereRaw([
                '$expr' => ['$lte' => ['$stock_quantity', '$reorder_level']]
            ])->where('stock_quantity', '>', 0);
        })->count();
    }

    private function getCustomersStats($dateRange)
    {
        return [
            'total' => User::where('role', 'customer')->count(),
            'active' => User::where('role', 'customer')->where('status', 'active')->count(),
            'new' => User::where('role', 'customer')->whereBetween('created_at', $dateRange)->count(),
        ];
    }

    private function getRevenueAndProfitStats($dateRange)
    {
        $posTransactions = POSTransaction::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->get();

        $orders = Order::where('status', 'completed')
            ->whereBetween('created_at', $dateRange)
            ->get();

        $posRevenue = $posTransactions->sum('total_amount');
        $ordersRevenue = $orders->sum('total_amount');

        // Calculate profit
        $profitData = $this->calculateProfitFromTransactions($posTransactions, $orders);

        return [
            'revenue' => [
                'total' => (float) ($posRevenue + $ordersRevenue),
                'pos' => (float) $posRevenue,
                'orders' => (float) $ordersRevenue,
            ],
            'profit' => [
                'total' => (float) $profitData['total_profit'],
                'pos' => (float) $profitData['pos_profit'],
                'orders' => (float) $profitData['orders_profit'],
                'total_cost' => (float) $profitData['total_cost'],
                'profit_margin' => ($posRevenue + $ordersRevenue) > 0
                    ? (float) (($profitData['total_profit'] / ($posRevenue + $ordersRevenue)) * 100)
                    : 0,
            ]
        ];
    }

    /**
     * Calculate profit from transactions and orders
     */
    private function calculateProfitFromTransactions($posTransactions, $orders)
    {
        $posProfit = 0;
        $posCost = 0;
        $ordersProfit = 0;
        $ordersCost = 0;

        // Calculate POS profit
        foreach ($posTransactions as $transaction) {
            if (isset($transaction->items) && is_array($transaction->items)) {
                foreach ($transaction->items as $item) {
                    $quantity = $item['quantity'] ?? 0;
                    // POS uses 'unit_price' for sale price
                    $salePrice = $item['unit_price'] ?? 0;
                    $unitCost = $item['unit_cost'] ?? 0;

                    $itemRevenue = $quantity * $salePrice;
                    $itemCost = $quantity * $unitCost;

                    // Debug log for each item
                    \Log::debug('POS Profit Calculation', [
                        'product' => $item['product_name'] ?? 'Unknown',
                        'quantity' => $quantity,
                        'unit_price' => $salePrice,
                        'unit_cost' => $unitCost,
                        'revenue' => $itemRevenue,
                        'cost' => $itemCost,
                        'profit' => ($itemRevenue - $itemCost)
                    ]);

                    $posProfit += ($itemRevenue - $itemCost);
                    $posCost += $itemCost;
                }
            }
        }

        // Calculate Orders profit
        foreach ($orders as $order) {
            if (isset($order->items) && is_array($order->items)) {
                foreach ($order->items as $item) {
                    $quantity = $item['quantity'] ?? 0;
                    // Orders use 'unit_price' for sale price
                    $salePrice = $item['unit_price'] ?? $item['price'] ?? 0;
                    $unitCost = $item['unit_cost'] ?? 0;

                    $itemRevenue = $quantity * $salePrice;
                    $itemCost = $quantity * $unitCost;

                    $ordersProfit += ($itemRevenue - $itemCost);
                    $ordersCost += $itemCost;
                }
            }
        }

        return [
            'pos_profit' => $posProfit,
            'pos_cost' => $posCost,
            'orders_profit' => $ordersProfit,
            'orders_cost' => $ordersCost,
            'total_profit' => $posProfit + $ordersProfit,
            'total_cost' => $posCost + $ordersCost,
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

        // Collect POS transactions with items for profit calculation
        foreach ($posTransactions as $transaction) {
            $date = Carbon::parse($transaction->created_at);

            // Calculate profit for this transaction
            $transactionProfit = 0;
            $transactionCost = 0;
            if (isset($transaction->items) && is_array($transaction->items)) {
                foreach ($transaction->items as $item) {
                    $quantity = $item['quantity'] ?? 0;
                    $salePrice = $item['price'] ?? 0;
                    $unitCost = $item['unit_cost'] ?? 0;

                    $transactionProfit += ($quantity * ($salePrice - $unitCost));
                    $transactionCost += ($quantity * $unitCost);
                }
            }

            $allTransactions[] = [
                'date' => $date,
                'amount' => $transaction->total_amount,
                'profit' => $transactionProfit,
                'cost' => $transactionCost
            ];
        }

        // Collect orders with items for profit calculation
        foreach ($orders as $order) {
            $date = Carbon::parse($order->created_at);

            // Calculate profit for this order
            $orderProfit = 0;
            $orderCost = 0;
            if (isset($order->items) && is_array($order->items)) {
                foreach ($order->items as $item) {
                    $quantity = $item['quantity'] ?? 0;
                    $salePrice = $item['unit_price'] ?? 0;
                    $unitCost = $item['unit_cost'] ?? 0;

                    $orderProfit += ($quantity * ($salePrice - $unitCost));
                    $orderCost += ($quantity * $unitCost);
                }
            }

            $allTransactions[] = [
                'date' => $date,
                'amount' => $order->total_amount,
                'profit' => $orderProfit,
                'cost' => $orderCost
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
                    'count' => 0,
                    'profit' => 0,
                    'cost' => 0
                ];
            }

            $grouped[$key]['total'] += (float) $transaction['amount'];
            $grouped[$key]['profit'] += (float) $transaction['profit'];
            $grouped[$key]['cost'] += (float) $transaction['cost'];
            $grouped[$key]['count']++;
        }

        // Calculate profit margin for each date
        foreach ($grouped as $key => $data) {
            $grouped[$key]['profit_margin'] = $data['total'] > 0
                ? (($data['profit'] / $data['total']) * 100)
                : 0;
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
