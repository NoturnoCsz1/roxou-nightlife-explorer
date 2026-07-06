## Onda 4 — Horário do flyer + status "confirmado / sugerido / a confirmar"

### Diagnóstico

**Causa do horário não aplicado (confirmado no código, sem alterar prompts):**

1. A Edge Function `extract-flyer-metadata` já retorna `date_iso` (com hora) e a flag `time_is_unknown` — mas o pipeline de bulk trata "hora ausente" e "hora extraída com baixa confiança" como o mesmo estado binário (`time_is_unknown: boolean`). Não existe distinção entre **horário confirmado no flyer**, **horário sugerido pelo parceiro** e **horário a confirmar**.
2. Em `EventoBulkForm.tsx` (linhas 727-742), a variável `finalTimeIsUnknown` é forçada a `true` sempre que o `date_iso` não vem com hora, mesmo que exista contexto (funcionamento do parceiro). Não há tentativa de fallback.
3. O contador "Prontos / Revisão / Publicáveis" usa `getChecklist(e).complete`, que exige `date_time` completo mas não distingue eventos com hora sugerida vs. confirmada.

**Campos envolvidos:**

- `EventFormData.date_time` (string `YYYY-MM-DDTHH:mm`)
- `EventFormData.time_is_unknown` (boolean, já existe em banco)
- Retorno da edge: `data.date_iso`, `data.time_is_unknown`
- Parceiro: `partners.*` (ver bloqueio abaixo)

### Bloqueio crítico — funcionalidade parcial

O escopo pede: **"se o flyer não tiver horário, sugerir horário pelo funcionamento do parceiro quando houver um único horário confiável"**.

A coluna `partners.opening_hours` **não existe** no schema (confirmado em `src/integrations/supabase/types.ts` e no comentário do próprio `PartnerOpeningHoursEditor.tsx`: "A coluna `opening_hours` ainda não existe em `partners`"). O usuário proibiu explicitamente alterar banco/RLS nesta onda.

**Duas opções — preciso da sua escolha antes de implementar:**

**Opção A (recomendada, 100% dentro das restrições):**  
Implementar apenas o **status semântico do horário** (confirmado / a confirmar) usando o campo `time_is_unknown` já existente + uma flag client-side `time_source: "flyer" | "batch" | "manual" | "unknown"` no estado do bulk (não persistida). O fallback por parceiro fica registrado como **"pendente — depende de** `partners.opening_hours`**"** e a UI mostra o horário como "a confirmar" quando `time_is_unknown === true`.

**Opção B:**  
Você libera a criação da coluna `partners.opening_hours` (jsonb) via migration nesta onda. Aí o fallback fica funcional.

### Plano (assumindo Opção A)

#### 1. Novo helper `src/lib/eventTimeStatus.ts`

Função pura que classifica um evento em um dos três estados, sem tocar banco:

```text
timeStatus(form) →
  "confirmed"  se date_time tem hora E time_is_unknown === false E hora !== "00:00"
  "suggested"  se date_time tem hora E time_is_unknown === false E veio de padrão do lote (marcador in-memory)
  "unknown"    se time_is_unknown === true OU hora === "00:00"
```

#### 2. `EventoBulkForm.tsx`

- Adicionar `timeSource?: "flyer" | "batch" | "manual"` no tipo local `BulkItem` (não vai para o payload).
- Ao aplicar `finalDateTime`, marcar `timeSource` conforme origem (`extractedHasTime` → `"flyer"`; `useBatchTime` → `"batch"`; edição manual → `"manual"`).
- Nunca inventar hora: se `data.time_is_unknown === true` e não há batch time, manter `time_is_unknown: true` e `date_time` sem hora (`T00:00`), exatamente como hoje.
- Badge no card: `⏰ Horário confirmado` (verde) / `⏰ Horário sugerido — confira` (âmbar) / `⏰ Sem horário — a confirmar` (cinza).

#### 3. Contadores "Prontos / Revisão / Publicáveis"

- Em `itemFlags` (bulk form): item com `timeStatus === "unknown"` passa a contar em **Revisão**, não em **Prontos**, mesmo com todos os outros campos preenchidos.
- Item com `timeStatus === "suggested"` conta em **Revisão** até o admin confirmar (clicar num check "confirmar horário").

#### 4. Listagem admin (`useEventosListActions.ts` / `getChecklist`)

- `getChecklist(e).complete` passa a exigir `!e.time_is_unknown` (já é hoje via `date_time`, mas explicitar reduz falso "pronto").
- Sem alterar publicação/slug/Onda 2/Onda 3.

#### 5. Validação

- `bunx tsgo --noEmit`
- `bun run build`
- Reportar: causa, campos, fallback (bloqueado ou aplicado), impacto em Rascunhos/Revisão.

### Não alterado

Publicação, slug, Onda 2 (IA(N)), Onda 3 (402), banco, RLS, auth, prompts, Edge Functions, Partner Pro/Motorista/Transporte, concorrência, `handleBulkSave`, `DescriptionWorker`.

---

**Confirme a Opção A (sem coluna nova) ou Opção B (crio a migration** `partners.opening_hours`**) para eu prosseguir.**

&nbsp;

Confirmo a Opção A.

&nbsp;

Prosseguir sem migration e sem coluna nova.

&nbsp;

Implementar apenas:

- status semântico do horário: confirmado / sugerido / a confirmar;

- flag client-side `timeSource`;

- badges visuais;

- item com horário desconhecido indo para Revisão;

- item com horário sugerido exigindo confirmação manual;

- sem fallback real por funcionamento do parceiro por enquanto.

&nbsp;

Registrar no relatório que o fallback por funcionamento do parceiro está bloqueado porque `partners.opening_hours` não existe no schema e será uma etapa futura separada.

&nbsp;

Rodar:

bunx tsgo --noEmit

bun run build