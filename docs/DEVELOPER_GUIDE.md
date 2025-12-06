# 🛠️ Guia de Desenvolvimento

> **Guia completo para desenvolvedores trabalhando no Pizza Prime**

---

## 📂 Estrutura do Projeto

### Convenções de Nomenclatura

#### Arquivos e Pastas
- **Componentes:** PascalCase (`MenuCard.tsx`, `ProductCustomizer.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useAuth.tsx`, `useMenuOptimized.tsx`)
- **Utilities:** camelCase (`validation.ts`, `formatting.ts`)
- **Pages:** PascalCase (`Menu.tsx`, `Checkout.tsx`)
- **Types:** camelCase para exports (`index.ts` exporta tipos nomeados)

#### Código
- **Constantes:** UPPER_SNAKE_CASE (`CACHE_STRATEGIES`, `QUERY_KEYS`)
- **Funções:** camelCase (`fetchOrders`, `validateCPF`)
- **Interfaces/Types:** PascalCase (`User`, `OrderStatus`, `CacheStrategy`)
- **Enums:** PascalCase com valores UPPER_SNAKE_CASE

### Organização de Imports

```typescript
// 1. Externos (React, bibliotecas)
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// 2. Internos com alias @/
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';

// 3. Types
import type { User, Order } from '@/types';

// 4. Estilos (se necessário)
import './styles.css';
```

---

## 🎨 Design System

### Tokens Semânticos

**NUNCA use cores diretas!** Sempre use tokens do `index.css`:

```typescript
// ❌ ERRADO
<div className="bg-white text-black" />
<div className="text-[#000000]" />

// ✅ CORRETO
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
```

**Tokens disponíveis:**
- `background` / `foreground` - Cor base da página
- `card` / `card-foreground` - Cards e containers
- `primary` / `primary-foreground` - Botões e ações principais
- `secondary` / `secondary-foreground` - Ações secundárias
- `muted` / `muted-foreground` - Texto e backgrounds sutis
- `accent` / `accent-foreground` - Destaques
- `destructive` / `destructive-foreground` - Ações destrutivas
- `border` - Bordas
- `input` - Inputs de formulário
- `ring` - Focus rings

### Componentes UI (Shadcn)

```typescript
// Importar componentes Shadcn
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

// Usar variantes
<Button variant="default">Primário</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Deletar</Button>
```

---

## 🗄️ Data Fetching & Cache

### Cache Strategies

O sistema usa estratégias centralizadas em `queryCacheMapping.ts`:

```typescript
import { applyStrategy } from '@/config/queryCacheMapping';

// Aplicar strategy por domínio
const { data, isLoading } = useQuery({
  queryKey: ['orders'],
  queryFn: fetchOrders,
  ...applyStrategy('orders'), // ✅ Aplica REALTIME strategy automaticamente
});
```

**Domínios e Strategies:**

| Domínio | Strategy | Stale Time | GC Time | Refetch |
|---------|----------|------------|---------|---------|
| `categories` | STATIC | 24h | 48h | Nunca |
| `subcategories` | STATIC | 24h | 48h | Nunca |
| `products` | DYNAMIC | 5min | 10min | onMount |
| `orders` | REALTIME | 30s | 1min | Agressivo |
| `stock` | CRITICAL | 30s | 1min | Sempre |
| `subscription` | SEMI_STATIC | 1h | 2h | onMount |
| `userProfile` | SEMI_STATIC | 1h | 2h | onMount |

### Query Keys

Use constantes de `services/supabase.ts`:

```typescript
import { QUERY_KEYS } from '@/services/supabase';

// ✅ CORRETO
useQuery({ queryKey: QUERY_KEYS.ORDERS });
useQuery({ queryKey: QUERY_KEYS.PRODUCT('123') });

// ❌ ERRADO
useQuery({ queryKey: ['orders'] }); // Hard-coded
```

### Invalidação de Cache

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/supabase';

const queryClient = useQueryClient();

// Invalidar queries específicas
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });

