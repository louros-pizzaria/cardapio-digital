# ⚡ Edge Functions - Documentação Completa

> **30 Edge Functions implementadas no sistema Pizza Prime**

---

## 📋 Índice por Categoria

- [Autenticação e Roles](#autenticação-e-roles)
- [Assinatura (Subscription)](#assinatura-subscription)
- [Pedidos (Orders)](#pedidos-orders)
- [Pagamentos](#pagamentos)
- [Integrações](#integrações)
- [Background Jobs](#background-jobs)
- [Monitoramento](#monitoramento)
- [AI/ML](#aiml)
- [Outros](#outros)

---

## Autenticação e Roles

### `admin-role-update`

**Descrição:** Atualiza a role de um usuário (somente admin).

**Método:** POST  
**Autenticação:** Requerida (Admin)  
**Rate Limit:** 10 req/min

**Body:**
```json
{
  "userId": "uuid",
  "newRole": "admin" | "attendant" | "customer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role atualizada com sucesso"
}
```

**Uso no Frontend:**
```typescript
const { data, error } = await supabase.functions.invoke('admin-role-update', {
  body: { userId: '123', newRole: 'attendant' }
});
```

---

## Assinatura (Subscription)

### `check-subscription`

**Descrição:** Verifica status de assinatura com cache em 3 camadas (Memory → Local Storage → Stripe API).

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 10 req/min

**Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "isActive": true,
  "status": "active",
  "planName": "Pro",
  "planPrice": 29.90,
  "expiresAt": "2025-12-31T23:59:59Z",
  "stripeSubscriptionId": "sub_xxx"
}
```

**Cache Strategy:**
1. **Memory Cache:** 5 minutos
2. **Database Cache:** 30 minutos
3. **Stripe API:** Fallback se cache expirado

---

### `reconcile-subscription`

**Descrição:** Reconcilia dados de assinatura entre Stripe e Supabase.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

**Body:**
```json
{
  "userId": "uuid",
  "force": false
}
```

**Uso:**
```typescript
const { data } = await supabase.functions.invoke('reconcile-subscription', {
  body: { userId: user.id, force: true }
});
```

---

### `debug-subscription`

**Descrição:** Retorna informações detalhadas de debug da assinatura.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 10 req/min

---

### `customer-portal`

**Descrição:** Gera link para o portal do cliente Stripe.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/xxx"
}
```

---

## Pedidos (Orders)

### `create-order-optimized`

**Descrição:** Cria pedido com controle atômico de estoque.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 29.90,
      "customizations": {}
    }
  ],
  "payment_method": "pix" | "card" | "cash",
  "delivery_address_id": "uuid",
  "total": 59.80
}
```

**Response:**
```json
{
  "orderId": "uuid",
  "status": "pending",
  "total": 59.80
}
```

**Características:**
- ✅ Atomic stock reservation via SQL function `atomic_reserve_stock()`
- ✅ Validação de estoque disponível
- ✅ Rollback automático em caso de erro
- ✅ Idempotência via transaction

---

### `create-order-with-idempotency`

**Descrição:** Cria pedido com proteção contra duplicatas via idempotency key.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

**Headers:**
```
Idempotency-Key: uuid-v4
```

---

### `expire-orders` / `expire-orders-enhanced`

**Descrição:** Expira pedidos pendentes automaticamente (executado via CRON).

**Método:** POST  
**Autenticação:** Service Role  
**Schedule:** A cada 30 minutos

**Lógica:**
- Busca pedidos com status `pending`
- Mais de 30 minutos de criação
- Atualiza status para `expired`
- Devolve estoque reservado

---

## Pagamentos

### `create-checkout`

**Descrição:** Cria sessão de checkout no Stripe.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 3 req/min

**Body:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxx"
}
```

---

### `process-card-payment`

**Descrição:** Processa pagamento com cartão.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

---

### `create-order-with-pix`

**Descrição:** Cria pedido com pagamento PIX e gera QR Code.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 5 req/min

**Response:**
```json
{
  "orderId": "uuid",
  "pixCode": "00020126....",
  "qrCodeBase64": "data:image/png;base64,...",
  "expiresAt": "2025-01-01T12:00:00Z"
}
```

---

### `check-pix-status`

**Descrição:** Verifica status de pagamento PIX.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 10 req/min

---

### `stripe-webhook`

**Descrição:** Webhook para eventos do Stripe.

**Método:** POST  
**Autenticação:** Stripe Signature  
**Rate Limit:** 100 req/min

**Eventos processados:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### `mercadopago-webhook`

**Descrição:** Webhook para eventos do Mercado Pago.

**Método:** POST  
**Autenticação:** Mercado Pago Signature  
**Rate Limit:** 100 req/min

---

### `payment-reconciliation`

**Descrição:** Reconcilia pagamentos entre gateway e banco.

**Método:** POST  
**Autenticação:** Admin  
**Rate Limit:** 5 req/min

---

## Integrações

### `delivery-webhook`

**Descrição:** Webhook para integrações de delivery (iFood, Rappi, etc.).

**Método:** POST  
**Autenticação:** API Key  
**Rate Limit:** 50 req/min

---

### `erp-sync`

**Descrição:** Sincroniza dados com ERP externo.

**Método:** POST  
**Autenticação:** Admin  
**Rate Limit:** 10 req/min

---

## Background Jobs

### `background-worker`

**Descrição:** Processa jobs em background (envio de emails, notificações, etc.).

**Método:** POST  
**Autenticação:** Service Role  
**Schedule:** A cada 5 minutos

---

### `process-order-queue`

**Descrição:** Processa fila de pedidos.

**Método:** POST  
**Autenticação:** Service Role  
**Schedule:** A cada 2 minutos

---

## Monitoramento

### `store-error-reports`

**Descrição:** Armazena relatórios de erro do frontend.

**Método:** POST  
**Autenticação:** Opcional  
**Rate Limit:** 30 req/min

**Body:**
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "userAgent": "Mozilla/5.0...",
  "url": "/checkout"
}
```

---

### `store-rum-metrics`

**Descrição:** Armazena métricas de Real User Monitoring (RUM).

**Método:** POST  
**Autenticação:** Opcional  
**Rate Limit:** 50 req/min

**Body:**
```json
{
  "metrics": {
    "FCP": 1200,
    "LCP": 2500,
    "FID": 50,
    "CLS": 0.05
  },
  "url": "/menu",
  "userAgent": "Mozilla/5.0..."
}
```

---

### `webhook-backup-monitor`

**Descrição:** Monitora backups de webhooks.

**Método:** POST  
**Autenticação:** Service Role  
**Schedule:** A cada 1 hora

---

### `cleanup-webhook-logs`

**Descrição:** Limpa logs antigos de webhooks (>30 dias).

**Método:** POST  
**Autenticação:** Service Role  
**Schedule:** Diariamente às 03:00

---

## AI/ML

### `image-recognition`

**Descrição:** Reconhecimento de imagens via AI.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 10 req/min

---

### `neural-personalization`

**Descrição:** Personalização neural de recomendações.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 20 req/min

---

### `mood-analysis`

**Descrição:** Análise de sentimento e mood do cliente.

**Método:** POST  
**Autenticação:** Requerida  
**Rate Limit:** 10 req/min

---

## Outros

### `fiscal-reports`

**Descrição:** Gera relatórios fiscais.

**Método:** POST  
**Autenticação:** Admin  
**Rate Limit:** 5 req/min

---

### `print-thermal`

**Descrição:** Envia pedido para impressora térmica.

**Método:** POST  
**Autenticação:** Admin/Attendant  
**Rate Limit:** 20 req/min

---

### `get-payment-config`

**Descrição:** Retorna configurações de pagamento.

**Método:** GET  
**Autenticação:** Requerida  
**Rate Limit:** 30 req/min

---

### `reprocess-webhook`

**Descrição:** Reprocessa webhook que falhou.

**Método:** POST  
**Autenticação:** Admin  
**Rate Limit:** 5 req/min

---

## 🔒 Segurança

### Rate Limiting

Todas as funções implementam rate limiting via `RateLimiter` class:

```typescript
import { RateLimiter } from '../_shared/rate-limiter.ts';

const limiter = new RateLimiter();
await limiter.checkLimit(userId, 'function-name', requestsPerMinute);
```

### Autenticação

```typescript
// Verificar usuário autenticado
const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) {
  throw new Error('Não autorizado');
}

// Verificar role
const { data: roleData } = await supabaseClient
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (roleData?.role !== 'admin') {
  throw new Error('Acesso negado');
}
```

### CORS

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

---

## 🚀 Deploy

```bash
# Deploy todas as funções
supabase functions deploy

# Deploy função específica
supabase functions deploy check-subscription

# Ver logs
supabase functions logs check-subscription --tail

# Testar localmente
supabase functions serve check-subscription
```

---

## 📊 Monitoramento

### Ver Logs

```bash
# Logs em tempo real
supabase functions logs function-name --tail

# Filtrar erros
supabase functions logs function-name | grep ERROR

# Ver logs de webhook
supabase functions logs stripe-webhook --tail
```

### Métricas

Ver tabela `rum_metrics` e `error_reports` no banco:

```sql
-- Métricas de performance
SELECT 
  url,
  AVG((metrics->>'LCP')::numeric) as avg_lcp,
  AVG((metrics->>'FID')::numeric) as avg_fid
FROM rum_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY url;

-- Erros mais comuns
SELECT 
  message,
  COUNT(*) as occurrences
FROM error_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY message
ORDER BY occurrences DESC
LIMIT 10;
```

---

**Última atualização:** 2025-11-07
