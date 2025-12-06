# 🔄 Guia de Migração - Consolidação de Subscription (Fase 2.3)

## 📋 Resumo

A partir da **Fase 2.3**, toda a lógica de subscription foi consolidada em um **único ponto de acesso**: `useSubscriptionContext()`.

**Benefícios:**
- ✅ Cache compartilhado entre todos os componentes
- ✅ Zero requests duplicados ao Supabase
- ✅ Um único canal realtime de sincronização
- ✅ Facilidade de debugging e manutenção

---

## ❌ Padrões Deprecados

### 1. Uso direto de `useSubscription(userId)`

```typescript
// ❌ DEPRECADO - Não usar mais
import { useSubscription } from '@/hooks/useSubscription';

const MyComponent = () => {
  const { user } = useAuth();
  const { isActive, status } = useSubscription(user?.id);
  // ...
};
```

**Problema:** Cria instâncias duplicadas de cache e canais realtime.

---

### 2. Acesso via `useUnifiedAuth().subscription`

```typescript
// ❌ DEPRECADO - Não usar mais
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

const MyComponent = () => {
  const { subscription } = useUnifiedAuth();
  const isActive = subscription.subscribed; // API antiga
  // ...
};
```

**Problema:** Wrapper desnecessário, mantido apenas para compatibilidade temporária.

---

## ✅ Novo Padrão Recomendado

### Use `useSubscriptionContext()` diretamente

```typescript
// ✅ CORRETO - Usar sempre
import { useSubscriptionContext } from '@/providers/SubscriptionProvider';

const MyComponent = () => {
  const { 
    isActive,        // boolean - se subscription está ativa
    status,          // string - status atual ('active', 'trialing', etc.)
    planName,        // string - nome do plano
    planPrice,       // number - preço do plano
    expiresAt,       // string | null - data de expiração
    isLoading,       // boolean - se está carregando
    isError,         // boolean - se houve erro
    refresh,         // () => Promise<void> - forçar atualização
    clearCache,      // () => void - limpar cache
    reconcile,       // () => Promise<void> - reconciliar com Stripe
  } = useSubscriptionContext();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {isActive ? (
        <span>Plano: {planName} - R$ {planPrice}</span>
      ) : (
        <span>Sem assinatura ativa</span>
      )}
    </div>
  );
};
```

---

## 🔄 Tabela de Conversão de API

| Padrão Antigo | Novo Padrão | Tipo |
|---------------|-------------|------|
| `subscription.subscribed` | `isActive` | `boolean` |
| `subscription.status` | `status` | `string` |
| `subscription.plan_name` | `planName` | `string` |
| `subscription.plan_price` | `planPrice` | `number` |
| `subscription.expires_at` | `expiresAt` | `string \| null` |
| `subscription.loading` | `isLoading` | `boolean` |
| `useSubscription(userId).refresh()` | `refresh()` | `() => Promise<void>` |
| `useSubscription(userId).reconcile()` | `reconcile()` | `() => Promise<void>` |

---

## 📝 Exemplos de Migração

### Exemplo 1: Dashboard Component

```typescript
// ANTES (Deprecado)
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

const Dashboard = () => {
  const { subscription } = useUnifiedAuth();
  
  return (
    <div>
      {subscription.subscribed ? (
        <h1>Bem-vindo! Plano: {subscription.plan_name}</h1>
      ) : (
        <h1>Você não tem assinatura ativa</h1>
      )}
    </div>
  );
};

// DEPOIS (Correto)
import { useSubscriptionContext } from '@/providers/SubscriptionProvider';

const Dashboard = () => {
  const { isActive, planName } = useSubscriptionContext();
  
  return (
    <div>
      {isActive ? (
        <h1>Bem-vindo! Plano: {planName}</h1>
      ) : (
        <h1>Você não tem assinatura ativa</h1>
      )}
    </div>
  );
};
```

---

### Exemplo 2: Protected Route

```typescript
// ANTES (Deprecado)
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/auth/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const { isActive, isLoading } = useSubscription(user?.id);
  
  if (isLoading) return <Loading />;
  if (!isActive) return <Navigate to="/plans" />;
  
  return children;
};

// DEPOIS (Correto)
import { useSubscriptionContext } from '@/providers/SubscriptionProvider';

const ProtectedRoute = ({ children }) => {
  const { isActive, isLoading } = useSubscriptionContext();
  
  if (isLoading) return <Loading />;
  if (!isActive) return <Navigate to="/plans" />;
  
  return children;
};
```