// Invalidar múltiplas queries
queryClient.invalidateQueries({ 
  predicate: (query) => 
    query.queryKey[0] === 'orders' || 
    query.queryKey[0] === 'recent-orders' 
});

// Forçar refetch imediato
queryClient.refetchQueries({ queryKey: QUERY_KEYS.ORDERS });
```

---

## 📡 Realtime Subscriptions

### Usar Hooks Unificados

```typescript
import { useOrdersRealtime } from '@/services/realtime';

// Em componente React (auto cleanup)
const MyComponent = () => {
  useOrdersRealtime((payload) => {
    console.log('Order update:', payload);
    toast.success('Pedido atualizado!');
  });

  return <div>...</div>;
};
```

### API Funcional (uso avançado)

```typescript
import { subscribeToOrders, realtimeService } from '@/services/realtime';

// Criar subscrição manual
const unsubscribe = subscribeToOrders((payload) => {
  console.log('Order update:', payload);
});

// Cleanup manual (não esqueça!)
unsubscribe();

// Ver estatísticas
console.log(realtimeService.getStats());
```

### Canais Disponíveis

- `useOrdersRealtime(callback)` - Pedidos
- `useProductsRealtime(callback)` - Produtos
- `useSubscriptionsRealtime(callback)` - Assinaturas

---

## ⚡ Edge Functions

### Estrutura

```
supabase/functions/
├── _shared/              # Código compartilhado
│   ├── rate-limiter.ts   # Rate limiting
│   └── secure-logger.ts  # Logs seguros
└── my-function/
    └── index.ts          # Ponto de entrada
```

### Template Base

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Lógica da função
    const { data } = await req.json();
    
    // Processar...
    const result = { success: true };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### Rate Limiting

```typescript
import { RateLimiter } from '../_shared/rate-limiter.ts';

const limiter = new RateLimiter();

// Verificar limite (10 req/min)
await limiter.checkLimit(user.id, 'my-function', 10);
```

### Chamar Edge Function

```typescript
import { supabase } from '@/integrations/supabase/client';

// ✅ CORRETO - Usar invoke
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { userId: '123', action: 'update' },
});

// ❌ ERRADO - Não usar fetch direto
// fetch('/api/my-function') - NÃO FUNCIONA
```

### Deploy

```bash
# Login Supabase
supabase login

# Link projeto
supabase link --project-ref xpgsfovrxguphlvncgwn

# Deploy todas as funções
supabase functions deploy

# Deploy função específica
supabase functions deploy my-function

# Ver logs em tempo real
supabase functions logs my-function --tail
```

### Fazer Função Pública

Para não exigir autenticação, edite `supabase/config.toml`:

```toml
[functions.my-function]
verify_jwt = false
```

---

## 🧪 Testes

### Unit Test (Hooks)

```typescript
// src/hooks/__tests__/useMyHook.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/utils/testUtils';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should fetch data', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### Unit Test (Utils)

```typescript
// src/utils/__tests__/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myUtil } from '../myUtil';

describe('myUtil', () => {
  it('should process input correctly', () => {
    const result = myUtil('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myUtil('')).toBe('');
    expect(myUtil(null)).toBe(null);
  });
});
```

### E2E Test

```typescript
// e2e/my-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete user journey', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verificar redirecionamento
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

### Rodar Testes

```bash
# Unit tests (watch mode)
npm run test

# Unit tests com UI
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E com UI (debug)
npx playwright test --ui
```

---

## 🔒 Segurança

### Verificar Role

```typescript
import { useRole } from '@/hooks/useRole';

const MyComponent = () => {
  const { isAdmin, hasRole, hasAnyRole } = useRole();

  if (!isAdmin) {
    return <div>Acesso negado</div>;
  }

  // Verificar role específica
  if (hasRole('attendant')) {
    // Lógica para atendente
  }

  // Verificar múltiplas roles
  if (hasAnyRole(['admin', 'seller'])) {
    // Lógica para admin OU seller
  }

  return <div>Área admin</div>;
};
```

### Validação de Inputs

```typescript
import { z } from 'zod';

