# 🧪 PLANO DE TESTES - SISTEMA DE ASSINATURA

## 🎯 OBJETIVOS DOS TESTES
Garantir que o sistema de verificação de assinatura funcione de forma consistente e segura após as correções implementadas.

---

## 📋 TESTES MANUAIS CRÍTICOS

### 1. TESTE DE PROTEÇÃO DE ROTAS

#### 1.1 Usuário SEM Assinatura Ativa
**Pré-requisitos:**
- Usuário cadastrado no sistema
- Assinatura expirada ou inexistente
- Browser limpo (cache/localStorage)

**Passos:**
1. Fazer login com usuário sem assinatura
2. Tentar acessar diretamente cada URL:
   - `http://localhost:3000/menu`
   - `http://localhost:3000/checkout`
   - `http://localhost:3000/orders`
   - `http://localhost:3000/payment`
   - `http://localhost:3000/order-status/123`

**Resultado Esperado:**
- ✅ Todas devem redirecionar para `/plans`
- ✅ Console deve mostrar log: "Redirecting to plans - accessing protected route without subscription"

#### 1.2 Usuário COM Assinatura Ativa
**Pré-requisitos:**
- Usuário com assinatura válida no Stripe
- Assinatura sincronizada no banco

**Passos:**
1. Fazer login com usuário assinante
2. Acessar todas as rotas protegidas
3. Verificar funcionalidade completa

**Resultado Esperado:**
- ✅ Acesso liberado a todas as rotas
- ✅ Menu carrega completamente
- ✅ Checkout funciona

### 2. TESTE DE CACHE E SESSÃO

#### 2.1 Troca de Usuários
**Cenário:** Testar vazamento de cache entre usuários diferentes

**Passos:**
1. Login com Usuário A (COM assinatura)
2. Navegar pelo menu, gerar cache
3. Logout completo
4. Login com Usuário B (SEM assinatura)
5. Tentar acessar `/menu`

**Resultado Esperado:**
- ✅ Usuário B deve ser bloqueado (redirect para `/plans`)
- ✅ Não deve herdar cache do Usuário A
- ✅ localStorage deve estar limpo

#### 2.2 Expiração Durante Sessão Ativa
**Cenário:** Assinatura expira enquanto usuário está usando o sistema

**Passos:**
1. Login com usuário COM assinatura
2. Acessar `/menu` (sucesso)
3. Simular expiração: Cancelar assinatura no Stripe Dashboard
4. Aguardar webhook processar (30 segundos)
5. Tentar navegar para outra rota protegida ou recarregar página

**Resultado Esperado:**
- ✅ Acesso deve ser bloqueado após webhook processar
- ✅ Redirect para `/plans`

### 3. TESTE DE WEBHOOK STRIPE

#### 3.1 Ativação de Assinatura
**Passos:**
1. Usuário sem assinatura faz checkout via Stripe
2. Completar pagamento no ambiente de teste
3. Aguardar webhook `customer.subscription.created`
4. Verificar atualização no banco de dados

**Verificações:**
```sql
SELECT 
  user_id, 
  status, 
  stripe_subscription_id, 
  sync_status,
  last_webhook_event 
FROM subscriptions 
WHERE user_id = '<USER_ID>';
```

**Resultado Esperado:**
- ✅ `status = 'active'`
- ✅ `sync_status = 'webhook'`
- ✅ `stripe_subscription_id` preenchido
- ✅ `last_webhook_event = 'customer.subscription.created'`

#### 3.2 Cancelamento de Assinatura
**Passos:**
1. Cancelar assinatura no Stripe Dashboard
2. Verificar webhook `customer.subscription.deleted`
3. Verificar atualização no banco

**Resultado Esperado:**
- ✅ `status = 'inactive'` ou `'cancelled'`
- ✅ `last_webhook_event = 'customer.subscription.deleted'`

---

## 🔍 TESTES AUTOMATIZADOS SUGERIDOS

### 4. TESTES DE INTEGRAÇÃO (Edge Functions)

#### 4.1 Teste da Edge Function `check-subscription`
```javascript
// Teste usando Postman ou similar
POST https://xpgsfovrxguphlvncgwn.supabase.co/functions/v1/check-subscription
Headers:
  Authorization: Bearer <USER_JWT_TOKEN>
  apikey: <SUPABASE_ANON_KEY>

// Casos de teste:
// 1. Usuário com assinatura ativa
// 2. Usuário sem assinatura
// 3. Token inválido
// 4. Assinatura expirada
```

