# 🍕 Pizza Prime - Cardápio Digital com Assinatura

Sistema completo de pedidos online com assinatura mensal via Stripe/Mercado Pago.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Shadcn/UI + TailwindCSS + Radix UI
- **Backend:** Supabase (Postgres + Realtime + Edge Functions)
- **State Management:** TanStack Query + Zustand
- **Pagamentos:** Stripe + Mercado Pago + PIX
- **Testes:** Vitest + Playwright + Testing Library

## 📦 Instalação

```bash
npm install
cp .env.example .env
npm run dev
```

## 🧪 Testes

```bash
npm run test              # Unit tests
npm run test:ui           # UI mode
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
```

## 🏗️ Arquitetura

### Estrutura Principal
- `src/components/` - 110+ componentes React
- `src/hooks/` - 42 custom hooks
- `src/pages/` - 33 páginas
- `supabase/functions/` - 30 Edge Functions

### Fluxos Principais
1. **Autenticação** → `useUnifiedAuth` + `useRole`
2. **Assinatura** → `useSubscription` (3-layer cache)
3. **Pedidos** → `create-order-optimized` + atomic stock
4. **Realtime** → `UnifiedRealtimeService` (singleton)

## 📚 Documentação

- [Guia de Desenvolvimento](docs/DEVELOPER_GUIDE.md)
- [Arquitetura do Sistema](docs/ARCHITECTURE.md)
- [Edge Functions](docs/EDGE_FUNCTIONS.md)
- [Testes - Fase 4](docs/FASE4_TESTES.md)

## 🔒 Segurança

- ✅ Roles via `user_roles` (security definer)
- ✅ Rate limiting em Edge Functions
- ✅ Criptografia AES-256-GCM
- ✅ RLS policies em todas as tabelas

## ⚡ Performance

- Bundle: ~520KB gzipped
- Cache strategies por domínio
- Lazy loading de rotas
- Virtualization em listas

## 🎯 Roadmap

- [x] Fase 1 - Correções Críticas
- [x] Fase 2 - Refatoração Estrutural
- [x] Fase 3 - Performance
- [x] Fase 4 - Testes (60%+ coverage)
- [x] Fase 5 - Documentação

## 🚀 Deploy

```bash
npm run test:coverage && npm run test:e2e
npm run build
# Publicar via Lovable
```

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)**
