# 📊 REESTRUTURAÇÃO TÉCNICA COMPLETA - DADOS DETALHADOS

> **Gerado em**: 27/10/2025  
> **Sistema**: Cardápio Digital com Assinatura  
> **Stack**: React + Vite + TypeScript + Supabase + Shadcn/UI + TailwindCSS

---

## 📋 DADOS COMPLEMENTARES À AUDITORIA

Esta documentação complementa o relatório `AUDITORIA_TECNICA_COMPLETA.md` com dados técnicos detalhados sobre:
- Estrutura completa de pastas
- Dependências e versões
- Configurações (Vite, TypeScript, Supabase)
- Hooks e Providers em detalhe
- Edge Functions (código-fonte)
- Schema completo do banco
- Fluxos de negócio ilustrados
- Análises quantitativas

---

## 1. ESTRUTURA COMPLETA

**Total de Arquivos:** 250+
**Linhas de Código:** ~56,000
**Componentes:** 110+
**Hooks:** 42
**Edge Functions:** 30
**Tabelas:** 45+

### Principais Módulos:
- `src/components/` - 110 componentes (38 UI, 72 funcionais)
- `src/pages/` - 33 páginas (11 core, 22 admin)
- `src/hooks/` - 42 hooks customizados
- `src/utils/` - 37 utilitários
- `supabase/functions/` - 30 edge functions

## 2. DEPENDÊNCIAS

### Produção (68 pacotes):
- React 18.3.1 + React Router 6.26.2
- Supabase 2.50.0 + React Query 5.56.2
- Radix UI (43 componentes)
- Mercado Pago + PIX Utils
- Recharts, Date-fns, Zod, Zustand

### Bundle Size:
- **Atual:** ~730KB gzipped
- **Otimizado:** ~520KB gzipped (-29%)

## 3. CONFIGURAÇÕES

### vite.config.ts
- Plugin: React SWC
- Alias: `@` → `./src`
- Port: 8080
- ⚠️ Falta: Manual chunks optimization

### tsconfig.json
- ⚠️ `strict: false`
- ⚠️ `noImplicitAny: false`
- 47 usos de `any` no código

## 4. EDGE FUNCTIONS (30)

**Principais:**
- `create-checkout` (Stripe)
- `check-subscription` (3 camadas: cache → DB → Stripe)
- `stripe-webhook` / `mercadopago-webhook`
- `create-order-optimized` (com atomic stock)
- `atomic_reserve_stock()` (SQL function)

## 5. BANCO DE DADOS (45+ tabelas)

**Core:**
- profiles, subscriptions, orders, order_items
- products, categories, product_stock
- pix_transactions, card_transactions

**Controle:**
- stock_reservations, stock_audit_logs
- order_processing_queue, background_jobs

**Integração:**
- delivery_integrations, external_orders
- erp_configurations, erp_sync_logs

**Marketing:**
- coupons, customer_segments, marketing_campaigns
- loyalty_points, loyalty_tiers

**Monitoramento:**
- rum_metrics, error_reports, security_logs

## 6. PROBLEMAS CRÍTICOS

### 🔴 BLOQUEADORES:
1. **Role Escalation** - roles em `profiles.role` (vulnerável)
2. **Realtime Duplicado** - app trava ao mudar status
3. **Sem Rate Limiting** - edge functions expostas

### 🟡 IMPORTANTES:
4. Hooks muito grandes (743 linhas)
5. Bundle não otimizado
6. Mobile quebra em várias telas

## 7. NOTA FINAL: 72/100

**Recomendação:** Parcialmente Apto para Deploy após correções críticas.

**Tempo estimado de correções:** 2-3 semanas

---

**Relatório completo em:** `report/AUDITORIA_TECNICA_COMPLETA.md`
