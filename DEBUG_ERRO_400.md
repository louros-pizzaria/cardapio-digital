# 🔍 Debug: Erro 400 em create-order-optimized

## ✅ Melhorias Implementadas

### 1. **Tratamento de Erro Melhorado**
- ✅ Extração de mensagem de erro de múltiplas fontes
- ✅ Logs detalhados para identificar o problema
- ✅ Mensagem de erro mais clara para o usuário

### 2. **Logs Adicionados**
- ✅ Log do tipo de erro
- ✅ Log das chaves do objeto de erro
- ✅ Log da mensagem final extraída

---

## 🔍 Como Identificar o Problema

### Passo 1: Verificar Console do Navegador

Abra o DevTools (F12) → Console e procure por:

```
[CHECKOUT] Exception caught: ...
[CHECKOUT] Error type: ...
[CHECKOUT] Error keys: ...
[CHECKOUT] Final error message: ...
```

### Passo 2: Verificar Logs da Edge Function

1. Acesse: **Supabase Dashboard → Edge Functions → create-order-optimized → Logs**
2. Procure por mensagens que começam com `[CREATE-ORDER-OPTIMIZED]`
3. Identifique qual validação está falhando

### Passo 3: Verificar Dados Enviados

No console do navegador, você verá logs como:
```
[CHECKOUT] Order data: {
  user_id: "...",
  total_amount: 50.00,
  delivery_method: "delivery",
  ...
}
```

---

## 📋 Possíveis Causas do Erro 400

### 1. **Loja Fechada**
**Log esperado:**
```
[CREATE-ORDER-OPTIMIZED] Store closed - rejecting order
```

**Solução:** Verificar horários de funcionamento no painel admin

### 2. **Items Inválidos**
**Log esperado:**
```
[CREATE-ORDER-OPTIMIZED] Validation failed: No items provided
```

**Solução:** Verificar se o carrinho não está vazio

### 3. **Valor Total Inválido**
**Log esperado:**
```
[CREATE-ORDER-OPTIMIZED] Validation failed: Invalid total amount
```

**Solução:** Verificar cálculo do total

### 4. **Produtos Indisponíveis**
**Log esperado:**
```
[CREATE-ORDER-OPTIMIZED] Product validation failed: [...]
```

**Solução:** Verificar disponibilidade dos produtos

### 5. **Erro de Parsing JSON**
**Log esperado:**
```
[CREATE-ORDER-OPTIMIZED] Error parsing request body: ...
```

**Solução:** Verificar formato dos dados enviados

---

## 🧪 Teste Rápido

1. **Abra o console do navegador** (F12)
2. **Tente criar um pedido**
3. **Copie todos os logs** que começam com `[CHECKOUT]` ou `[CREATE-ORDER-OPTIMIZED]`
4. **Envie os logs** para análise

---

## 🔧 Próximos Passos

Com os logs melhorados, você conseguirá identificar exatamente:
- ✅ Qual validação está falhando
- ✅ Quais dados estão sendo enviados
- ✅ Qual mensagem de erro está sendo retornada

**A mensagem de erro no toast agora deve mostrar a causa específica!** 🎯

