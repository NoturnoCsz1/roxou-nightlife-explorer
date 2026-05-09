# 🧩 Roxou — Template de Prompt Seguro

Use este modelo ao pedir alterações para evitar quebrar áreas estáveis.

---

## Modelo curto

```
Faça apenas a alteração X.

Não mexa em Home, IA, Transporte, auth, timezone, rotas ou banco,
salvo se for estritamente necessário para X.

Preserve o que já funciona.

Ao final informe:
1. arquivos alterados
2. testes feitos
3. riscos identificados
4. confirmação que timezone America/Sao_Paulo não foi alterada
```

---

## Modelo completo

```
OBJETIVO
Descreva em uma frase o que deve mudar.

ESCOPO PERMITIDO
- arquivos / componentes / rotas que podem ser tocados

NÃO ALTERAR
- Home (src/pages/v3/V3Home.tsx e componentes da home)
- IA (Aura, edge functions de IA)
- Transporte (carona, motorista, chat)
- Cadastro de motorista
- Auth e RLS
- Supabase migrations (a menos que pedido)
- Timezone America/Sao_Paulo
- Layout público quando o pedido é admin
- src/integrations/supabase/client.ts e types.ts

REGRAS
- usar tokens semânticos (sem cores hardcoded)
- usar helpers de @/lib/dateUtils para datas
- usar fetchAllRows para queries com 1000+ linhas
- novas RLS via public.has_role()

ENTREGAR
1. arquivos alterados
2. resumo das mudanças
3. testes/validações feitas
4. riscos
5. confirmações:
   - timezone intacta
   - rotas principais abrem
   - layout público preservado
```

---

## Frases prontas para colar

- **UI somente:** "Mantenha a mudança em frontend e apresentação. Não altere lógica de negócio, banco, edge functions ou auth."
- **Admin somente:** "Não altere o site público. Layout, Home e rotas públicas devem ficar idênticas."
- **Bug fix:** "Reproduza o bug, conserte com o menor diff possível, não refatore áreas adjacentes."
- **Migration:** "Crie migration isolada, com RLS e validação por trigger (sem CHECK temporal). Não toque em schemas reservados."
