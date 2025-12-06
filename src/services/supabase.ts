// ===== SERVIÇO CENTRALIZADO DO SUPABASE =====

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = 'https://xpgsfovrxguphlvncgwn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ3Nmb3ZyeGd1cGhsdm5jZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NDU5MjgsImV4cCI6MjA2NTAyMTkyOH0.oAeHjwZ-JzP3OG_WebpFXb5tP3n9K3IdfHY4e6DLaTE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ===== CONSTANTES DO REACT QUERY =====
export const QUERY_KEYS = {
  // Auth
  USER: ['user'],
  PROFILE: ['profile'],
  
  // Menu
  CATEGORIES: ['categories'],
  SUBCATEGORIES: ['subcategories'],
  PRODUCTS: ['products'],
  PRODUCT: (id: string) => ['product', id],
  
  // Orders
  ORDERS: ['orders'],
  ORDER: (id: string) => ['order', id],
  RECENT_ORDERS: ['recent-orders'],
  
  // Admin
  ADMIN_STATS: ['admin-stats'],
  ADMIN_ORDERS: ['admin-orders'],
  ADMIN_PRODUCTS: ['admin-products'],
  ADMIN_USERS: ['admin-users'],
  
  // Address
  ADDRESSES: ['addresses'],
  DELIVERY_ZONES: ['delivery-zones'],
  
  // Subscription
  SUBSCRIPTION: ['subscription'],
  
  // Analytics
  ANALYTICS: ['analytics'],
} as const;