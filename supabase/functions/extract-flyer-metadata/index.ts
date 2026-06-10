import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = [
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
  "funk", "eletronica", "sertanejo",
];

const ALLOWED_SUBS = [
  "funk", "pagode_samba", "rock", "pop_rock", "eletronica", "sertanejo", "mpb",
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
];

const GENRE_SUBS = new Set(["funk", "pagode_samba", "rock", "pop_rock", "eletronica", "sertanejo", "mpb"]);

// 📅 Base year for calendar validation (V4 — janela de operação 2026)
const BASE_YEAR = 2026;

// 🎵 Dicionário de gêneros — palavras-chave fortes da cena de Prudente
const GENRE_KEYWORDS: Record<string, string[]> = {
  sertanejo: ["sertanejo", "modao", "modão", "boteco", "violada", "viola", "agro", "moda de viola", "raiz"],
  funk: ["funk", "baile", "fluxo", "mandela", "revoada", "mc ", "dj funk", "tropa", "favela", "150bpm", "automotivo"],
  pagode_samba: ["pagode", "samba", "roda", "pagodinho", "pagodão", "pagodao", "samba de raiz", "partido alto"],
  eletronica: ["eletronica", "eletrônica", "techno", "house", "trance", "rave", "set ", "open air", "psy"],
  rock: ["rock", "metal", "hardcore", "punk"],
  pop_rock: ["pop rock", "indie", "alternativo", "cover"],
  mpb: ["mpb", "bossa", "samba-canção", "voz e violão"],
};

const NATIONAL_VENUE_KEYWORDS = ["recinto de exposição", "recinto de exposicoes", "parque de exposições", "parque de exposicoes", "arena", "estádio", "estadio", "ginasio", "ginásio", "anfiteatro"];

// 🧠 Memória de gênero por estabelecimento (Prudente / interior SP)
// Usada como FALLBACK quando o parceiro não está cadastrado como verificado.
// Chave: trecho normalizado (sem acento, lowercase). Match por includes nos dois sentidos.
const VENUE_GENRE_MEMORY: Array<{ keys: string[]; sub: string; cat?: string }> = [
  { keys: ["vo laura", "vó laura"], sub: "sertanejo", cat: "bar" },
  { keys: ["agrobar"], sub: "sertanejo", cat: "bar" },
  { keys: ["espetinho do rafa", "espetinho rafa"], sub: "mpb", cat: "espetinho" },
  { keys: ["arapuca"], sub: "sertanejo", cat: "bar" },
  { keys: ["bar do tio"], sub: "pagode_samba", cat: "bar" },
  { keys: ["colina"], sub: "pagode_samba", cat: "bar" },
  { keys: ["fabrica"], sub: "eletronica", cat: "balada" },
  { keys: ["gastrobar"], sub: "eletronica", cat: "bar" },
];

function lookupVenueMemory(venueName: string | null | undefined): { sub: string; cat?: string; matched: string } | null {
  const v = normText(venueName || "");
  if (!v || v.length < 3) return null;
  for (const entry of VENUE_GENRE_MEMORY) {
    for (const k of entry.keys) {
      if (v.includes(k) || k.includes(v)) {
        return { sub: entry.sub, cat: entry.cat, matched: k };
      }
    }
  }
  return null;
}

const WEEKDAY_NAMES = [
  ["domingo", "dom"],
  ["segunda", "seg", "segunda-feira"],
  ["terca", "ter", "terça", "terca-feira", "terça-feira"],
  ["quarta", "qua", "quarta-feira"],
  ["quinta", "qui", "quinta-feira"],
  ["sexta", "sex", "sexta-feira"],
  ["sabado", "sab", "sábado"],
];

const MONTH_NAMES: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, março: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

