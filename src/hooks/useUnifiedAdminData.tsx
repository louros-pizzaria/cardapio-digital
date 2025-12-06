import { useState, useEffect, useCallback } from 'react';
import { supabase, QUERY_KEYS } from '@/services/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ===== INTERFACES UNIFICADAS =====
export interface UnifiedAdminStats {
  // Orders
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  averageOrderValue: number;
  revenueGrowth: number;

  // Products
  totalProducts: number;
  availableProducts: number;
  outOfStockProducts: number;
  averagePrice: number;

  // Customers
  totalCustomers: number;
  totalUsers: number; // Alias for totalCustomers for backward compatibility
  newCustomersThisMonth: number;
  activeCustomers: number;
  customerGrowth: number;

  // General
  topSellingProducts: Array<{
    id: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
  }>;
  
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  category_id?: string;
  subcategory_id?: string;
  image_url?: string;
  order_position: number;
  created_at: string;
  updated_at: string;
  ingredients?: string[];
  categories?: { name: string };
  subcategories?: { name: string };
  totalSold: number;
  totalRevenue: number;
  lastOrderDate?: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  created_at: string;
  avatar_url?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  favoriteProducts: string[];
  addresses: Array<{
    id: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    is_default: boolean;
  }>;
}

// ===== FETCH FUNCTIONS =====
const fetchUnifiedStats = async (): Promise<UnifiedAdminStats> => {
  try {
    // Buscar dados em paralelo
    const [ordersRes, productsRes, customersRes, salesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total_amount, created_at'),
      
      supabase
        .from('products')
        .select('id, name, price, is_available'),
      
      supabase
        .from('profiles')
        .select('id, created_at'),
      
      supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          total_price,
          products (name),
          orders!inner (created_at, status, user_id, total_amount)
        `)
        .eq('orders.status', 'delivered')
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const customers = customersRes.data || [];
    const sales = salesRes.data || [];

    // Calculate dates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Orders stats
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today).length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const todayRevenue = orders
      .filter(o => new Date(o.created_at) >= today)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate revenue growth (comparing current month vs last month)
    const thisMonthRevenue = orders
      .filter(o => new Date(o.created_at) >= thisMonth)
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const lastMonthRevenue = orders
      .filter(o => {
        const date = new Date(o.created_at);
        return date >= lastMonth && date < thisMonth;
      })
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : thisMonthRevenue > 0 ? 100 : 0;

    // Products stats
    const availableProducts = products.filter(p => p.is_available).length;
    const outOfStockProducts = products.filter(p => !p.is_available).length;
    const averagePrice = products.length > 0 
      ? products.reduce((sum, p) => sum + Number(p.price || 0), 0) / products.length 
      : 0;

    // Customer stats
    const newCustomersThisMonth = customers.filter(c => 
      new Date(c.created_at) >= thisMonth
    ).length;
    
    const newCustomersLastMonth = customers.filter(c => {
      const date = new Date(c.created_at);
      return date >= lastMonth && date < thisMonth;
    }).length;

    const customerGrowth = newCustomersLastMonth > 0 
      ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100 
      : 0;

    // Top selling products
    const productSales: Record<string, { sold: number; revenue: number; name: string }> = {};
    sales.forEach(sale => {
      if (sale.product_id && sale.products?.name) {
        if (!productSales[sale.product_id]) {
          productSales[sale.product_id] = { sold: 0, revenue: 0, name: sale.products.name };
        }
        productSales[sale.product_id].sold += sale.quantity;
        productSales[sale.product_id].revenue += Number(sale.total_price || 0);
      }
    });

    const topSellingProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalSold: data.sold,
        totalRevenue: data.revenue
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Top customers
    const customerSpending: Record<string, { spent: number; orders: number }> = {};
    sales.forEach(sale => {
      if (sale.orders?.user_id) {
        const userId = sale.orders.user_id;
        if (!customerSpending[userId]) {
          customerSpending[userId] = { spent: 0, orders: 0 };
        }
        customerSpending[userId].spent += Number(sale.orders.total_amount || 0);
        customerSpending[userId].orders += 1;
      }
    });

    const topCustomers = Object.entries(customerSpending)
      .map(([id, data]) => {
        const customer = customers.find(c => c.id === id);
        return {
          id,
          name: 'Cliente',
          totalSpent: data.spent,
          orderCount: data.orders
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Active customers (orders in last 30 days)
    const recentOrderUsers = new Set(
      sales
        .filter(sale => sale.orders && new Date(sale.orders.created_at) >= thirtyDaysAgo)
        .map(sale => sale.orders!.user_id)
    );
    const activeCustomers = recentOrderUsers.size;

    return {
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      averageOrderValue,
      revenueGrowth,

      totalProducts: products.length,
      availableProducts,
      outOfStockProducts,
      averagePrice,

      totalCustomers: customers.length,
      totalUsers: customers.length, // Alias for backward compatibility
      newCustomersThisMonth,
      activeCustomers,
      customerGrowth,

      topSellingProducts,
      topCustomers
    };
  } catch (error) {
    console.error('Error fetching unified admin stats:', error);
    throw error;
  }
};

const fetchProducts = async (filters?: {
  category?: string;
  subcategory?: string;
  available?: boolean;
  limit?: number;
  search?: string;
}): Promise<AdminProduct[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories (name),
        subcategories (name)
      `)
      .order('order_position', { ascending: true });

    // Apply filters
    if (filters?.category) query = query.eq('category_id', filters.category);
    if (filters?.subcategory) query = query.eq('subcategory_id', filters.subcategory);
    if (filters?.available !== undefined) query = query.eq('is_available', filters.available);
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters?.limit) query = query.limit(filters.limit);

    const [productsRes, salesRes] = await Promise.all([
      query,
      supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          total_price,
          orders!inner (created_at, status)
        `)
        .eq('orders.status', 'delivered')
    ]);

    const products = productsRes.data || [];
    const sales = salesRes.data || [];

    return products.map(product => {
      const productSales = sales.filter(sale => sale.product_id === product.id);
      const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalRevenue = productSales.reduce((sum, sale) => sum + Number(sale.total_price), 0);
      const lastSale = productSales.sort((a, b) => 
        new Date(b.orders.created_at).getTime() - new Date(a.orders.created_at).getTime()
      )[0];

      return {
        ...product,
        totalSold,
        totalRevenue,
        lastOrderDate: lastSale?.orders.created_at
      };
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// ===== MAIN HOOK =====
export const useUnifiedAdminData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stats query
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_STATS,
    queryFn: fetchUnifiedStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Products query
  const { 
    data: products = [], 
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts 
  } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_PRODUCTS,
    queryFn: () => fetchProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });

  // Update product function
  const updateProduct = useCallback(async (productId: string, updates: Partial<AdminProduct>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });

      toast({
        title: "Produto atualizado",
        description: "Produto atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto",
        variant: "destructive"
      });
      throw error;
    }
  }, [queryClient, toast]);

  // Toggle availability function
  const toggleAvailability = useCallback(async (productId: string, isAvailable: boolean) => {
    await updateProduct(productId, { is_available: isAvailable });
  }, [updateProduct]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchProducts()
    ]);
  }, [refetchStats, refetchProducts]);

  return {
    // Data
    stats: stats || {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      todayOrders: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      averageOrderValue: 0,
      revenueGrowth: 0,
      totalProducts: 0,
      availableProducts: 0,
      outOfStockProducts: 0,
      averagePrice: 0,
      totalCustomers: 0,
      totalUsers: 0,
      newCustomersThisMonth: 0,
      activeCustomers: 0,
      customerGrowth: 0,
      topSellingProducts: [],
      topCustomers: []
    },
    products,

    // Loading states
    loading: statsLoading || productsLoading,
    statsLoading,
    productsLoading,

    // Errors
    error: statsError || productsError,
    statsError,
    productsError,

    // Actions
    updateProduct,
    toggleAvailability,
    refreshAllData,
    refetchStats,
    refetchProducts
  };
};