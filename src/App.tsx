
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/config/queryClient";
import { Routes, Route, Navigate } from "react-router-dom";
import { UnifiedAuthProvider } from "@/hooks/useUnifiedAuth";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

import { AttendantRoute } from "@/routes/AttendantRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import { OptimizedLoadingSpinner } from "@/components/OptimizedLoadingSpinner";
import { smartPreload } from "@/utils/routePreloader";

// ===== PHASE 4: PWA + ANALYTICS COMPONENTS =====
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AnalyticsDebugger } from './components/AnalyticsDebugger';

// Core pages - loading instantâneo (não lazy loaded)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

// Lazy load attendant unified
const AttendantUnified = lazy(() => import("./pages/AttendantUnified"));

// Lazy loaded pages - apenas secundárias (otimizado)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Account = lazy(() => import("./pages/Account"));
const OrderStatus = lazy(() => import("./pages/OrderStatus"));
const OrderStatusModern = lazy(() => import("./pages/OrderStatusModern"));
const Payment = lazy(() => import("./pages/Payment"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// NEW ADMIN STRUCTURE - FASE 1 & FASE 3
const NewAdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminReceitas = lazy(() => import("@/pages/admin/dashboard/Receitas"));

// FASE 3 - Gerenciar App
const GerenciarApp = lazy(() => import("@/pages/admin/gerenciar-app/index"));
const GerenciarAppProdutos = lazy(() => import("@/pages/admin/gerenciar-app/produtos/index"));
const GerenciarAppDelivery = lazy(() => import("@/pages/admin/gerenciar-app/Delivery"));
const GerenciarAppRegrasPagamento = lazy(() => import("@/pages/admin/gerenciar-app/RegrasPagamento"));
const GerenciarAppHorarios = lazy(() => import("@/pages/admin/gerenciar-app/Horarios"));
const GerenciarAppNotificacoes = lazy(() => import("@/pages/admin/gerenciar-app/Notificacoes"));
const GerenciarAppInformacoes = lazy(() => import("@/pages/admin/gerenciar-app/Informacoes"));
const GerenciarAppFidelidade = lazy(() => import("@/pages/admin/gerenciar-app/fidelidade/index"));

// FASE 4 - Configurações
const Configuracoes = lazy(() => import("@/pages/admin/configuracoes/index"));
const ConfigImpressao = lazy(() => import("@/pages/admin/configuracoes/Impressao"));
const ConfigUsuarios = lazy(() => import("@/pages/admin/configuracoes/Usuarios"));
const ConfigConta = lazy(() => import("@/pages/admin/configuracoes/Conta"));

// FASE 5 - Sistema
const Sistema = lazy(() => import("@/pages/admin/sistema/index"));
const SistemaLogs = lazy(() => import("@/pages/admin/sistema/Logs"));
const SistemaStatus = lazy(() => import("@/pages/admin/sistema/Status"));
const SistemaPlanos = lazy(() => import("@/pages/admin/sistema/Planos"));
const SistemaBackups = lazy(() => import("@/pages/admin/sistema/Backups"));

// FASE 6 - Relatórios
const Relatorios = lazy(() => import("@/pages/admin/relatorios/index"));
const RelatoriosAnalytics = lazy(() => import("@/pages/admin/relatorios/Analytics"));
const RelatoriosPedidos = lazy(() => import("@/pages/admin/relatorios/Pedidos"));
const RelatoriosVendas = lazy(() => import("@/pages/admin/relatorios/VendasCategoria"));
const RelatoriosClientes = lazy(() => import("@/pages/admin/relatorios/Clientes"));
const RelatoriosDelivery = lazy(() => import("@/pages/admin/relatorios/Delivery"));

// FASE 7 - CRM
const CRM = lazy(() => import("@/pages/admin/crm/index"));
const CRMClientes = lazy(() => import("@/pages/admin/crm/Clientes"));
const CRMSegmentacao = lazy(() => import("@/pages/admin/crm/Segmentacao"));
const CRMComunicacao = lazy(() => import("@/pages/admin/crm/Comunicacao"));
const CRMFidelidade = lazy(() => import("@/pages/admin/crm/Fidelidade"));

// FASE 8 - Marketing
const Marketing = lazy(() => import("@/pages/admin/marketing/index"));
const MarketingCupons = lazy(() => import("@/pages/admin/marketing/Cupons"));
const MarketingPromocoes = lazy(() => import("@/pages/admin/marketing/Promocoes"));
const MarketingCampanhas = lazy(() => import("@/pages/admin/marketing/Campanhas"));
const MarketingBanners = lazy(() => import("@/pages/admin/marketing/Banners"));

// FASE 9 - Integrações (Reorganizadas)
const Integracoes = lazy(() => import("@/pages/admin/integracoes/index"));
const IntegracoesDelivery = lazy(() => import("@/pages/admin/integracoes/Delivery"));
const IntegracoesERP = lazy(() => import("@/pages/admin/integracoes/ERP"));
const IntegracoesWebhooks = lazy(() => import("@/pages/admin/integracoes/Webhooks"));

// Phase 2 Premium
const Phase2PremiumExperience = lazy(() => import("./components/Phase2PremiumExperience"));

const App = () => {
  // Preload de rotas críticas no mount
  useEffect(() => {
    smartPreload.preloadCritical();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnifiedAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={
              <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                <ResetPassword />
              </Suspense>
            } />
             {/* Payment Routes */}
              <Route path="/payment/pix" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Payment />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Payment />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/payment/:orderId" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Payment />
                </Suspense>
              </ProtectedRoute>
            } />
            {/* Customer Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            } />
             <Route path="/phase2-premium" element={
               <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                 <Phase2PremiumExperience />
               </Suspense>
             } />
             {/* Menu agora acessível para todos os clientes autenticados */}
             <Route path="/menu" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Menu />
              </ProtectedRoute>
             } />
             <Route path="/checkout" element={
               <ProtectedRoute requireAuth={true} requireRole="customer">
                 <Checkout />
               </ProtectedRoute>
             } />
             <Route path="/orders" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Orders />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <Account />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/order-status/:orderId" element={
              <ProtectedRoute requireAuth={true} requireRole="customer">
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <OrderStatusModern />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* ===== ADMIN ROUTES ===== */}
            <Route path="/admin" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <NewAdminDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard/receitas" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <AdminReceitas />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* ===== FASE 3 - GERENCIAR APP ===== */}
            <Route path="/admin/gerenciar-app" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <GerenciarApp />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route path="produtos" element={<GerenciarAppProdutos />} />
              <Route path="delivery" element={<GerenciarAppDelivery />} />
              <Route path="regras-pagamento" element={<GerenciarAppRegrasPagamento />} />
              <Route path="horarios" element={<GerenciarAppHorarios />} />
              <Route path="notificacoes" element={<GerenciarAppNotificacoes />} />
              <Route path="informacoes" element={<GerenciarAppInformacoes />} />
              <Route path="fidelidade" element={<GerenciarAppFidelidade />} />
            </Route>
            
            {/* ===== FASE 4 - CONFIGURAÇÕES ===== */}
            <Route path="/admin/configuracoes" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <Configuracoes />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<ConfigImpressao />} />
              <Route path="impressao" element={<ConfigImpressao />} />
              <Route path="usuarios" element={<ConfigUsuarios />} />
              <Route path="conta" element={<ConfigConta />} />
            </Route>

            {/* ===== FASE 5 - SISTEMA ===== */}
            <Route path="/admin/sistema" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <Sistema />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route path="logs" element={<SistemaLogs />} />
              <Route path="status" element={<SistemaStatus />} />
              <Route path="planos" element={<SistemaPlanos />} />
              <Route path="backups" element={<SistemaBackups />} />
            </Route>

            {/* ===== FASE 6 - RELATÓRIOS ===== */}
            <Route path="/admin/relatorios" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <Relatorios />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route path="analytics" element={<RelatoriosAnalytics />} />
              <Route path="pedidos" element={<RelatoriosPedidos />} />
              <Route path="vendas" element={<RelatoriosVendas />} />
              <Route path="clientes" element={<RelatoriosClientes />} />
              <Route path="delivery" element={<RelatoriosDelivery />} />
            </Route>

            {/* ===== FASE 7 - CRM ===== */}
            <Route path="/admin/crm" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <CRM />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<CRMClientes />} />
              <Route path="clientes" element={<CRMClientes />} />
              <Route path="segmentacao" element={<CRMSegmentacao />} />
              <Route path="comunicacao" element={<CRMComunicacao />} />
              <Route path="fidelidade" element={<CRMFidelidade />} />
            </Route>

            {/* ===== FASE 8 - MARKETING ===== */}
            <Route path="/admin/marketing" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <Marketing />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<MarketingCupons />} />
              <Route path="cupons" element={<MarketingCupons />} />
              <Route path="promocoes" element={<MarketingPromocoes />} />
              <Route path="campanhas" element={<MarketingCampanhas />} />
              <Route path="banners" element={<MarketingBanners />} />
            </Route>

            {/* ===== FASE 9 - INTEGRAÇÕES (REORGANIZADAS) ===== */}
            <Route path="/admin/integracoes" element={
              <ProtectedRoute requireAuth={true} requireRole="admin">
                <Suspense fallback={<OptimizedLoadingSpinner />}>
                  <Integracoes />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<IntegracoesDelivery />} />
              <Route path="delivery" element={<IntegracoesDelivery />} />
              <Route path="erp" element={<IntegracoesERP />} />
              <Route path="webhooks" element={<IntegracoesWebhooks />} />
            </Route>
            
            {/* ===== ATTENDANT ROUTE ===== */}
            <Route path="/attendant" element={
              <AttendantRoute>
                <Suspense fallback={<OptimizedLoadingSpinner variant="minimal" />}>
                  <AttendantUnified />
                </Suspense>
              </AttendantRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* ===== PHASE 4: PWA & ANALYTICS COMPONENTS ===== */}
      <PWAInstallPrompt />
      {import.meta.env.DEV && <AnalyticsDebugger />}
          </TooltipProvider>
        </UnifiedAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
