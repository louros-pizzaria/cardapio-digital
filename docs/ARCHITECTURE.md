# 🏗️ Arquitetura do Sistema

> **Visão completa da arquitetura do Pizza Prime**

---

## 📊 Visão Geral

```mermaid
graph TB
    Client[Cliente Web/Mobile]
    
    subgraph "Frontend React"
        React[React 18 + TypeScript]
        TQ[TanStack Query<br/>Cache Layer]
        Zustand[Zustand<br/>Cart State]
        RT[Realtime Service<br/>WebSockets]
    end
    
    subgraph "Supabase Cloud"
        Auth[Auth Service<br/>JWT Tokens]
        DB[(PostgreSQL 15<br/>45+ Tables)]
        Realtime[Realtime Server<br/>WebSocket Pub/Sub]
        EF[Edge Functions<br/>30 Serverless]
        Storage[Storage<br/>Images/Files]
    end
    
    subgraph "External APIs"
        Stripe[Stripe API<br/>Subscriptions]
        MP[Mercado Pago<br/>PIX]
        Delivery[Delivery APIs<br/>iFood, Rappi]
        ERP[ERP Systems]
    end
    
    Client --> React
    React --> TQ
    React --> Zustand
    React --> RT
    TQ --> EF
    TQ --> DB
    RT --> Realtime
    EF --> DB
    EF --> Auth
    EF --> Storage
    EF --> Stripe
    EF --> MP
    EF --> Delivery
    EF --> ERP
    Realtime --> DB
    Auth --> DB
```

---

## 🔄 Fluxo de Pedido Completo

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend<br/>(React)
    participant C as Cache<br/>(TanStack Query)
    participant EF as Edge Function<br/>(create-order)
    participant DB as Database<br/>(PostgreSQL)
    participant RT as Realtime<br/>(WebSocket)
    participant Admin as Admin Panel
    
    U->>F: Adiciona produtos ao carrinho
    F->>C: Busca produtos do cache
    C-->>F: Retorna produtos (staleTime: 5min)
    
    U->>F: Finaliza pedido
    F->>F: Validação local (items, total, address)
    F->>EF: POST /create-order-optimized
    
    EF->>DB: Verifica assinatura ativa
    DB-->>EF: Subscription OK
    
    EF->>DB: CALL atomic_reserve_stock(items)
    alt Estoque disponível
        DB-->>EF: Stock reservado ✅
        EF->>DB: INSERT INTO orders
        EF->>DB: INSERT INTO order_items
        DB->>RT: NOTIFY order_created
        RT-->>F: Broadcast: novo pedido
        RT-->>Admin: Broadcast: novo pedido
        EF-->>F: {orderId, status: 'pending'}
        F-->>U: Pedido confirmado! 🎉
    else Estoque insuficiente
        DB-->>EF: Error: insufficient stock ❌
        EF-->>F: {error: 'Estoque insuficiente'}
        F-->>U: Produto sem estoque
    end
    
    Admin->>DB: UPDATE order status = 'confirmed'
    DB->>RT: NOTIFY order_updated
    RT-->>F: Broadcast: pedido confirmado
    F-->>U: Notificação: "Pedido confirmado!"
```

---

## 💾 Estratégia de Cache (3 Camadas)

```mermaid
graph LR
    Query[React Query<br/>Request]
    
    subgraph "Cache Layer 1 - Memory"
        TQ[TanStack Query<br/>In-Memory Cache]
    end
    
    subgraph "Cache Layer 2 - Browser"
        LS[LocalStorage<br/>Persistent Cache]
        SW[Service Worker<br/>Offline Support]
    end
    
    subgraph "Cache Layer 3 - Backend"
        CDN[Supabase CDN<br/>Static Assets]
        DB[(Database<br/>Source of Truth)]
    end
    
    Query --> TQ
    TQ -->|Cache Miss| LS
    LS -->|Cache Miss| SW
    SW -->|Cache Miss| CDN
    CDN --> DB
    
    TQ -->|Cache Hit| Return[Return Data]
    LS -->|Cache Hit| Return
    SW -->|Cache Hit| Return
```

### Cache Strategies por Domínio

| Domínio | Strategy | Stale Time | GC Time | Refetch on Mount | Refetch on Window Focus |
|---------|----------|------------|---------|------------------|-------------------------|
| **categories** | STATIC | 24h | 48h | ❌ | ❌ |
| **subcategories** | STATIC | 24h | 48h | ❌ | ❌ |
| **products** | DYNAMIC | 5min | 10min | ✅ | ❌ |
| **orders** | REALTIME | 30s | 1min | ✅ | ✅ |
| **stock** | CRITICAL | 30s | 1min | ✅ | ✅ |
| **subscription** | SEMI_STATIC | 1h | 2h | ✅ | ❌ |
| **userProfile** | SEMI_STATIC | 1h | 2h | ✅ | ❌ |

**Implementação:**
```typescript
// src/config/queryCacheMapping.ts
import { applyStrategy } from '@/config/queryCacheMapping';

useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  ...applyStrategy('products'), // Aplica DYNAMIC strategy automaticamente
});
```

---

## 🔐 Segurança de Roles (RLS + Security Definer)

```mermaid
graph TD
    User[Usuário faz request]
    
    subgraph "Frontend"
        Check[useRole hook<br/>verifica role localmente]
    end
    
    subgraph "Database (RLS Enabled)"
        RLS[RLS Policy<br/>WHERE clause]
        Func[has_role function<br/>SECURITY DEFINER]
        Table[(user_roles table)]
    end
    
    User --> Check
    Check -->|API Request| RLS
    RLS --> Func
    Func --> Table
    Table -->|role = 'admin'| Allow[✅ Query Allowed]
    Table -->|role != 'admin'| Deny[❌ Query Denied]
    
    style Func fill:#90EE90
    style Table fill:#FFD700
```

### Funções Security Definer

```sql
-- has_role: Verifica se usuário tem role específica
CREATE OR REPLACE FUNCTION has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
END;
$$;

-- has_any_role: Verifica se usuário tem qualquer das roles
CREATE OR REPLACE FUNCTION has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
  );
END;
$$;
```

### RLS Policies Exemplo

```sql
-- Apenas admins podem ver todos os pedidos
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (has_role('admin'));

-- Clientes veem apenas seus pedidos
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (user_id = auth.uid());

-- Atendentes podem atualizar status
CREATE POLICY "Attendants can update order status"
ON orders FOR UPDATE
USING (has_any_role(ARRAY['admin', 'attendant']));
```

---

## 📡 Realtime Architecture (Singleton Pattern)

```mermaid
graph TB
    subgraph "Frontend Components"
        C1[OrdersPage]
        C2[AdminDashboard]
        C3[OrderStatusWidget]
    end
    
    subgraph "Unified Realtime Service (Singleton)"
        Service[RealtimeService<br/>Single Instance]
        Channel1[orders-channel]
        Channel2[products-channel]
        Channel3[subscriptions-channel]
    end
    
    subgraph "Supabase Realtime"
        RT[Realtime Server<br/>WebSocket]
        DB[(Database<br/>NOTIFY events)]
    end
    
    C1 --> Service
    C2 --> Service
    C3 --> Service
    
    Service --> Channel1
    Service --> Channel2
    Service --> Channel3
    
    Channel1 --> RT
    Channel2 --> RT
    Channel3 --> RT
    
    RT --> DB
    
    DB -->|INSERT/UPDATE/DELETE| RT
    RT -->|Broadcast| Channel1
    RT -->|Broadcast| Channel2
    RT -->|Broadcast| Channel3
```

### Uso no Frontend

```typescript
// src/services/realtime.ts
import { useOrdersRealtime } from '@/services/realtime';

// Hook auto-cleanup
const MyComponent = () => {
  useOrdersRealtime((payload) => {
    console.log('Order update:', payload);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  });

  return <div>...</div>;
};
```

---

## 🛠️ Stack Tecnológico

### Frontend

```mermaid
graph LR
    subgraph "UI Layer"
        React[React 18]
        TS[TypeScript 5]
        Tailwind[TailwindCSS]
        Shadcn[Shadcn/UI]
        Radix[Radix UI]
    end
    
    subgraph "State Management"
        TQ[TanStack Query<br/>Server State]
        Zustand[Zustand<br/>Client State]
    end
    
    subgraph "Build Tools"
        Vite[Vite<br/>Dev Server & Build]
        Terser[Terser<br/>Minification]
    end
    
    subgraph "Testing"
        Vitest[Vitest<br/>Unit Tests]
        Playwright[Playwright<br/>E2E Tests]
        RTL[Testing Library<br/>Component Tests]
    end
```

**Versões:**
- React: 18.3.1
- TypeScript: 5.x
- Vite: Latest
- TanStack Query: 5.56.2
- Zustand: 5.0.5
- Vitest: 4.0.4
- Playwright: 1.56.1

### Backend

```mermaid
graph TB
    subgraph "Supabase Services"
        Auth[Auth Service<br/>JWT + Row Level Security]
        DB[(PostgreSQL 15<br/>45+ Tables)]
        Realtime[Realtime<br/>WebSocket Pub/Sub]
        Storage[Storage<br/>S3-compatible]
        EF[Edge Functions<br/>Deno Runtime]
    end
    
    subgraph "Database Features"
        RLS[Row Level Security<br/>Fine-grained permissions]
        Triggers[Triggers & Functions<br/>Business logic]
        Indexes[Indexes<br/>Performance]
    end
    
    Auth --> DB
    RLS --> DB
    Triggers --> DB
    Indexes --> DB
