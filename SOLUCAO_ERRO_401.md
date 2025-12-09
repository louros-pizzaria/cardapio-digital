# 🔧 Solução: Erro 401 - Missing authorization header

## 🔍 Problema Identificado

O erro `{"code":401,"message":"Missing authorization header"}` indica que o token de autenticação não está sendo enviado corretamente para a Edge Function.

## ✅ Correções Implementadas

### 1. **Validação de Token Antes de Enviar**
- ✅ Verificação se `session.access_token` existe antes de fazer a requisição
- ✅ Redirecionamento para login se o token não existir
- ✅ Logs detalhados para debug

### 2. **Logs Melhorados**
- ✅ Log se a sessão existe
- ✅ Log se o token existe
- ✅ Preview do token (primeiros 20 caracteres)
- ✅ Preview do header Authorization

---

## 🔍 Como Verificar

### Passo 1: Verificar Console do Navegador

Abra o DevTools (F12) → Console e procure por:

```
[CHECKOUT] ✅ Session verified: [user-id]
[CHECKOUT] ✅ Access token exists: true
[CHECKOUT] ✅ Token preview: eyJhbGciOiJIUzI1NiIs...
[CHECKOUT] Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Passo 2: Se o Token Não Existe

Se você ver:
```
[CHECKOUT] No access token in session
```

**Solução:**
1. Faça logout
2. Faça login novamente
3. Tente criar o pedido novamente

---

## 🔧 Possíveis Causas

### 1. **Sessão Expirada**
**Sintoma:** Token não existe na sessão

**Solução:** 
- Fazer logout e login novamente
- Verificar se o token está sendo renovado automaticamente

### 2. **Token Não Sendo Enviado**
**Sintoma:** Token existe mas não está sendo enviado

**Solução:**
- Verificar se o header está sendo construído corretamente
- Verificar logs do console

### 3. **Problema com Cliente Supabase**
**Sintoma:** Cliente não está enviando token automaticamente

**Solução:**
- O código agora envia o token manualmente no header
- Verificar se o cliente Supabase está configurado corretamente

---

## 🧪 Teste

1. **Abra o console do navegador** (F12)
2. **Faça login** (se necessário)
3. **Tente criar um pedido**
4. **Verifique os logs** no console
5. **Confirme que o token está sendo enviado**

---

## 📝 Logs Esperados

**Sucesso:**
```
[CHECKOUT] ✅ Session verified: abc123...
[CHECKOUT] ✅ Access token exists: true
[CHECKOUT] ✅ Token preview: eyJhbGciOiJIUzI1NiIs...
[CHECKOUT] Authorization header: Bearer eyJhbGciOiJIUzI1NiIs...
[CHECKOUT] Creating order via edge function...
[CREATE-ORDER-OPTIMIZED] User authenticated: abc123...
```

**Erro (Token não existe):**
```
[CHECKOUT] No access token in session
```

**Erro (Token não enviado):**
```
[CREATE-ORDER-OPTIMIZED] Missing Authorization header
```

---

## ✅ Próximos Passos

1. **Teste novamente** o fluxo de checkout
2. **Verifique os logs** no console
3. **Se o erro persistir**, verifique:
   - Se o usuário está autenticado
   - Se a sessão está válida
   - Se o token está sendo renovado

---

**Com essas correções, o token deve ser enviado corretamente!** 🚀

