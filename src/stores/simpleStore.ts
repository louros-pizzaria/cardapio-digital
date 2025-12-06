// ===== STORE UNIFICADO - SINGLE SOURCE OF TRUTH =====

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, CartCustomization } from '@/types';

// ===== UNIFIED STORE =====
interface UnifiedState {
  // Cart State
  items: CartItem[];
  deliveryFee: number;
  deliveryMethod: 'delivery' | 'pickup';
  
  // Menu State
  categories: any[];
  products: any[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  currentView: 'categories' | 'subcategories' | 'products';
  searchTerm: string;
  isLoading: boolean;
  
  // Real-time State
  isConnected: boolean;
  
  // Cart Actions
  addItem: (product: any, customizations?: CartCustomization, notes?: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  setDeliveryFee: (fee: number) => void;
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
  
  // Menu Actions
  setCategories: (categories: any[]) => void;
  setProducts: (products: any[]) => void;
  setSelectedCategory: (id: string | null) => void;
  setSelectedSubcategory: (id: string | null) => void;
  setCurrentView: (view: 'categories' | 'subcategories' | 'products') => void;
  setSearchTerm: (term: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Real-time Actions
  setConnected: (connected: boolean) => void;
}

export const useUnifiedStore = create<UnifiedState>()(
  persist(
    (set, get) => ({
      // Cart Initial State
      items: [],
      deliveryFee: 0,
      deliveryMethod: 'delivery',
      
      // Menu Initial State
      categories: [],
      products: [],
      selectedCategoryId: null,
      selectedSubcategoryId: null,
      currentView: 'categories',
      searchTerm: '',
      isLoading: false,
      
      // Real-time Initial State
      isConnected: false,

      // Cart Actions
      addItem: (product, customizations, notes, quantity = 1) => {
        const existingItemIndex = get().items.findIndex(item => 
          item.productId === product.id &&
          JSON.stringify(item.customizations) === JSON.stringify(customizations) &&
          item.notes === notes
        );

        if (existingItemIndex >= 0) {
          const items = [...get().items];
          items[existingItemIndex].quantity += quantity;
          set({ items });
        } else {
          const newItem: CartItem = {
            id: `${product.id}-${Date.now()}`,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: product.image_url,
            customizations,
            notes,
          };

          set(state => ({
            items: [...state.items, newItem],
          }));
        }
      },

      removeItem: (itemId) => {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set(state => ({
          items: state.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          let itemPrice = item.price;
          
          if (item.customizations?.extras) {
            itemPrice += item.customizations.extras.length * 3;
          }
          
          if (item.customizations?.crust && item.customizations.crust !== 'tradicional') {
            itemPrice += 5;
          }

          return total + (itemPrice * item.quantity);
        }, 0);
      },

      getTotal: () => {
        return get().getSubtotal() + get().deliveryFee;
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      setDeliveryFee: (fee) => {
        set({ deliveryFee: fee });
      },
      
      setDeliveryMethod: (method) => {
        set({ deliveryMethod: method });
      },

      // Menu Actions
      setCategories: (categories) => set({ categories }),
      setProducts: (products) => set({ products }),
      setSelectedCategory: (id) => set({ selectedCategoryId: id }),
      setSelectedSubcategory: (id) => set({ selectedSubcategoryId: id }),
      setCurrentView: (view) => set({ currentView: view }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Real-time Actions
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'unified-store',
      partialize: (state) => ({
        items: state.items,
        deliveryFee: state.deliveryFee,
        deliveryMethod: state.deliveryMethod,
        selectedCategoryId: state.selectedCategoryId,
        selectedSubcategoryId: state.selectedSubcategoryId,
        currentView: state.currentView,
      })
    }
  )
);

// ===== EXPORTS =====
export const useCartStore = useUnifiedStore;
export const useMenuStore = useUnifiedStore;