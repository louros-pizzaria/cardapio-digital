# 🏢 Guia: Sistema Multi-Cliente com Mesma Conta Mercado Pago

Este documento explica as modificações realizadas para suportar múltiplos clientes com bancos de dados diferentes, mas usando a **mesma conta do Mercado Pago**.

---

## ✅ Modificações Realizadas

### 1. **Frontend - Variáveis de Ambiente**

#### `src/services/supabase.ts`
- ✅ Modificado para usar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Mantém valores padrão para compatibilidade retroativa

#### `src/utils/securityHeaders.ts`
- ✅ Modificado para usar `VITE_SUPABASE_URL` dinamicamente

#### `src/utils/performanceOptimizer.ts`
- ✅ Modificado para usar `VITE_SUPABASE_URL` dinamicamente

### 2. **Edge Functions - URLs Dinâmicas**

#### `supabase/functions/create-mercadopago-preference/index.ts`
- ✅ URL do webhook agora usa `Deno.env.get('SUPABASE_URL')`

#### `supabase/functions/process-card-payment/index.ts`
- ✅ URL do webhook agora usa `Deno.env.get('SUPABASE_URL')`

#### `supabase/functions/send-notification-email/index.ts`
- ✅ Link do painel admin agora usa `Deno.env.get('SUPABASE_URL')`

---

## 📋 Configuração para Cada Cliente

### Passo 1: Criar Projeto Supabase para o Cliente

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto
3. Anote a **URL** e **ANON KEY** do projeto

### Passo 2: Configurar Variáveis de Ambiente no Frontend

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=https://[PROJETO-CLIENTE].supabase.co
VITE_SUPABASE_ANON_KEY=[CHAVE-ANON-DO-CLIENTE]
```

### Passo 3: Configurar Variáveis no Supabase (Edge Functions)

Acesse: **Supabase Dashboard → Settings → Edge Functions → Secrets**

Configure as seguintes variáveis:

#### Obrigatórias:
- `SUPABASE_URL` = URL do projeto (ex: `https://abc123.supabase.co`)
- `SUPABASE_ANON_KEY` = Chave anônima do projeto
- `SUPABASE_SERVICE_ROLE_KEY` = Chave de serviço (privada)

#### Mercado Pago (MESMAS para todos os clientes):
- `MERCADOPAGO_ACCESS_TOKEN_PROD` = Token de acesso de produção
- `MERCADOPAGO_PUBLIC_KEY_PROD` = Chave pública de produção
- `MERCADOPAGO_WEBHOOK_SECRET` = Secret para validação de webhooks (recomendado)

### Passo 4: Configurar Webhook no Mercado Pago

⚠️ **IMPORTANTE**: Configure o webhook no painel do Mercado Pago apontando para:

```
https://[PROJETO-CLIENTE].supabase.co/functions/v1/mercadopago-webhook
```

**Nota**: Cada cliente terá seu próprio webhook, mas todos receberão pagamentos na mesma conta do Mercado Pago.

---

## 🔄 Fluxo de Funcionamento

```
Cliente A (Banco A) → Supabase A → Mercado Pago (Conta Única)
Cliente B (Banco B) → Supabase B → Mercado Pago (Conta Única)
Cliente C (Banco C) → Supabase C → Mercado Pago (Conta Única)
```

**Características:**
- ✅ Cada cliente tem seu próprio banco de dados
- ✅ Cada cliente tem suas próprias credenciais do Supabase
- ✅ Todos os pagamentos vão para a mesma conta do Mercado Pago
- ✅ Webhooks são específicos por cliente (cada um aponta para seu próprio Supabase)

---

## 📝 Checklist de Migração para Novo Cliente

- [ ] Criar novo projeto no Supabase
- [ ] Configurar variáveis de ambiente no frontend (`.env`)
- [ ] Configurar variáveis no Supabase Edge Functions
- [ ] Configurar webhook no Mercado Pago apontando para o novo Supabase
- [ ] Executar migrações do banco de dados (se necessário)
- [ ] Testar criação de pedido e pagamento
- [ ] Verificar recebimento de webhook

---

## ⚠️ Observações Importantes

1. **Mercado Pago**: As credenciais (`MERCADOPAGO_ACCESS_TOKEN_PROD` e `MERCADOPAGO_PUBLIC_KEY_PROD`) devem ser as **mesmas** em todos os projetos Supabase.

2. **Webhooks**: Cada cliente precisa ter seu webhook configurado no Mercado Pago apontando para seu próprio Supabase.

3. **Isolamento**: Cada cliente terá dados completamente isolados, mas os pagamentos serão centralizados na mesma conta do Mercado Pago.

4. **Relatórios**: No painel do Mercado Pago, você verá todos os pagamentos de todos os clientes juntos. Para separar por cliente, use o campo `external_reference` que contém o `order_id` do pedido.

---

## 🛠️ Arquivos Modificados

- ✅ `src/services/supabase.ts`
- ✅ `src/utils/securityHeaders.ts`
- ✅ `src/utils/performanceOptimizer.ts`
- ✅ `supabase/functions/create-mercadopago-preference/index.ts`
- ✅ `supabase/functions/process-card-payment/index.ts`
- ✅ `supabase/functions/send-notification-email/index.ts`

---

## 📚 Referências

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)
- [Guia de Migração Completo](./GUIA_MIGRACAO_CLIENTE.md)

