// ===== QUERY CACHE STRATEGIES MAPPING =====
// Mapeamento centralizado de domínios para estratégias de cache
// Garante aplicação consistente de cache em toda a aplicação

import { CACHE_STRATEGIES } from './queryClient';

/**
 * Mapeamento de domínios para suas estratégias de cache
 * Permite aplicação consistente em todos os hooks
 */
export const DOMAIN_CACHE_STRATEGY = {
  // Static data (24h cache) - Raramente muda
  categories: CACHE_STRATEGIES.STATIC,
  productTemplates: CACHE_STRATEGIES.STATIC,
  systemConfig: CACHE_STRATEGIES.STATIC,
  cartProducts: CACHE_STRATEGIES.STATIC, // ✅ Categorias são metadados estruturais (raramente mudam)
  
  // Semi-static data (1h cache) - Muda ocasionalmente
  userProfile: CACHE_STRATEGIES.SEMI_STATIC,
  subscription: CACHE_STRATEGIES.SEMI_STATIC,
  addresses: CACHE_STRATEGIES.SEMI_STATIC,
  loyaltyTiers: CACHE_STRATEGIES.SEMI_STATIC,
  products: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De DYNAMIC - Catálogo muda 1-2x/semana
  menu: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De DYNAMIC - Estrutura raramente muda
  campaigns: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Configuradas e mantidas
  coupons: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Criados e permanecem fixos
  promotions: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Período definido
  banners: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Estáticos durante exibição
  deliveryDrivers: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Lista muda raramente
  deliveryZones: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Zonas são fixas
  integrations: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Configurações estáticas
  customerSegments: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Segmentação não muda em tempo real
  loyaltyRewards: CACHE_STRATEGIES.SEMI_STATIC, // ✅ De REALTIME - Recompensas configuradas
  
  // Dynamic data (5min cache) - Muda com frequência moderada
  customers: CACHE_STRATEGIES.DYNAMIC, // ✅ De REALTIME - Lista muda, mas 5min é suficiente
  loyaltyRedemptions: CACHE_STRATEGIES.DYNAMIC, // ✅ De REALTIME - Resgates não precisam ser instantâneos
  
  // Critical data (30s cache) - Precisa estar sempre atualizado
  stock: CACHE_STRATEGIES.CRITICAL,
  prices: CACHE_STRATEGIES.CRITICAL,
  adminOrders: CACHE_STRATEGIES.CRITICAL,
  
  // Realtime data (30s cache + refetch agressivo) - Dados em tempo real
  orders: CACHE_STRATEGIES.REALTIME, // ✅ Mantido - Pedidos precisam ser instantâneos
} as const;

/**
 * Helper function para aplicar strategy de cache
 * 
 * @example
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: ['products'],
 *   queryFn: fetchProducts,
 *   ...applyStrategy('products'), // ✅ Aplicação automática
 * });
 * ```
 */
export const applyStrategy = (domain: keyof typeof DOMAIN_CACHE_STRATEGY) => {
  return DOMAIN_CACHE_STRATEGY[domain];
};
