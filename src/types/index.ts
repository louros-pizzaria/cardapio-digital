// ===== TIPAGENS GLOBAIS DO SISTEMA =====

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  ingredients: string[];
  category_id: string;
  subcategory_id?: string;
  is_available?: boolean;
  subcategories?: { name: string };
  categories?: { name: string };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
  cpf?: string;
  avatar_url?: string;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  notes?: string;
  delivery_fee?: number;
  estimated_delivery_time?: number;
  address_id?: string;
  updated_at?: string;
  profiles?: { full_name: string; email: string };
  addresses?: { street: string; number: string; neighborhood: string };
  order_items?: Array<{ quantity: number; products?: { name: string } }>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations?: CartCustomization;
  created_at: string;
  products?: { name: string };
}

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan_name: string;
  plan_price: number;
  started_at?: string;
  expires_at?: string;
  payment_method?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order_position?: number;
  is_active?: boolean;
  created_at?: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  order_position: number | null;
  is_active: boolean | null;
  created_at: string | null;
  product_count: number;
}

export interface CartCustomization {
  halfAndHalf?: {
    firstHalf: string;
    secondHalf: string;
  };
  crust?: string;
  crustName?: string;
  extras?: string[];
  extrasNames?: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  customizations?: CartCustomization;
  notes?: string;
}

export interface DeliveryZone {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  estimated_time: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface RecentOrder {
  id: string;
  order_number: number;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: {
    product_id: string;
    quantity: number;
    customizations?: any;
    products: {
      name: string;
      image_url?: string;
    };
  }[];
}

export interface StoreInfo {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone: string;
  email: string;
  whatsapp?: string;
  is_open?: boolean;
  closed_message?: string;
}

// ===== TIPOS PARA VISUALIZAÇÕES =====
export type CurrentView = 'categories' | 'subcategories' | 'products';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type UserRole = 'admin' | 'customer';
export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'cancelled';
export type PaymentCategory = 'online' | 'on_delivery';
export type PaymentMethod = 'pix' | 'credit_card_online' | 'debit_card_online' | 'credit_card_delivery' | 'debit_card_delivery' | 'cash';
export type DeliveryMethod = 'delivery' | 'pickup';