# Plano — Otimização Roxou V3 (cirúrgico, baixo custo)

Você listou 11 frentes. Implementar tudo em uma rodada gastaria muitos créditos e aumenta risco de regressão. Proponho **3 ondas** em ordem de impacto/custo. Você aprova a Onda 1 e seguimos; depois decidimos se vamos para a 2 e 3.

---

## 🌊 Onda 1 — Correções críticas (baixo custo, alto impacto)

Foco: bugs reais que quebram uso hoje.

1. **Menu admin unificado (#1)**
   - Auditar `AdminLayout`, sidebar/mobile, `DashboardLayout` e qualquer fallback.
   - Garantir que todos consumam `src/config/adminNavigation.ts` (já existe e já tem Jogos/Radar/Segurança).
   - Remover arrays hardcoded antigos.

2. **/jogo/:slug "não encontrado" (#2.1)**
   - Adicionar fallback de busca por `external_id` e slug normalizado em `JogoDetail.tsx`.
   - Redirect 301 client-side quando achar por external_id.

3. **Prioridade de jogos BR + filtro de irrelevantes (#2.2, #2.3, #2.4)**
   - Ajustar ordenação no hook/lista de jogos: BR/Liberta/Sula/Champions/Copa do Brasil + ao vivo no topo.
   - Filtrar/depriorizar ligas asiáticas pequenas e amistosos obscuros via lista de allowlist/denylist leve.
   - Reordenar tabelas (`/jogos` tabs) para BR → Copa do Brasil → Libertadores → Champions.

4. **Radar IA — fallback de preview + limpeza (#6, #7)**
   - Estender cadeia de fallback: `flyer_url → media_url → thumbnail_url → preview_image_url → instagram → placeholder`.
   - Botão **"Limpar antigos"** chamando a função `archive_old_radar_scans()` (já existe no DB).
   - Reforçar filtro client-side de janela 2 dias + `permanently_ignored` + eventos passados.

5. **Botão "Excluir evento" no admin (#4)**
   - Soft delete reutilizando `status = 'archived'` (sistema existente) + opcional `deleted_at/deleted_by` se já houver coluna; se não, apenas mudar status para não criar migration cara.
   - Modal de confirmação, gate `isAdmin`.

**Custo estimado:** baixo. ~6 arquivos editados, 0 migrations (reaproveita o que existe).

---

## 🌊 Onda 2 — Melhorias de UX admin (médio custo)

6. **Dashboard analytics mais limpo (#3)** — esconder cards zerados, agrupar KPIs, sem redesign.
7. **Admin /jogos enriquecido (#5)** — chips por competição, destaque dia/BR/ao vivo, contadores de bares. Reaproveita `MatchCard` existente.
8. **Aura Command Center útil (#11)** — remover placeholders vazios, listar alertas reais já existentes (`aura_alerts`, Radar hoje, eventos sem aprovação), adicionar mini-explicação.

**Custo estimado:** médio. ~5 arquivos, 0 migrations.

---

## 🌊 Onda 3 — Painéis Instagram / Studio / Estabelecimentos (maior custo, requer escolhas)

9. **Página Instagram com analytics reais (#8)** — depende de quais métricas o token Meta atual retorna. Pode exigir nova edge function.
10. **Studio menos poluído (#9)** — colapsar seções avançadas.
11. **Auditoria de Estabelecimentos com badges (#10)** — badges Instagram/endereço confirmado.

**Custo estimado:** maior. Pode envolver edge function nova (#8). Precisa decisão sua sobre profundidade.

---

## 🚫 O que NÃO faço

- Sem refatoração de páginas inteiras.
- Sem mudança de identidade visual.
- Sem migrations novas a menos que estritamente necessário (#4 vai tentar reaproveitar `status='archived'`).
- Sem novas libs.
- Sem mexer em timezone, RLS, API premium TheSportsDB.

---

## 📋 Relatório final

Ao fim de cada onda entrego o bloco ✅/⚠️/🛠️/🚫/📊 que você pediu.

---

**Posso começar pela Onda 1?** Se quiser pular alguma das ondas seguintes ou inverter prioridade, me diga antes que eu siga.
