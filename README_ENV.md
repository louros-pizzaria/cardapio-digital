# ✅ Configuração de Variáveis de Ambiente

## 🎯 Status: TUDO PRONTO!

O código já está **100% configurado** para usar variáveis de ambiente. Você só precisa criar o arquivo `.env` na raiz do projeto.

---

## 📝 Arquivo `.env` Necessário

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# ===== CONFIGURAÇÕES DO SUPABASE =====
# Substitua pelos valores do seu projeto Supabase
# Encontre em: Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## ✅ Arquivos Já Modificados

Todos estes arquivos já estão usando variáveis de ambiente:

1. ✅ **`src/services/supabase.ts`**
   - Usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

2. ✅ **`src/utils/securityHeaders.ts`**
   - Usa `VITE_SUPABASE_URL` para CSP (Content Security Policy)

3. ✅ **`src/utils/performanceOptimizer.ts`**
   - Usa `VITE_SUPABASE_URL` para otimizações de performance

4. ✅ **`supabase/functions/create-mercadopago-preference/index.ts`**
   - Usa `SUPABASE_URL` (variável do Supabase) para webhook

5. ✅ **`supabase/functions/process-card-payment/index.ts`**
   - Usa `SUPABASE_URL` (variável do Supabase) para webhook

6. ✅ **`supabase/functions/send-notification-email/index.ts`**
   - Usa `SUPABASE_URL` (variável do Supabase) para links

---

## 🔧 Como Funciona

### Frontend (`.env`)
As variáveis `VITE_*` são carregadas automaticamente pelo Vite quando você inicia o projeto.

### Backend (Supabase Edge Functions)
As variáveis são configuradas no painel do Supabase:
- **Supabase Dashboard → Settings → Edge Functions → Secrets**

---

## 📋 Checklist Rápido

Para cada novo cliente, você só precisa:

- [ ] Criar arquivo `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Configurar variáveis no Supabase Edge Functions (incluindo `MERCADOPAGO_ACCESS_TOKEN_PROD`)
- [ ] Configurar webhook no Mercado Pago

**Pronto!** O código já está preparado para usar essas variáveis.

---

## ⚠️ Importante

- O arquivo `.env` **NÃO** deve ser commitado no Git (já deve estar no `.gitignore`)
- Cada cliente terá seu próprio arquivo `.env` com suas credenciais
- As credenciais do Mercado Pago são as mesmas para todos os clientes

---

## 🚀 Próximos Passos

1. Crie o arquivo `.env` na raiz do projeto
2. Adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Reinicie o servidor de desenvolvimento (`npm run dev`)

**Pronto para usar!** 🎉