---

### Exemplo 3: Reconciliação Manual

```typescript
// ANTES (Deprecado)
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/auth/useAuth';

const SubscriptionDebug = () => {
  const { user } = useAuth();
  const { reconcile, isLoading } = useSubscription(user?.id);
  
  return (
    <button onClick={reconcile} disabled={isLoading}>
      Forçar Reconciliação
    </button>
  );
};

// DEPOIS (Correto)
import { useSubscriptionContext } from '@/providers/SubscriptionProvider';

const SubscriptionDebug = () => {
  const { reconcile, isLoading } = useSubscriptionContext();
  
  return (
    <button onClick={reconcile} disabled={isLoading}>
      Forçar Reconciliação
    </button>
  );
};
```

---

## ⚠️ Avisos Importantes

### 1. Provider obrigatório

Certifique-se que `SubscriptionProvider` está envolvendo sua aplicação:

```typescript
// src/App.tsx ou src/main.tsx
import { SubscriptionProvider } from '@/providers/SubscriptionProvider';

<SubscriptionProvider>
  <YourApp />
</SubscriptionProvider>
```

### 2. Compatibilidade temporária

Os padrões antigos **ainda funcionam** por tempo limitado, mas exibem warnings no console (dev mode):

```
[DEPRECATED] useSubscription is deprecated. Use useSubscriptionContext() instead.
See docs/MIGRATION_SUBSCRIPTION.md for migration guide.
```

### 3. Remoção futura

**Previsão de remoção completa:** Próxima versão major (após validação completa)

Os seguintes serão removidos:
- `useSubscription(userId)` - Hook direto
- `useUnifiedAuth().subscription` - Wrapper de subscription

---

## 🧪 Checklist de Migração

Use este checklist para validar sua migração:

- [ ] Substituir `useSubscription(userId)` por `useSubscriptionContext()`
- [ ] Substituir `useUnifiedAuth().subscription` por `useSubscriptionContext()`
- [ ] Atualizar propriedades:
  - [ ] `subscription.subscribed` → `isActive`
  - [ ] `subscription.plan_name` → `planName`
  - [ ] `subscription.plan_price` → `planPrice`
  - [ ] `subscription.loading` → `isLoading`
- [ ] Remover imports de `useSubscription` se não usado
- [ ] Testar fluxo completo:
  - [ ] Login → Verificar subscription carrega
  - [ ] Navegação entre rotas → Cache compartilhado
  - [ ] Webhook de cancelamento → Bloqueia todos componentes
  - [ ] Reconciliação manual → Funciona corretamente

---

## 🆘 Problemas Comuns

### Erro: "useSubscriptionContext must be used within SubscriptionProvider"

**Causa:** Componente não está dentro do `SubscriptionProvider`.

**Solução:** Verifique que o provider está corretamente configurado em `App.tsx`:

```typescript
import { SubscriptionProvider } from '@/providers/SubscriptionProvider';

<AuthProvider>
  <SubscriptionProvider>  {/* ← Deve estar aqui */}
    <Router>
      <Routes />
    </Router>
  </SubscriptionProvider>
</AuthProvider>
```

---

### Subscription sempre retorna `isActive: false`

**Causa:** Possível divergência entre Stripe e banco local.

**Solução:** Use reconciliação manual:

```typescript
const { reconcile } = useSubscriptionContext();
await reconcile(); // Sincroniza com Stripe
```

Ou acesse `/subscription-debug` para análise completa.

---

## 📚 Recursos Adicionais

- **Documentação do Provider:** `src/providers/SubscriptionProvider.tsx`
- **Hook Interno:** `src/hooks/useSubscription.tsx` (para referência apenas)
- **Debug Page:** `/subscription-debug` - Ferramenta de diagnóstico completa
- **Edge Functions:**
  - `reconcile-subscription` - Sincronização com Stripe
  - `check-subscription` - Verificação de status

---

## 📊 Impacto Esperado

Após migração completa:

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Requests duplicados | 3x por load | 1x por load | **-66%** |
| Canais realtime | 3 canais | 1 canal | **-66%** |
| Cache consistency | Baixa | Alta | **+100%** |
| Memory usage | ~45KB | ~15KB | **-66%** |

---

**Última atualização:** Fase 2.3 - Janeiro 2025  
**Versão:** 1.0.0