const systemPrompt = `Você é um extrator de metadados de flyers/banners de eventos da noite brasileira (Presidente Prudente / SP — interior).

Receba a imagem de um flyer e responda APENAS com JSON válido (sem markdown, sem comentários):

{
  "title": string,            // Título RICO em CAIXA ALTA (máx 80). Formato "[ATRAÇÃO] NO [LOCAL] [FRASE DE IMPACTO]". NÃO copie literalmente. Sem hífens, dois pontos ou barras. Frase nasce do gênero+artista+local.
  "date_iso": string|null,    // "YYYY-MM-DDTHH:MM" fuso SP. SEMPRE assuma o ano ${BASE_YEAR} como base. Se você tiver MENOS de 80% de certeza sobre a data, retorne null. ⚠️ NUNCA invente horário. Se o flyer NÃO mostra horário claramente, retorne APENAS a data ("YYYY-MM-DD", sem o T...) e marque "time_is_unknown": true.
  "time_is_unknown": boolean, // true quando o flyer NÃO mostra horário claro. false quando você leu um horário explícito no flyer.
  "date_day": number|null,    // Dia do mês lido no flyer (1-31), independente do ano.
  "date_month": number|null,  // Mês lido no flyer (1-12).
  "date_weekday": string|null,// Dia da semana escrito no flyer (sabado, sexta, domingo...). null se não aparecer.
  "venue_name": string|null,
  "address": string|null,
  "instagram": string|null,
  "category": string,         // show, festival, bar, universitario, restaurante, balada, festa, futebol, cultural, lounge, espetinho
  "sub_category": string,     // funk, pagode_samba, rock, pop_rock, eletronica, sertanejo, mpb (ou repita category se sem gênero)
  "opportunity_tags": string[],// open_bar, double_drink, entrada_free, promocao
  "ticket_url": null,
  "venue_confidence": "high"|"medium"|"low",
  "genre_confidence": "high"|"medium"|"low", // sua certeza sobre o gênero musical
  "date_confidence": "high"|"medium"|"low",  // sua certeza sobre a data lida
  "confidence": "high"|"medium"|"low"
}

📅 REGRA DE CALENDÁRIO REAL (CRÍTICO):
- Ano padrão: ${BASE_YEAR}.
- Se o flyer trouxer "Sábado, 15 de Maio", você DEVE conferir mentalmente se 15/05/${BASE_YEAR} cai realmente em Sábado.
- Se NÃO coincidir, prefira preencher date_day/date_month/date_weekday separadamente e marque date_confidence="low" — o servidor vai recalcular o mês correto onde o dia bate com o weekday.
- NUNCA "ajuste" a data forçando um mês qualquer só pra fechar — confiança baixa é melhor que data errada.

🟣 REGRA DE OURO — TIPO DO LOCAL PREVALECE SOBRE GÊNERO:
A category reflete o TIPO DO ESTABELECIMENTO. Gênero/atração vai em sub_category.
- "Gastrobar", "Bar", "Boteco", "Pub", "Choperia" → category="bar"
- "Restaurante", "Espetaria", "Espetinho", "Churrascaria" → "restaurante" ou "espetinho"
- "Lounge", "Rooftop" → "lounge"
- "Club", "Balada", "Disco", "Night" → "balada"
- "Arena", "Estádio", "Teatro", "Casa de Show", "Recinto de Exposições" → "show"

🧬 DNA DO PARCEIRO:
Você receberá uma lista de parceiros verificados com TIPO e GÊNERO BASE. Se o local do flyer bater com um parceiro, use a categoria/gênero DELE como padrão. Só altere se houver palavra MUITO forte do gênero contrário no flyer (ex: "Noite do Rock" em bar de sertanejo).

🎵 DICIONÁRIO DE GÊNEROS (Prudente):
- Sertanejo: modão, boteco, violada, viola, agro, raiz, sofrência
- Funk/Mega: baile, fluxo, mandela, revoada, automotivo, tropa, MC
- Pagode/Samba: samba, roda, pagodinho, pagodão, partido alto
- Eletrônico: techno, house, set, rave, open air, psy
- Rock: rock, metal, hardcore
- MPB: bossa, voz e violão

🎤 BAR vs SHOW:
- BAR: atração local, dupla pequena, nome regional, formato resenha.
- SHOW: artista de relevância nacional/regional GRANDE, OU recinto de exposições / arena / parque / casa de show.

⛔ PROIBIDO no title: IMPERDÍVEL, INSANA, NOITE INESQUECÍVEL, EXPERIÊNCIA ÚNICA, SE PREPARA, VIBE INSANA.
⛔ Sem hífens (-), travessões (—, –), dois pontos (:), barras (/) ou pipes (|) no title — só ESPAÇOS.
⛔ ticket_url: SEMPRE null.
⛔ NUNCA invente endereço/parceiro/link.

🔒 SEGURANÇA: se a sua certeza for menor que 80% sobre data ou gênero, prefira null/medium-low. Marcação humana é melhor que dado falso.`;