```

**Características:**
- PostgreSQL 15 com RLS habilitado
- 30 Edge Functions (Deno runtime)
- Realtime via WebSocket (broadcasting automático)
- Storage com CDN integrado
- Auth com JWT tokens (refresh automático)

---

## 📦 Bundle Optimization

### Code Splitting Strategy

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          
          // Feature chunks
          'admin': [
            './src/pages/admin/Dashboard.tsx',
            './src/components/AdminOrdersTable.tsx',
          ],
          'checkout': [
            './src/pages/Checkout.tsx',
            './src/pages/Payment.tsx',
          ],
        },
      },
    },
  },
});
```

### Lazy Loading

```typescript
// Lazy load de páginas
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Checkout = lazy(() => import('@/pages/Checkout'));

// Lazy load de componentes pesados
const AdminOrdersTable = lazy(() => import('@/components/AdminOrdersTable'));
```

### Bundle Size

| Chunk | Size (gzipped) | Description |
|-------|----------------|-------------|
| **vendor-react** | ~140KB | React core |
| **vendor-query** | ~50KB | TanStack Query |
| **vendor-ui** | ~80KB | Radix UI components |
| **main** | ~150KB | App core + routing |
| **admin** | ~100KB | Admin features |
| **Total** | **~520KB** | Total bundle size |

---

## 🔍 Monitoramento e Observabilidade

### Real User Monitoring (RUM)

```mermaid
graph LR
    Browser[Browser<br/>Web Vitals API]
    
    subgraph "Frontend"
        Collector[RUM Collector<br/>Performance Observer]
    end
    
    subgraph "Backend"
        EF[store-rum-metrics<br/>Edge Function]
        DB[(rum_metrics table)]
    end
    
    subgraph "Analytics"
        Dashboard[Performance Dashboard<br/>Visualização]
    end
    
    Browser --> Collector
    Collector --> EF
    EF --> DB
    DB --> Dashboard
```

**Métricas coletadas:**
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **TTFB** (Time to First Byte)

### Error Tracking

```typescript
// src/utils/errorReporting.ts
const reportError = async (error: Error) => {
  await supabase.functions.invoke('store-error-reports', {
    body: {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
  });
};
```

---

## 🗄️ Database Schema (Simplificado)

### Principais Tabelas

```mermaid
erDiagram
    profiles ||--o{ user_roles : has
    profiles ||--o{ orders : creates
    profiles ||--o{ subscriptions : has
    orders ||--|{ order_items : contains
    orders ||--|| addresses : delivered_to
    order_items }|--|| products : references
    products ||--|| categories : belongs_to
    products ||--o| product_stock : has
    
    profiles {
        uuid id PK
        string email
        string full_name
        string phone
        string cpf
        timestamp created_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        enum role
        timestamp created_at
    }
    
    orders {
        uuid id PK
        uuid user_id FK
        decimal total
        enum status
        enum payment_method
        timestamp created_at
    }
    
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    
    products {
        uuid id PK
        uuid category_id FK
        string name
        decimal price
        text description
        boolean active
    }
    
    subscriptions {
        uuid id PK
        uuid user_id FK
        string stripe_subscription_id
        enum status
        timestamp expires_at
    }
```

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Local Dev<br/>npm run dev]
        Git[Git Repository<br/>Version Control]
    end
    
    subgraph "CI/CD Pipeline (Optional)"
        GHA[GitHub Actions<br/>Automated Tests]
        Build[Build Process<br/>npm run build]
    end
    
    subgraph "Production"
        Lovable[Lovable Platform<br/>Frontend Hosting]
        Supabase[Supabase Cloud<br/>Backend Services]
    end
    
    subgraph "Edge Locations"
        CDN[Global CDN<br/>Static Assets]
        Edge[Edge Functions<br/>Distributed Compute]
    end
    
    Dev --> Git
    Git --> GHA
    GHA --> Build
    Build --> Lovable
    Lovable --> CDN
    Supabase --> Edge
```

---

## 📈 Escalabilidade

### Horizontal Scaling

- **Frontend:** CDN global (Lovable/Vercel)
- **Backend:** Edge Functions auto-scaling (Deno Deploy)
- **Database:** Supabase auto-scaling (connection pooling)
- **Realtime:** WebSocket connections balanceadas

### Performance Targets

| Métrica | Target | Atual |
|---------|--------|-------|
| **First Load** | < 2s | ~1.8s |
| **Time to Interactive** | < 3s | ~2.5s |
| **Bundle Size** | < 600KB | ~520KB |
| **API Response** | < 200ms | ~150ms |
| **Realtime Latency** | < 100ms | ~80ms |

---

## 🔄 CI/CD Pipeline (Exemplo)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright install
      - run: npm run test:e2e
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: echo "Build size:" && du -sh dist
```

---

**Última atualização:** 2025-11-07
