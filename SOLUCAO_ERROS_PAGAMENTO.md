# 🔧 Solução para Erros no Checkout/Pagamento

## ✅ Problemas Corrigidos

### 1. **Aviso CSP `frame-ancestors`**
**Erro**: `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`

**Solução**: Removida a diretiva `frame-ancestors` da CSP aplicada via meta tag, pois essa diretiva só funciona via HTTP header.

**Status**: ✅ Corrigido

---

### 2. **Erro 500 em `get-payment-config`**
**Erro**: `Failed to load resource: the server responded with a status of 500`

**Causa**: A variável de ambiente `MERCADOPAGO_PUBLIC_KEY_PROD` não está configurada nas Edge Functions do Supabase.

**Solução**: 
1. ✅ Melhorada a mensagem de erro para ser mais clara
2. ✅ Adicionados logs para debug
3. ⚠️ **AÇÃO NECESSÁRIA**: Configurar a variável no Supabase

---

## 🔧 Como Resolver o Erro 500

### Passo 1: Acessar o Painel do Supabase
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Settings → Edge Functions → Secrets**

### Passo 2: Adicionar Variável de Ambiente
Adicione a seguinte variável:

**Nome**: `MERCADOPAGO_PUBLIC_KEY_PROD`  
**Valor**: Sua chave pública de produção do Mercado Pago

### Passo 3: Onde Encontrar a Chave Pública
1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Selecione sua aplicação
3. Vá em **"Credenciais"**
4. Copie a **Public Key** de **PRODUÇÃO** (não a de teste)

### Passo 4: Verificar Outras Variáveis Necessárias
Certifique-se de que também estão configuradas:

- ✅ `MERCADOPAGO_ACCESS_TOKEN_PROD` (Token de acesso de produção)
- ✅ `MERCADOPAGO_PUBLIC_KEY_PROD` (Chave pública de produção) ⚠️ **FALTANDO**
- ✅ `SUPABASE_URL` (URL do seu projeto Supabase)
- ✅ `SUPABASE_ANON_KEY` (Chave anônima)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (Chave de serviço)

---

## 🧪 Como Testar

Após configurar a variável:

1. **Aguarde alguns segundos** para a Edge Function atualizar
2. **Recarregue a página** do checkout
3. **Tente fazer um pagamento** novamente
4. **Verifique o console** - não deve mais aparecer o erro 500

---

## 📝 Logs para Debug

A função `get-payment-config` agora registra logs mais detalhados:

- ✅ Log quando a requisição é recebida
- ✅ Log quando a chave pública é encontrada
- ✅ Log de erro com variáveis disponíveis (para debug)
- ✅ Mensagens de erro mais claras

Para ver os logs:
1. Acesse: **Supabase Dashboard → Edge Functions → get-payment-config → Logs**

---

## ⚠️ Importante

- A chave pública do Mercado Pago é **pública** e pode ser exposta no frontend
- O token de acesso (`MERCADOPAGO_ACCESS_TOKEN_PROD`) é **privado** e nunca deve ser exposto
- Use sempre as credenciais de **PRODUÇÃO** (não de teste) em produção

---

## ✅ Checklist

- [x] Removido `frame-ancestors` da CSP (meta tag)
- [x] Melhorada mensagem de erro em `get-payment-config`
- [x] Adicionados logs para debug
- [ ] **Configurar `MERCADOPAGO_PUBLIC_KEY_PROD` no Supabase** ⚠️ **AÇÃO NECESSÁRIA**

---

**Após configurar a variável, o erro 500 será resolvido!** 🚀