**Verificar respostas:**
```json
// Assinatura ativa
{
  "subscribed": true,
  "status": "active",
  "plan_name": "Anual",
  "plan_price": 99.90,
  "expires_at": "2026-08-14T10:10:11.000Z"
}

// Sem assinatura
{
  "subscribed": false,
  "status": "inactive",
  "plan_name": "Nenhum",
  "plan_price": 0
}
```

### 5. SCRIPTS DE VALIDAÇÃO SQL

#### 5.1 Verificar Inconsistências no Banco
```sql
-- Script para identificar inconsistências
SELECT 
  p.email,
  s.status,
  s.expires_at,
  s.sync_status,
  s.stripe_subscription_id,
  CASE 
    WHEN s.expires_at < NOW() AND s.status = 'active' THEN 'CRÍTICO: Expirada mas ativa'
    WHEN s.stripe_subscription_id IS NULL AND s.status = 'active' THEN 'ALTO: Ativa sem Stripe ID'
    WHEN s.sync_status = 'manual' AND s.updated_at < NOW() - INTERVAL '1 day' THEN 'MÉDIO: Manual desatualizada'
    ELSE 'OK'
  END as problema
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE s.id IS NOT NULL
  AND problema != 'OK'
ORDER BY 
  CASE problema
    WHEN 'CRÍTICO: Expirada mas ativa' THEN 1
    WHEN 'ALTO: Ativa sem Stripe ID' THEN 2
    WHEN 'MÉDIO: Manual desatualizada' THEN 3
  END;
```

#### 5.2 Limpar Cache de Desenvolvimento
```sql
-- Script para resetar estado de teste
UPDATE subscriptions 
SET sync_status = 'manual' 
WHERE sync_status = 'pending' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Remover registros órfãos (sem stripe_subscription_id)
DELETE FROM subscriptions 
WHERE status IN ('pending', 'inactive') 
  AND stripe_subscription_id IS NULL 
  AND created_at < NOW() - INTERVAL '1 day';
```

---

## 📊 CRITÉRIOS DE ACEITAÇÃO

### ✅ TESTES DEVEM PASSAR 100%

#### Proteção de Rotas:
- [ ] Usuário sem assinatura é bloqueado em TODAS as rotas protegidas
- [ ] Usuário com assinatura acessa normalmente
- [ ] Redirect funciona corretamente

#### Cache e Sessão:
- [ ] Cache é limpo completamente no logout
- [ ] Não há vazamento entre usuários diferentes
- [ ] Expiração é detectada em tempo real

#### Webhooks:
- [ ] Ativação via Stripe reflete no sistema em <30s
- [ ] Cancelamento bloqueia acesso imediatamente
- [ ] Banco de dados é atualizado corretamente

#### Performance:
- [ ] Verificação de assinatura acontece em <2s
- [ ] Cache reduz chamadas à API do Stripe
- [ ] Sistema funciona offline com cache válido

---

## 🚨 TESTES DE SEGURANÇA

### 6. TENTATIVAS DE BYPASS

#### 6.1 Manipulação de localStorage
```javascript
// Tentar no DevTools
localStorage.setItem('subscription_data_fake', JSON.stringify({
  subscribed: true,
  status: 'active',
  plan_name: 'Hacked',
  plan_price: 0
}));
// Recarregar e tentar acessar /menu
```
**Resultado Esperado:** ✅ Bypass deve ser impossível (verificação server-side)

#### 6.2 Token JWT Expirado
**Passos:**
1. Fazer login normalmente
2. Aguardar expiração do JWT (1 hora)
3. Tentar acessar rotas protegidas

**Resultado Esperado:** ✅ Redirect para login

---

## 📋 CHECKLIST FINAL DE VALIDAÇÃO

### Antes de Deploy em Produção:
- [ ] Todos os testes manuais passaram
- [ ] Scripts SQL retornam 0 inconsistências
- [ ] Webhooks testados em ambiente staging
- [ ] Performance validada (< 2s para verificação)
- [ ] Logs não contêm informações sensíveis
- [ ] Cache não vaza entre usuários
- [ ] Todas as edge functions respondem corretamente
- [ ] Fallbacks funcionam se Stripe estiver indisponível

### Monitoramento Pós-Deploy:
- [ ] Configurar alertas para falhas na verificação de assinatura
- [ ] Monitorar tempo de resposta das edge functions
- [ ] Tracking de tentativas de bypass
- [ ] Log de inconsistências Stripe vs DB local

**⚠️ IMPORTANTE:** Executar estes testes em ambiente staging ANTES de aplicar em produção.