// Definir schema
const orderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1).max(100),
  })).min(1),
  payment_method: z.enum(['pix', 'card', 'cash']),
  total: z.number().positive(),
});

// Validar
try {
  const validated = orderSchema.parse(orderData);
  // Usar validated...
} catch (error) {
  console.error('Validação falhou:', error);
  toast.error('Dados inválidos');
}
```

### Storage Seguro

```typescript
import { secureStorage } from '@/utils/secureStorage';

// Salvar dados criptografados
await secureStorage.setItem('sensitive-data', { cpf: '123.456.789-00' });

// Recuperar dados
const data = await secureStorage.getItem('sensitive-data');

// Remover
await secureStorage.removeItem('sensitive-data');
```

---

## 🐛 Troubleshooting

### Cache não está atualizando

```typescript
// Solução 1: Invalidar queries
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['orders'] });

// Solução 2: Usar strategy REALTIME
import { applyStrategy } from '@/config/queryCacheMapping';
useQuery({
  queryKey: ['orders'],
  queryFn: fetchOrders,
  ...applyStrategy('orders'), // Usa REALTIME strategy
});

// Solução 3: Desabilitar cache temporariamente
useQuery({
  queryKey: ['orders'],
  queryFn: fetchOrders,
  staleTime: 0,
  gcTime: 0,
});
```

### Realtime não conecta

```typescript
// Verificar status do serviço
import { realtimeService } from '@/services/realtime';

console.log('Stats:', realtimeService.getStats());
// Output: { activeChannels: 2, totalMessages: 45 }

// Forçar reconexão
realtimeService.reconnect();
```

### Rate Limit atingido

```sql
-- Ver rate limits no banco
SELECT * FROM rate_limits 
WHERE user_id = 'xxx' 
ORDER BY last_request DESC;

-- Resetar rate limit (apenas dev/test)
DELETE FROM rate_limits WHERE user_id = 'xxx';
```

### Edge Function com erro

```bash
# Ver logs em tempo real
supabase functions logs my-function --tail

# Ver logs específicos de erro
supabase functions logs my-function | grep ERROR

# Testar localmente
supabase functions serve my-function
```

### Build falhando

```bash
# Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar dependências
rm -rf node_modules
npm install

# Build novamente
npm run build
```

---

## 🚀 Deploy Checklist

### Pré-Deploy

- [ ] Testes passando (`npm run test:coverage`)
- [ ] E2E passando (`npm run test:e2e`)
- [ ] Build bem-sucedido (`npm run build`)
- [ ] Sem console.logs desnecessários
- [ ] Variáveis de ambiente configuradas
- [ ] Edge Functions deployadas
- [ ] Migrações aplicadas

### Performance

- [ ] Bundle size < 600KB gzipped
- [ ] Images otimizadas (WebP, lazy loading)
- [ ] Code splitting configurado
- [ ] Cache strategies aplicadas
- [ ] Memoization em componentes pesados
- [ ] Virtualization em listas grandes

### Segurança

- [ ] RLS policies em todas as tabelas
- [ ] Rate limiting em Edge Functions públicas
- [ ] Validação de inputs (frontend + backend)
- [ ] Dados sensíveis criptografados
- [ ] Secrets não commitados
- [ ] CORS configurado corretamente

### Pós-Deploy

- [ ] Testar fluxo completo em produção
- [ ] Monitorar logs de Edge Functions
- [ ] Verificar métricas de performance
- [ ] Testar em dispositivos móveis
- [ ] Verificar funcionamento do Realtime

---

## 📞 Recursos

- **Documentação Lovable:** https://docs.lovable.dev/
- **Supabase Docs:** https://supabase.com/docs
- **TanStack Query:** https://tanstack.com/query/latest
- **Shadcn/UI:** https://ui.shadcn.com/
- **Discord:** https://discord.com/channels/1119885301872070706/1280461670979993613

---

**Última atualização:** 2025-11-07
