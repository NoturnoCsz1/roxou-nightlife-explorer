# FIX — Public VIP route 404 (`/vip/:publicSlug`)

## Sintoma
`https://roxou.com.br/vip/teste-lista-3-f31b19?promoter=fernando` retorna 404 da Roxou.

## Investigação

### 1. Rota em `src/App.tsx`
✅ Presente (linhas 217–221), fora de qualquer guard, dentro do `BrowserRouter`:
```tsx
<Route path="/vip/:publicSlug" element={L(<PublicVipList />)} />
<Route path="/vip/:publicSlug/sucesso/:publicToken" element={L(<PublicVipListSuccess />)} />
```

### 2. Import de `PublicVipList`
✅ Lazy import válido (linha 130):
```tsx
const PublicVipList = lazy(() => import("./pages/PublicVipList"));
```
Arquivo `src/pages/PublicVipList.tsx` existe e exporta default.

### 3. Catch-all `path="*"`
✅ Está depois da rota `/vip/...` (não intercepta antes). React Router v6 escolhe a rota mais específica de qualquer forma.

### 4. Busca global
- `rg "/vip/" src` → apenas as duas rotas em `App.tsx`.
- `rg "publicSlug" src` → componente público + serviços.
- `rg "PublicVipList" src` → import único em `App.tsx`.

Sem conflitos.

### 5. Logs
Adicionado em `src/pages/PublicVipList.tsx`:
```ts
console.log("[PUBLIC VIP ROUTE]", window.location.pathname, { publicSlug, promoterSlug });
```
No preview Lovable a rota carrega o componente normalmente — logo o **código está correto**.

## Causa raiz
O 404 ocorre **apenas em `roxou.com.br`** (VPS), **não no preview Lovable**.
Motivo: o **build implantado na VPS é anterior à Fase 10E**. O bundle servido pelo `roxou-web` (Node em `127.0.0.1:3000`) ainda não contém a rota `/vip/:publicSlug`, então o React Router cai no catch-all `<NotFound />`.

Confirmação:
- `NGINX_ROXOU.conf.example` faz proxy de `location /` → `roxou_web` (SPA fallback delegado ao próprio servidor estático Node) — está correto.
- O servidor SPA na VPS serve `index.html` para qualquer rota desconhecida (comportamento padrão de Vite preview/serve-handler). A 404 vista é a **página `NotFound` do React**, não um 404 do Nginx.

## Correção
1. **Rebuild + redeploy na VPS** com o código atual (Fase 10E):
   ```bash
   git pull
   bun install
   bun run build
   pm2 restart roxou-web
   ```
2. Validar:
   ```bash
   curl -I https://roxou.com.br/vip/teste-lista-3-f31b19
   # → 200 OK + Content-Type: text/html
   ```
3. Conferir no DevTools que o console mostra:
   ```
   [PUBLIC VIP ROUTE] /vip/teste-lista-3-f31b19 { publicSlug: "teste-lista-3-f31b19", promoterSlug: "fernando" }
   ```

## Configuração SPA — Nginx
O bloco atual está correto e **não precisa mudar**:
```nginx
location / {
  proxy_pass http://roxou_web;
  ...
}
```
O fallback é feito pelo servidor Node (`roxou-web`). Se algum dia o serve-handler mudar de comportamento, a alternativa é Nginx servindo `dist/` diretamente com:
```nginx
location / { try_files $uri $uri/ /index.html; }
```

## Escopo preservado
Sem alterações em RLS, Supabase, Admin antigo, Partner Pro, Google OAuth.
Apenas adicionado log de diagnóstico em `PublicVipList.tsx`.