function safeJson(text: string): any {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function ensureDefaultTime(dateIso: unknown): string | null {
  if (typeof dateIso !== "string" || !dateIso.trim()) return null;
  const trimmed = dateIso.trim();
  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}T20:00`;
  const dateHour = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2})(?::(\d{2}))?/);
  if (dateHour) return `${dateHour[1]}T${dateHour[2].padStart(2, "0")}:${dateHour[3] || "00"}`;
  return trimmed;
}

function normText(value: unknown): string {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseWeekday(value: unknown): number | null {
  const v = normText(value);
  if (!v) return null;
  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    if (WEEKDAY_NAMES[i].some((w) => v.startsWith(w) || v === w)) return i; // 0=dom..6=sab
  }
  return null;
}

/**
 * 📅 V4 — Calendário Real
 * Dada day/month (lidos do flyer) + weekday declarado, encontra a data real mais próxima
 * em BASE_YEAR onde dia+mês+weekday batem. Se não bater no mês declarado, varre os próximos
 * 12 meses procurando o primeiro mês onde o dia X cai no weekday Y.
 */
function resolveCalendarDate(opts: {
  day: number | null;
  month: number | null;
  weekday: number | null;
  baseYear: number;
}): { date: string | null; reason: string | null } {
  const { day, month, weekday, baseYear } = opts;
  if (!day || day < 1 || day > 31) return { date: null, reason: null };

  // Sem weekday → confia no mês declarado
  if (weekday === null) {
    if (!month) return { date: null, reason: null };
    const d = new Date(Date.UTC(baseYear, month - 1, day));
    if (d.getUTCMonth() + 1 !== month) return { date: null, reason: "dia inválido para o mês" };
    return { date: `${baseYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, reason: null };
  }

  // Com weekday → valida ou procura próximo mês onde bate
  const candidates: Array<{ y: number; m: number }> = [];
  if (month) candidates.push({ y: baseYear, m: month });
  // varrer próximos 14 meses a partir de hoje
  const now = new Date();
  const startMonth = now.getUTCFullYear() === baseYear ? now.getUTCMonth() + 1 : 1;
  for (let i = 0; i < 14; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = baseYear + Math.floor((startMonth - 1 + i) / 12);
    if (!candidates.some((c) => c.y === y && c.m === m)) candidates.push({ y, m });
  }

  for (const { y, m } of candidates) {
    const d = new Date(Date.UTC(y, m - 1, day));
    if (d.getUTCMonth() + 1 !== m) continue; // dia inválido (31 de fev etc)
    if (d.getUTCDay() === weekday) {
      const reason = month && m !== month
        ? `Mês ajustado: ${day}/${String(month).padStart(2, "0")} não cai em ${WEEKDAY_NAMES[weekday][0]} em ${baseYear}; usado ${day}/${String(m).padStart(2, "0")}/${y}.`
        : null;
      return { date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`, reason };
    }
  }

  return { date: null, reason: "Nenhum mês compatível encontrado para dia+weekday" };
}

function detectGenreFromText(text: string): { sub: string | null; confidence: "high" | "medium" | "low" } {
  const t = normText(text);
  let bestSub: string | null = null;
  let bestHits = 0;
  for (const [sub, kws] of Object.entries(GENRE_KEYWORDS)) {
    const hits = kws.reduce((acc, k) => acc + (t.includes(k) ? 1 : 0), 0);
    if (hits > bestHits) { bestHits = hits; bestSub = sub; }
  }
  if (bestHits === 0) return { sub: null, confidence: "low" };
  if (bestHits >= 2) return { sub: bestSub, confidence: "high" };
  return { sub: bestSub, confidence: "medium" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdmin } = await import("../_shared/requireAdmin.ts");
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { image_url, current_year, verified_partners = [], admin_feedback = [] } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const year = current_year || BASE_YEAR;

    const verifiedPartnersText = Array.isArray(verified_partners) && verified_partners.length
      ? verified_partners
          .slice(0, 80)
          .map((p: any) => {
            const dna = [p?.type ? `tipo=${p.type}` : null, p?.sub_category ? `gênero base=${p.sub_category}` : null]
              .filter(Boolean).join(", ");
            return `- ${p?.name || ""}${p?.instagram ? ` (${p.instagram})` : ""}${p?.address ? ` — ${p.address}` : ""}${dna ? `  [DNA: ${dna}]` : ""}`;
          })
          .join("\n")
      : "Nenhum parceiro verificado enviado.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia metadados deste flyer. Ano base: ${year}. Use o DNA dos parceiros para definir categoria/gênero quando o local bater. Parceiros verificados:\n${verifiedPartnersText}\n\nResponda apenas JSON.` },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        temperature: 0.6,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "payment_required" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeJson(raw);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "parse_failed", raw }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============== Sanitização base ==============
    let cat = ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : "festa";
    const subRaw = typeof parsed.sub_category === "string" && parsed.sub_category ? parsed.sub_category : cat;
    let sub = ALLOWED_SUBS.includes(subRaw) ? subRaw : cat;

    const fullText = normText(`${raw} ${parsed.title || ""} ${parsed.description || ""} ${parsed.venue_name || ""}`);

    // ============== Tags comerciais ==============
    const aiTags = Array.isArray(parsed.opportunity_tags) ? parsed.opportunity_tags : [];
    const tags = new Set<string>(aiTags.filter((t: unknown) => typeof t === "string"));
    if (/open bar|bebida liberada|\bopen\b/.test(fullText)) tags.add("open_bar");
    if (/double drink|drink em dobro|dobrado/.test(fullText)) tags.add("double_drink");
    if (/entrada free|free ate|entrada gratuita/.test(fullText)) tags.add("entrada_free");
    if (/promocao|combo|cupom|desconto/.test(fullText)) tags.add("promocao");

    // ============== 🧬 DNA do parceiro ==============
    const venueNorm = normText(parsed.venue_name);
    const verifiedMatch = Array.isArray(verified_partners)
      ? verified_partners.find((p: any) => {
          const name = normText(p?.name);
          return name.length >= 4 && venueNorm && (venueNorm.includes(name) || name.includes(venueNorm));
        })
      : null;

    let dna_applied: string | null = null;
    if (verifiedMatch) {
      parsed.venue_name = verifiedMatch.name || parsed.venue_name;
      parsed.address = verifiedMatch.address || parsed.address || null;
      parsed.instagram = verifiedMatch.instagram || parsed.instagram || null;

      // Aplica DNA: tipo do parceiro vira category, sub_category vira gênero base
      const partnerType: string = normText(verifiedMatch.type);
      const partnerSub: string = normText(verifiedMatch.sub_category);

      // Mapa tipo do parceiro -> category
      const typeToCat: Record<string, string> = {
        "bar": "bar", "pub": "bar", "boteco": "bar", "choperia": "bar", "gastrobar": "bar",
        "balada": "balada", "club": "balada",
        "lounge": "lounge",
        "restaurante": "restaurante", "churrascaria": "restaurante",
        "espetinho": "espetinho", "espetaria": "espetinho",
        "casa de shows": "show", "casa de show": "show", "arena": "show", "teatro": "show",
        "universitario": "universitario",
        "cultural": "cultural",
      };
      const dnaCat = typeToCat[partnerType] || null;

      // Detecta gênero forte do flyer pra ver se a IA pode override do DNA
      const detected = detectGenreFromText(fullText);
      const strongGenreOverride = detected.confidence === "high" && detected.sub && detected.sub !== partnerSub;

      if (dnaCat) {
        cat = dnaCat;
        dna_applied = `Categoria do parceiro (${verifiedMatch.name})`;
      }
      if (partnerSub && GENRE_SUBS.has(partnerSub) && !strongGenreOverride) {
        sub = partnerSub;
        dna_applied = `${dna_applied || "DNA"} + gênero base ${partnerSub}`;
      } else if (strongGenreOverride && detected.sub) {
        sub = detected.sub;
        dna_applied = `${dna_applied || "DNA"} sobreposto por gênero forte do flyer (${detected.sub})`;
      }
    }

    // ============== 🟣 Override por palavra-chave do venue (fallback se sem DNA) ==============
    let category_override_reason: string | null = dna_applied;
    if (!verifiedMatch) {
      const venueLower = (parsed.venue_name || "").toString().toLowerCase();
      const venueMap: Array<{ keys: string[]; cat: string; label: string }> = [
        { keys: ["gastrobar", "boteco", "choperia", "pub", " bar ", "bar "], cat: "bar", label: "Bar / Gastrobar" },
        { keys: ["restaurante", "churrascaria"], cat: "restaurante", label: "Restaurante" },
        { keys: ["espetaria", "espetinho"], cat: "espetinho", label: "Espetaria / Espetinho" },
        { keys: ["lounge", "rooftop"], cat: "lounge", label: "Lounge" },
        { keys: ["arena", "estádio", "estadio", "teatro", "casa de show", "recinto"], cat: "show", label: "Casa de show / Arena / Recinto" },
        { keys: ["club", "balada", "disco", "night"], cat: "balada", label: "Club / Balada" },
      ];
      if (venueLower) {
        const padded = ` ${venueLower} `;
        for (const rule of venueMap) {
          if (rule.keys.some((k) => padded.includes(k))) {
            if (cat !== rule.cat) {
              const musicCats = new Set(["balada", "festa", "show"]);
              if (musicCats.has(cat)) {
                if (!GENRE_SUBS.has(sub)) {
                  if (cat === "balada") sub = "eletronica";
                  else if (cat === "show") sub = "mpb";
                }
                category_override_reason = `Local identificado como ${rule.label}`;
                cat = rule.cat;
              }
            }
            break;
          }
        }
      }
    }

    // ============== 🎓 Aprendizado: correções salvas pelo admin (PRIORIDADE MÁXIMA) ==============
    let admin_feedback_applied: string | null = null;
    if (Array.isArray(admin_feedback) && admin_feedback.length && parsed.venue_name) {
      const vn = normText(parsed.venue_name);
      const fbMatch = admin_feedback.find((f: any) => {
        const fv = normText(f?.venue_name);
        return fv && fv.length >= 3 && (vn.includes(fv) || fv.includes(vn));
      });
      if (fbMatch) {
        if (fbMatch.corrected_sub_category && ALLOWED_SUBS.includes(fbMatch.corrected_sub_category)) {
          sub = fbMatch.corrected_sub_category;
        }
        if (fbMatch.corrected_category && ALLOWED_CATEGORIES.includes(fbMatch.corrected_category)) {
          cat = fbMatch.corrected_category;
        }
        admin_feedback_applied = `🎓 Correção aprendida do admin para "${parsed.venue_name}" → ${cat}/${sub}`;
        category_override_reason = `${category_override_reason ? category_override_reason + " | " : ""}${admin_feedback_applied}`;
      }
    }

    // ============== 🧠 Memória de gênero por venue (fallback sem DNA / sem feedback) ==============
    if (!verifiedMatch && !admin_feedback_applied) {
      const memory = lookupVenueMemory(parsed.venue_name);
      if (memory) {
        const detected = detectGenreFromText(fullText);
        const strongOverride = detected.confidence === "high" && detected.sub && detected.sub !== memory.sub;
        if (!strongOverride) {
          if (GENRE_SUBS.has(memory.sub)) {
            sub = memory.sub;
            category_override_reason = `${category_override_reason ? category_override_reason + " | " : ""}🧠 Memória do local "${parsed.venue_name}" → gênero ${memory.sub}`;
          }
          if (memory.cat && ["bar","balada","festa","espetinho","restaurante","lounge","show"].includes(memory.cat)) {
            cat = memory.cat;
          }
        } else if (detected.sub) {
          sub = detected.sub;
          category_override_reason = `${category_override_reason ? category_override_reason + " | " : ""}🧠 Memória do local sobreposta por gênero forte (${detected.sub})`;
        }
      }
    }

    // ============== 🎤 BAR vs SHOW (recinto / nacional) ==============
    if (cat === "bar" || cat === "festa") {
      if (NATIONAL_VENUE_KEYWORDS.some((k) => fullText.includes(k))) {
        cat = "show";
        category_override_reason = `${category_override_reason || ""} | Recinto de exposições/arena detectado → SHOW`.trim();
      }
    }

    // ============== 📅 Calendário Real V4 ==============
    let dateIso: string | null = ensureDefaultTime(parsed.date_iso);
    let date_validation_note: string | null = null;
    let date_needs_review = false;

    const aiDay = Number(parsed.date_day) || null;
    const aiMonth = Number(parsed.date_month) || null;
    const weekdayIdx = parseWeekday(parsed.date_weekday);

    if (aiDay) {
      const resolved = resolveCalendarDate({ day: aiDay, month: aiMonth, weekday: weekdayIdx, baseYear: BASE_YEAR });
      if (resolved.date) {
        // preserva hora declarada pela IA (se houver) ou 20:00
        const hourMatch = (parsed.date_iso || "").toString().match(/T(\d{1,2}):?(\d{2})?/);
        const hh = hourMatch ? hourMatch[1].padStart(2, "0") : "20";
        const mm = hourMatch && hourMatch[2] ? hourMatch[2] : "00";
        dateIso = `${resolved.date}T${hh}:${mm}`;
        if (resolved.reason) {
          date_validation_note = resolved.reason;
        }
      } else if (resolved.reason) {
        date_validation_note = resolved.reason;
        date_needs_review = true;
        dateIso = null;
      }
    }

    // ============== 📅 Trava de data retroativa ==============
    // Se a data resolvida (ou retornada direto pela IA) já passou, marcamos como REVISAR
    // e tentamos sugerir o próximo mês onde dia+weekday batem (caso tenhamos esses dados).
    if (dateIso) {
      const eventDate = new Date(`${dateIso}-03:00`);
      const now = new Date();
      const todayBrasilia = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      todayBrasilia.setHours(0, 0, 0, 0);
      if (!isNaN(eventDate.getTime()) && eventDate < todayBrasilia) {
        // tenta corrigir buscando próximo mês válido a partir de HOJE
        if (aiDay && weekdayIdx !== null) {
          const future = resolveCalendarDate({ day: aiDay, month: null, weekday: weekdayIdx, baseYear: BASE_YEAR });
          if (future.date) {
            const hourMatch = dateIso.match(/T(\d{1,2}):?(\d{2})?/);
            const hh = hourMatch ? hourMatch[1].padStart(2, "0") : "20";
            const mm = hourMatch && hourMatch[2] ? hourMatch[2] : "00";
            dateIso = `${future.date}T${hh}:${mm}`;
            date_validation_note = `[REVISAR DATA RETROATIVA] Data lida já passou; sugerido próximo ${WEEKDAY_NAMES[weekdayIdx][0]} ${future.date}.`;
          } else {
            date_validation_note = `[REVISAR DATA RETROATIVA] Data lida (${dateIso.slice(0,10)}) já passou e nenhum mês futuro compatível encontrado.`;
            dateIso = null;
          }
        } else {
          date_validation_note = `[REVISAR DATA RETROATIVA] Data lida (${dateIso.slice(0,10)}) já passou. Confirme manualmente.`;
        }
        date_needs_review = true;
      }
    }

    // ============== 🚧 Bounds duros: >1 ano futuro / >30d passado ==============
    if (dateIso) {
      const eventDate = new Date(`${dateIso}-03:00`);
      const now = Date.now();
      const oneYearAhead = now + 365 * 86400000;
      const thirtyDaysAgo = now - 30 * 86400000;
      if (!isNaN(eventDate.getTime())) {
        if (eventDate.getTime() > oneYearAhead) {
          date_validation_note = `[REVISAR] Data >1 ano no futuro (${dateIso.slice(0,10)}) — provável erro de ano.`;
          date_needs_review = true;
          dateIso = null;
        } else if (eventDate.getTime() < thirtyDaysAgo) {
          date_validation_note = `[REVISAR] Data >30 dias no passado (${dateIso.slice(0,10)}).`;
          date_needs_review = true;
          dateIso = null;
        }
      }
    }

    // ============== 🚧 Sanidade dia/mês quando IA mandou direto ==============
    if (aiMonth && (aiMonth < 1 || aiMonth > 12)) {
      date_validation_note = `[REVISAR] Mês inválido (${aiMonth}).`;
      date_needs_review = true;
      dateIso = null;
    }
    if (aiDay && (aiDay < 1 || aiDay > 31)) {
      date_validation_note = `[REVISAR] Dia inválido (${aiDay}).`;
      date_needs_review = true;
      dateIso = null;
    }

    // Confiança baixa da IA → marcar para revisão
    const dateConf = String(parsed.date_confidence || parsed.confidence || "medium").toLowerCase();
    if (dateConf === "low") {
      date_needs_review = true;
    }

    // ============== 🎯 Score numérico de confiança da data (0–100) ==============
    let date_confidence_score = 0;
    let date_confidence_label: "high" | "medium" | "low" = "low";
    if (!dateIso) {
      date_confidence_score = 0;
    } else if (aiDay && aiMonth && weekdayIdx !== null && !date_needs_review) {
      // dia+mês+weekday coerentes e dentro dos limites → máxima
      date_confidence_score = dateConf === "high" ? 95 : 85;
    } else if (aiDay && aiMonth && !date_needs_review) {
      date_confidence_score = dateConf === "high" ? 80 : 70;
    } else if (aiDay && !date_needs_review) {
      date_confidence_score = 55;
    } else {
      date_confidence_score = 40;
    }
    if (date_needs_review) date_confidence_score = Math.min(date_confidence_score, 35);
    if (dateConf === "low") date_confidence_score = Math.min(date_confidence_score, 45);
    if (date_confidence_score >= 80) date_confidence_label = "high";
    else if (date_confidence_score >= 55) date_confidence_label = "medium";
    else date_confidence_label = "low";

    console.log("[extract-flyer-metadata] date pipeline", {
      aiDay, aiMonth, weekdayIdx, dateIso, date_needs_review,
      date_confidence_score, date_confidence_label, note: date_validation_note,
    });


    // ============== 🔒 Gênero com confiança baixa → REVISAR ==============
    const genreConf = String(parsed.genre_confidence || "medium").toLowerCase();
    let genre_needs_review = false;
    if (genreConf === "low" && !verifiedMatch) {
      // sem DNA E sem certeza do flyer → pedir revisão (mantém sub mas sinaliza)
      const detected = detectGenreFromText(fullText);
      if (detected.confidence === "low") {
        genre_needs_review = true;
      } else if (detected.sub) {
        sub = detected.sub;
      }
    }

    // ============== Título: limpeza ==============
    let title: string = (parsed.title || "").toString();
    title = title
      .replace(/\s*[—–-]\s*/g, " ")
      .replace(/\s*[:\/|]\s*/g, " ")
      .replace(/\b(?:IMPERD[IÍ]VEL|SEXTA INSANA|S[ÁA]BADO IMPERD[IÍ]VEL|NOITE IMPERD[IÍ]VEL|ROL[ÊE] IMPERD[IÍ]VEL|VIBE INSANA|NOITE INESQUEC[IÍ]VEL|EXPERI[ÊE]NCIA [ÚU]NICA|SE PREPARA)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    // ============== 🎯 Score final de confiança da IA ==============
    // high  : admin_feedback OR (DNA verificado) OR (memória + texto concordam)
    // medium: apenas um sinal (memória OU texto)
    // low   : conflito ou nenhum sinal além do palpite da IA
    const detectedFinal = detectGenreFromText(fullText);
    let aiConfidence: "high" | "medium" | "low" = "medium";
    if (admin_feedback_applied || verifiedMatch) {
      aiConfidence = "high";
    } else {
      const venueMem = lookupVenueMemory(parsed.venue_name);
      const memSub = venueMem?.sub;
      const textSub = detectedFinal.sub;
      if (memSub && textSub && memSub === textSub) aiConfidence = "high";
      else if (memSub && textSub && memSub !== textSub) aiConfidence = "low";
      else if (!memSub && !textSub) aiConfidence = String(parsed.genre_confidence || "low").toLowerCase() === "high" ? "medium" : "low";
      else aiConfidence = "medium";
    }
    const needsReview = aiConfidence === "low" || genre_needs_review || date_needs_review;

    return new Response(JSON.stringify({
      title,
      date_iso: dateIso,
      date_needs_review,
      date_validation_note,
      date_confidence_score,
      date_confidence_label,
      venue_name: parsed.venue_name || null,
      venue_confidence: parsed.venue_confidence || "low",
      address: parsed.address || null,
      instagram: parsed.instagram || null,
      category: cat,
      sub_category: sub,
      genre_needs_review,
      genre_confidence: genreConf,
      ai_confidence: aiConfidence,
      needs_review: needsReview,
      opportunity_tags: Array.from(tags).filter((t) => ["open_bar", "double_drink", "entrada_free", "promocao"].includes(t)),
      ticket_url: null,
      confidence: parsed.confidence || "medium",
      category_override_reason,
      dna_applied,
      admin_feedback_applied,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
