export { default } from "@/apps/admin/pages/EventoBulkForm";
          const fillMissing = bd.enabled && bd.mode === "missing";
          const pickBatch = <T,>(extractedVal: T, batchVal: T | "" | null | undefined, extractedExists: boolean): T => {
            if (!bd.enabled || !batchVal) return extractedVal;
            if (force) return batchVal as T;
            if (fillMissing && !extractedExists) return batchVal as T;
            return extractedVal;
          };

          // date_time: combina batch date + batch time quando aplicável
          const extractedHasDate = !!extractedDateTime && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(extractedDateTime);
          const extractedHasTime = extractedHasDate && data.time_is_unknown !== true;
          let finalDateTime = extractedDateTime;
          let finalTimeIsUnknown: boolean = data.time_is_unknown === true || !extractedHasTime;
          if (bd.enabled && (bd.date || bd.time)) {
            const useBatchDate = force ? !!bd.date : fillMissing ? (!extractedHasDate && !!bd.date) : false;
            const useBatchTime = force ? !!bd.time : fillMissing ? (!extractedHasTime && !!bd.time) : false;
            const baseDate = useBatchDate ? bd.date : (extractedHasDate ? extractedDateTime.slice(0, 10) : "");
            const baseTime = useBatchTime ? bd.time : (extractedHasTime ? extractedDateTime.slice(11, 16) : "");
            if (baseDate && baseTime) {
              finalDateTime = `${baseDate}T${baseTime}`;
              finalTimeIsUnknown = false;
            } else if (baseDate) {
              finalDateTime = `${baseDate}T00:00`;
              finalTimeIsUnknown = true;
            }
          }

          // venue/partner
          const batchPartner = bd.enabled && bd.partner_id ? partners.find((p) => p.id === bd.partner_id) : null;
          const partnerObj = pickBatch(matched, batchPartner, !!matched);
          const finalCategory = pickBatch(
            data.category || it.form.category,
            bd.category,
            !!data.category,
          );
          const finalSub = pickBatch(
            data.sub_category || "",
            bd.sub_category,
            !!data.sub_category,
          );

          const next: EventFormData = {
            ...it.form,
            image_url: publicUrl,
            image_hash: imageHash,
            title: upperTitle,
            slug: upperTitle ? slugify(upperTitle) : it.form.slug,
            date_time: finalDateTime,
            time_is_unknown: finalTimeIsUnknown,
            category: finalCategory,
            venue_name: partnerObj ? partnerObj.name : (data.venue_name || ""),
            address: partnerObj ? (partnerObj.address || "") : (data.address || ""),
            instagram: partnerObj ? (partnerObj.instagram || "") : (data.instagram || ""),
            partner_id: partnerObj ? partnerObj.id : "",
            ticket_url: "",
            verification_source: "instagram",
            opportunity_tags: data.opportunity_tags || [],
            ...(finalSub ? { _sub: finalSub } as any : {}),
            ...(data.ai_confidence ? { ai_confidence: data.ai_confidence } as any : {}),
            needs_review: finalNeedsReview,
          } as EventFormData;
          readyForm = next;
          return { ...it, form: next, status: "ready", categoryWarning };
        }),
      );


      // Auto-generate rich description (Persona V2) — only after metadata is confirmed valid
      const f = readyForm as EventFormData | null;
      if (f && f.title && f.title.length > 3) {
        try {
          const previousDescs = items
            .map((x) => x.form.description)
            .filter((d): d is string => !!d && d.length > 30)
            .slice(-5);
          const descResp = await supabase.functions.invoke("generate-description", {
            body: {
              title: f.title,
              venue_name: f.venue_name || "",
              address: f.address || "",
              date_time: f.date_time || "",
              category: f.category || "festa",
              sub_category: (f as any)._sub || "",
              partner_id: f.partner_id || undefined,
              seed_index: Date.now() % 10000 + Math.floor(Math.random() * 100),
              previous_descriptions: previousDescs,
            },
          });
          if (!descResp.error && descResp.data) {
            const rich = descResp.data?.descricao_rica || descResp.data?.description;
            if (rich && typeof rich === "string") {
              patchForm(localId, { description: rich });
            }
          }
        } catch (descErr) {
          console.warn("[bulk] auto description failed", descErr);
        }
      }
    } catch (err: any) {
      console.error("[bulk] process error", err);
      patchItem(localId, { status: "error", errorMsg: err?.message || "Falha ao processar" });
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    console.log(`[bulk] selected ${arr.length} flyer(s)`);

    // 1) Cria placeholders IMEDIATAMENTE com status "queued" — UI responde no ato.
    const placeholders: BulkItem[] = arr.map((file) => {
      const localId = crypto.randomUUID();
      fileMapRef.current.set(localId, file);
      // Aviso amigável para arquivos muito grandes (>8MB) — apenas log/toast, não bloqueia.
      if (file.size > 8 * 1024 * 1024) {
        console.warn(`[bulk] arquivo grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      }
      return {
        localId,
        fileName: file.name,
        thumbDataUrl: "",
        status: "queued",
        expanded: false,
        form: emptyEventForm(),
      };
    });
    setItems((prev) => [...prev, ...placeholders]);

    // 2) Geração de thumbnails em background, com yield entre cada item
    //    para não travar a thread principal.
    (async () => {
      for (let i = 0; i < arr.length; i++) {
        const thumb = await makeThumb(arr[i]);
        patchItem(placeholders[i].localId, { thumbDataUrl: thumb });
        // yield para o navegador respirar (pintura, scroll, inputs)
        await new Promise((r) => setTimeout(r, 0));
      }
    })();

    // 3) Pool de concorrência: processa no máximo 2 em paralelo.
    //    Erros individuais NÃO derrubam o lote — ficam isolados no item.
    const CONCURRENCY = 2;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, arr.length) }, async () => {
      while (true) {
        const my = cursor++;
        if (my >= arr.length) return;
        const file = arr[my];
        const localId = placeholders[my].localId;
        const t0 = performance.now();
        console.log(`[bulk] start ${my + 1}/${arr.length} ${file.name}`);
        try {
          await uploadAndProcess(file, localId);
        } catch (e) {
          console.error(`[bulk] item ${my + 1} fatal`, e);
        }
        console.log(`[bulk] done  ${my + 1}/${arr.length} ${file.name} in ${Math.round(performance.now() - t0)}ms`);
      }
    });
    await Promise.all(workers);
    console.log(`[bulk] all ${arr.length} processed`);
  }

  // Retry isolado de um único item com erro
  async function retryItem(localId: string) {
    const file = fileMapRef.current.get(localId);
    if (!file) {
      toast.error("Arquivo original indisponível — re-suba o flyer.");
      return;
    }
    patchItem(localId, { status: "queued", errorMsg: undefined });
    await uploadAndProcess(file, localId);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function removeItem(localId: string) {
    fileMapRef.current.delete(localId);
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }
  function addBlankItem() {
    const bd = batchDefaultsRef.current;
    const base = emptyEventForm();
    if (bd.enabled) {
      if (bd.date && bd.time) {
        base.date_time = `${bd.date}T${bd.time}`;
        base.time_is_unknown = false;
      } else if (bd.date) {
        base.date_time = `${bd.date}T00:00`;
        base.time_is_unknown = true;
      }
      if (bd.category) base.category = bd.category;
      if (bd.sub_category) (base as any)._sub = bd.sub_category;
      if (bd.partner_id) {
        const p = partners.find((x) => x.id === bd.partner_id);
        if (p) {
          base.partner_id = p.id;
          base.venue_name = p.name;
          base.address = p.address || "";
          base.instagram = p.instagram || "";
        }
      }
    }
    setItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        fileName: "Sem flyer",
        thumbDataUrl: "",
        status: "ready",
        expanded: true,
        form: base,
      },
    ]);
  }

  /**
   * Aplica padrões do lote em TODOS os eventos já carregados, em uma única
   * atualização de estado. Evita reprocessar IA e evita re-render a cada
   * tecla nos campos de padrão.
   */
  const applyBatchDefaultsToAll = useCallback(() => {
    const bd = batchDefaultsRef.current;
    if (!bd.enabled) {
      toast.info("Ative os padrões antes de aplicar.");
      return;
    }
    const partner = bd.partner_id ? partners.find((p) => p.id === bd.partner_id) || null : null;
    let touched = 0;
    setItems((prev) =>
      prev.map((it) => {
        if (it.status !== "ready") return it;
        const force = bd.mode === "all";
        const fillMissing = bd.mode === "missing";
        const f = it.form;
        const hasDate = !!f.date_time && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(f.date_time);
        const hasTime = hasDate && f.time_is_unknown !== true;
        const next: EventFormData = { ...f };
        let changed = false;

        if (bd.date || bd.time) {
          const useBatchDate = force ? !!bd.date : fillMissing ? (!hasDate && !!bd.date) : false;
          const useBatchTime = force ? !!bd.time : fillMissing ? (!hasTime && !!bd.time) : false;
          const baseDate = useBatchDate ? bd.date : (hasDate ? f.date_time.slice(0, 10) : "");
          const baseTime = useBatchTime ? bd.time : (hasTime ? f.date_time.slice(11, 16) : "");
          if (baseDate && baseTime) {
            const dt = `${baseDate}T${baseTime}`;
            if (dt !== f.date_time) { next.date_time = dt; next.time_is_unknown = false; changed = true; }
          } else if (baseDate) {
            const dt = `${baseDate}T00:00`;
            if (dt !== f.date_time) { next.date_time = dt; next.time_is_unknown = true; changed = true; }
          }
        }
        if (bd.partner_id && partner && (force || (fillMissing && !f.partner_id))) {
          if (next.partner_id !== partner.id) {
            next.partner_id = partner.id;
            next.venue_name = partner.name;
            next.address = partner.address || "";
            next.instagram = partner.instagram || "";
            changed = true;
          }
        }
        if (bd.category && (force || (fillMissing && !f.category))) {
          if (next.category !== bd.category) { next.category = bd.category; changed = true; }
        }
        if (bd.sub_category && (force || (fillMissing && !(f as any)._sub))) {
          if ((next as any)._sub !== bd.sub_category) { (next as any)._sub = bd.sub_category; changed = true; }
        }
        if (changed) touched++;
        return changed ? { ...it, form: next } : it;
      }),
    );
    toast.success(`Padrões aplicados em ${touched} evento(s).`);
  }, [partners]);


  async function handleGenerateDescription(localId: string) {
    const it = items.find((x) => x.localId === localId);
    if (!it || !it.form.title) return;
    setGeneratingDescIds((s) => new Set(s).add(localId));
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: it.form.title,
          venue_name: it.form.venue_name,
          address: it.form.address,
          date_time: it.form.date_time,
          category: it.form.category,
          sub_category: (it.form as any)._sub || "",
          partner_id: it.form.partner_id || undefined,
          seed_index: Date.now() % 10000 + Math.floor(Math.random() * 100),
        },
      });
      if (error) throw error;
      const rich = data?.descricao_rica || data?.description;
      if (rich) {
        patchForm(localId, { description: rich });
        if (data?.chamada_site) toast.success(`Copy: "${data.chamada_site}"`);
      }
    } catch {
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingDescIds((s) => {
        const n = new Set(s);
        n.delete(localId);
        return n;
      });
    }
  }

  async function handleGenerateAllCaptions() {
    const targets = items.filter((it) => it.status === "ready" && it.form.title && !it.form.description);
    if (!targets.length) {
      toast.info("Todas as legendas já foram geradas");
      return;
    }
    setBulkGenerating(true);
    toast.info(`Gerando ${targets.length} legenda(s)...`);
    for (const it of targets) {
      await handleGenerateDescription(it.localId);
    }
    setBulkGenerating(false);
    toast.success("Legendas do lote geradas!");
  }

  /**
   * ✨ Fase 2B — Gera títulos + descrições + SEO + caption IG para todos os itens
   * elegíveis do lote, usando a edge function generate-description (gpt-5-mini).
   *
   * Regras de pular item:
   *   - status !== "ready"
   *   - item marcado como duplicado (duplicateIds)
   *   - smartDuplicates.decision === "confirmed"
   *   - sem título OU sem (venue_name + date_time)
   *
   * Concorrência: 2 chamadas simultâneas, com progresso e botão Parar.
   * Confidence < 70 → marca needs_review (vai p/ rascunho mesmo se admin clicar Publicar).
   */
  async function handleBulkGenerateAi() {
    if (bulkAiRunning) return;
    const eligible = items.filter((it) => {
      if (it.status !== "ready") return false;
      if (!it.form.title) return false;
      if (!it.form.venue_name || !it.form.date_time) return false;
      const sd = smartDuplicates.get(it.localId);
      if (sd?.decision === "confirmed") return false;
      if (duplicateIds.has(it.localId)) return false;
      return true;
    });

    const duplicatesSkipped = items.filter(
      (it) => duplicateIds.has(it.localId) || smartDuplicates.get(it.localId)?.decision === "confirmed",
    ).length;

    if (!eligible.length) {
      toast.info(`Nenhum item elegível. ${duplicatesSkipped} duplicado(s) ignorado(s).`);
      return;
    }

    bulkAiAbortRef.current = false;
    setBulkAiRunning(true);
    setBulkAiCounts({ generated: 0, review: 0, duplicatesSkipped, errors: 0 });
    setBulkAiProgress({ current: 0, total: eligible.length });
    toast.info(`Gerando ${eligible.length} descrição(ões) com IA...`);

    let completed = 0;
    const CONCURRENCY = 2;
    let cursor = 0;

    async function processOne(it: BulkItem) {
      if (bulkAiAbortRef.current) return;
      try {
        const { data, error } = await supabase.functions.invoke("generate-description", {
          body: {
            title: it.form.title,
            venue_name: it.form.venue_name,
            address: it.form.address,
            date_time: it.form.date_time,
            category: it.form.category,
            sub_category: (it.form as any)._sub || "",
            partner_id: it.form.partner_id || undefined,
            time_is_unknown: Boolean(it.form.time_is_unknown),
            ticket_url: it.form.ticket_url || "",
            instagram: it.form.instagram || "",
          },
        });
        if (error) throw error;

        const rich: string = data?.description_html || data?.descricao_rica || data?.description || "";
        const chamada: string | undefined = data?.title || data?.chamada_site;
        const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
        const confidence: number | null =
          typeof data?.ai_confidence_score === "number" ? data.ai_confidence_score : null;
        const lowConfidence = typeof confidence === "number" && confidence < 70;

        patchForm(it.localId, {
          title: chamada || it.form.title,
          description: rich || it.form.description,
          short_summary: data?.short_summary || "",
          meta_title: data?.meta_title || "",
          meta_description: data?.meta_description || "",
          instagram_caption: data?.instagram_caption || "",
          ai_confidence_score: confidence,
          ai_warnings: warnings,
          needs_review: lowConfidence || warnings.length > 0,
        });

        setBulkAiCounts((c) => ({
          ...c,
          generated: c.generated + 1,
          review: c.review + (lowConfidence || warnings.length > 0 ? 1 : 0),
        }));
      } catch (err: any) {
        console.error("[bulk-ai] item failed", it.localId, err);
        setBulkAiCounts((c) => ({ ...c, errors: c.errors + 1 }));
      } finally {
        completed += 1;
        setBulkAiProgress({ current: completed, total: eligible.length });
      }
    }

    async function worker() {
      while (!bulkAiAbortRef.current) {
        const i = cursor++;
        if (i >= eligible.length) return;
        await processOne(eligible[i]);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, eligible.length) }, worker));

    setBulkAiRunning(false);
    if (bulkAiAbortRef.current) {
      toast.warning(`Geração interrompida. ${completed}/${eligible.length} processados.`);
    } else {
      toast.success(`✅ ${completed} descrição(ões) geradas pela IA.`);
    }
  }

  function cancelBulkAi() {
    bulkAiAbortRef.current = true;
  }

  function handlePartnerSelect(localId: string, partnerId: string) {
    if (!partnerId) {
      patchForm(localId, { partner_id: "" });
      return;
    }
    const p = partners.find((x) => x.id === partnerId);
    if (!p) return;
    patchForm(localId, {
      partner_id: partnerId,
      venue_name: p.name,
      address: p.address || "",
      instagram: p.instagram || "",
    });
  }

  async function handleBulkSave(status: "draft" | "published") {
    const ready = items.filter((it) => it.status === "ready");
    if (!ready.length) {
      toast.error("Nenhum evento pronto para salvar");
      return;
    }

    // ── Classificação fina ─────────────────────────────────────────────
    //   incomplete   → faltam dados essenciais (bloqueia, não é duplicado)
    //   confirmed    → duplicado real (image_hash, slug, score>=95)
    //   possible     → possível duplicado (60–94) → permite c/ Publicar mesmo assim
    //   clear        → ok
    const incomplete: BulkItem[] = [];
    const confirmed: BulkItem[] = [];
    const possibleBlocked: BulkItem[] = []; // possible sem forçar
    const possibleForced: BulkItem[] = []; // possible com forçar
    const clear: BulkItem[] = [];
    for (const it of ready) {
      if (itemFlags.incompleteIds.has(it.localId)) {
        incomplete.push(it);
      } else if (itemFlags.confirmedRealIds.has(it.localId)) {
        confirmed.push(it);
      } else if (itemFlags.possibleDupIds.has(it.localId)) {
        if (forcePublishIds.has(it.localId)) possibleForced.push(it);
        else possibleBlocked.push(it);
      } else {
        clear.push(it);
      }
    }

    const toInsert = [...clear, ...possibleForced];

    if (!toInsert.length) {
      const lines = ready.map((it, idx) => {
        const i = idx + 1;
        const titulo = it.form.title || "(sem título)";
        if (itemFlags.confirmedRealIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: duplicado real já existente`;
        }
        if (itemFlags.possibleDupIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: possível duplicado (use "Publicar mesmo assim" no item)`;
        }
        if (itemFlags.incompleteIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: dados incompletos`;
        }
        return `• Evento ${i} — ${titulo}: pronto`;
      }).join("\n");
      toast.warning(
        `Nenhum evento foi publicado. Verifique os itens marcados abaixo.\n\n${lines}`,
        { duration: 14000 },
      );
      return;
    }

    // Confirmação se vai pular ou forçar duplicados
    if (confirmed.length || possibleBlocked.length || possibleForced.length || incomplete.length) {
      const summary =
        `📦 Resumo do lote\n` +
        `─────────────────\n` +
        `Eventos prontos: ${ready.length}\n` +
        `✅ Novos (sem suspeita): ${clear.length}\n` +
        (possibleForced.length ? `⚠ Possíveis duplicados forçados pelo admin: ${possibleForced.length}\n` : "") +
        (possibleBlocked.length ? `⚠ Possíveis duplicados ignorados: ${possibleBlocked.length}\n` : "") +
        (confirmed.length ? `🚫 Duplicados reais (não serão enviados): ${confirmed.length}\n` : "") +
        (incomplete.length ? `📝 Dados incompletos (não serão enviados): ${incomplete.length}\n` : "") +
        `\nSerão ${status === "published" ? "publicados" : "salvos como rascunho"}: ${toInsert.length}\n\nContinuar?`;
      if (!confirm(summary)) return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();

    // === Guard de ingestão por item — IMPORTANTE ===
    // O guard ainda pode retornar MESMO_FLYER/DUPLICATA, mas no fluxo em lote
    // a CLASSIFICAÇÃO acima já é a fonte de verdade. Guard só bloqueia
    // motivos que NÃO são duplicidade: FORA_DO_ESCOPO e EVENTO_NO_PASSADO.
    const guarded: Array<{
      it: BulkItem;
      payload: any;
      guard: Awaited<ReturnType<typeof validateBeforePublish>>;
      blocked: boolean;
      blockReason?: string;
    }> = [];
    for (const it of toInsert) {
      const isPossible = itemFlags.possibleDupIds.has(it.localId);
      const guard = await validateBeforePublish({
        source: "bulk",
        title: it.form.title,
        description: (it.form as any).description,
        venue_name: it.form.venue_name,
        partner_id: it.form.partner_id || null,
        date_time: it.form.date_time,
        image_url: it.form.image_url,
        image_hash: it.form.image_hash,
      });
      // Somente motivos NÃO-duplicidade bloqueiam aqui:
      const NON_DUP_BLOCKS = new Set(["FORA_DO_ESCOPO", "EVENTO_NO_PASSADO"]);
      const hardBlocks = guard.blockReasons.filter((r) => NON_DUP_BLOCKS.has(r));
      const needsReview = isPossible || guard.recommendedNeedsReview;
      const itemStatus: "draft" | "published" = (needsReview || hardBlocks.length) ? "draft" : status;
      const base = buildEventPayload(
        { ...it.form, needs_review: needsReview || (it.form as any).needs_review },
        { city: cityFilter, status: itemStatus },
      );
      const payload = {
        ...base,
        dedupe_key: generateEventDedupeKey({
          partner_id: it.form.partner_id || null,
          title: it.form.title,
          date_time: it.form.date_time,
          venue_name: it.form.venue_name,
        }),
        flyer_fingerprint: generateFlyerFingerprint({
          image_hash: it.form.image_hash,
          image_url: it.form.image_url,
        }),
        duplicate_checked_at: nowIso,
      };
      guarded.push({
        it,
        payload,
        guard,
        blocked: hardBlocks.length > 0,
        blockReason: hardBlocks.map((r) => REASON_LABELS[r] || r).join(", "),
      });
    }

    const guardBlocked = guarded.filter((g) => g.blocked);
    const payloads = guarded.filter((g) => !g.blocked).map((g) => g.payload);

    if (!payloads.length) {
      setSaving(false);
      const lines = guardBlocked
        .map((g, idx) => `• Evento ${idx + 1} — ${g.it.form.title || "(sem título)"}: ${g.blockReason || "validação"}`)
        .join("\n");
      toast.warning(
        `Nenhum evento foi publicado. Verifique os itens marcados abaixo.\n\n${lines}`,
        { duration: 14000 },
      );
      return;
    }

    try {
      const { data: insertedRows, error } = await supabase.from("events").insert(payloads as any).select("id");
      if (error) throw error;

      const ids = insertedRows || [];
      await Promise.all(
        guarded
          .filter((g) => !g.blocked)
          .map((g, idx) => persistValidationLog(g.guard.validationLog, ids[idx]?.id ?? null)),
      );
      await Promise.all(guardBlocked.map((g) => persistValidationLog(g.guard.validationLog)));

      const skippedTotal = confirmed.length + possibleBlocked.length + incomplete.length + guardBlocked.length;
      toast.success(
        `Lote: ${clear.length} novo(s) • ${possibleForced.length} forçado(s) • ${skippedTotal} não enviado(s)`,
        { duration: 8000 },
      );
      if (guardBlocked.length) {
        const reasons = Array.from(new Set(guardBlocked.flatMap((g) => g.guard.blockReasons))).map((r) => REASON_LABELS[r] || r);
        toast.warning(`Motivos de validação: ${reasons.join(", ")}`, { duration: 9000 });
      }
      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }


  const readyCount = items.filter((it) => it.status === "ready").length;
  const processingCount = items.filter((it) => it.status === "uploading" || it.status === "extracting").length;
  const queuedCount = items.filter((it) => it.status === "queued").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const totalCount = items.length;
  const doneForProgress = readyCount + errorCount;
  const progressPct = totalCount ? Math.round((doneForProgress / totalCount) * 100) : 0;

  return (
    <div className="md:ml-44 max-w-3xl pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Criar Eventos em Lote</h1>
          <p className="text-[11px] text-muted-foreground">
            Suba os banners e a IA preenche título, data, local e categoria.
          </p>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {readyCount} pronto(s) · {processingCount} processando · {queuedCount} na fila · {errorCount} erro
          </span>
        )}
      </div>

      {/* Barra de progresso geral do lote */}
      {totalCount > 0 && (processingCount > 0 || queuedCount > 0) && (
        <div className="mb-3" aria-label="Progresso do lote">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {doneForProgress}/{totalCount} processados ({progressPct}%)
          </p>
        </div>
      )}

      {/* === 🧭 Padrões do Lote (opcional) === */}
      <BatchDefaultsSection
        value={batchDefaults}
        onChange={setBatchDefaults}
        partners={partners}
        onApply={applyBatchDefaultsToAll}
        hasItems={items.length > 0}
      />


      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-card/40 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Suba seus Flyers aqui (Lote)
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          A IA lê o flyer e preenche os campos automaticamente · múltiplos arquivos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Banners ({items.length})
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {items.map((it) => (
              <div key={it.localId} className="relative aspect-square rounded-lg overflow-hidden border border-border/40 bg-secondary/30 group">
                {it.thumbDataUrl ? (
                  <img
                    src={it.thumbDataUrl}
                    alt={it.fileName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground animate-pulse">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  {it.status === "queued" && (
                    <div className="flex items-center gap-1 text-[9px] text-white/80">
                      <Loader2 className="h-2.5 w-2.5 animate-spin opacity-60" /> fila
                    </div>
                  )}
                  {it.status === "uploading" && (
                    <div className="flex items-center gap-1 text-[9px] text-white">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> upload
                    </div>
                  )}
                  {it.status === "extracting" && (
                    <div className="flex items-center gap-1 text-[9px] text-primary-foreground bg-primary/80 rounded px-1">
                      <Sparkles className="h-2.5 w-2.5 animate-pulse" /> IA lendo
                    </div>
                  )}
                  {it.status === "ready" && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-300">
                      <CheckCircle2 className="h-2.5 w-2.5" /> pronto
                    </div>
                  )}
                  {it.status === "error" && (
                    <div className="flex items-center gap-1 justify-between">
                      <span className="flex items-center gap-1 text-[9px] text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" /> erro
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); retryItem(it.localId); }}
                        className="text-[9px] rounded bg-white/20 px-1 py-0.5 text-white hover:bg-white/30"
                        title={it.errorMsg || "Tentar novamente"}
                      >
                        retry
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(it.localId); }}
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review list */}
      {items.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Revisão do lote
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkGenerateAi}
                disabled={bulkAiRunning}
                className="admin-glow flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50"
                title="Gera título, descrição, SEO e legenda Instagram para todos os itens elegíveis (gpt-5-mini)"
              >
                {bulkAiRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {bulkAiRunning
                  ? `Gerando ${bulkAiProgress.current} de ${bulkAiProgress.total}…`
                  : "✨ Gerar títulos e descrições do lote com IA"}
              </button>
              {bulkAiRunning && (
                <button
                  type="button"
                  onClick={cancelBulkAi}
                  className="flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition"
                >
                  <X className="h-3 w-3" /> Parar
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateAllCaptions}
                disabled={bulkGenerating || bulkAiRunning}
                className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/50 transition disabled:opacity-50"
                title="(Legado) preenche apenas descrição em itens sem texto"
              >
                {bulkGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {bulkGenerating ? "Gerando..." : "Só descrições vazias"}
              </button>
              <button
                type="button"
                onClick={addBlankItem}
                className="admin-glow flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
              >
                <Plus className="h-3 w-3" /> Adicionar manual
              </button>
            </div>
          </div>

          {/* ✨ Contadores Fase 2B */}
          {(bulkAiRunning || bulkAiCounts.generated + bulkAiCounts.review + bulkAiCounts.duplicatesSkipped + bulkAiCounts.errors > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-emerald-300/80">Gerados c/ IA</p>
                <p className="text-sm font-bold text-emerald-200">{bulkAiCounts.generated}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-amber-300/80">Revisar (conf&lt;70)</p>
                <p className="text-sm font-bold text-amber-200">{bulkAiCounts.review}</p>
              </div>
              <div className="rounded-lg border border-muted-foreground/30 bg-secondary/30 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Duplicados ignorados</p>
                <p className="text-sm font-bold text-foreground">{bulkAiCounts.duplicatesSkipped}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Erros</p>
                <p className="text-sm font-bold text-destructive">{bulkAiCounts.errors}</p>
              </div>
            </div>
          )}

          {/* Resumo de classificação do lote */}
          {readyCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Duplicados reais</p>
                <p className="text-sm font-bold text-destructive">{itemFlags.confirmedRealIds.size}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-amber-300/80">Possíveis duplicados</p>
                <p className="text-sm font-bold text-amber-200">{itemFlags.possibleDupIds.size}</p>
              </div>
              <div className="rounded-lg border border-muted-foreground/30 bg-secondary/30 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Dados incompletos</p>
                <p className="text-sm font-bold text-foreground">{itemFlags.incompleteIds.size}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Erros</p>
                <p className="text-sm font-bold text-destructive">{errorCount}</p>
              </div>
            </div>
          )}

          {items.map((it, idx) => (
            <ReviewRow
              key={it.localId}
              index={idx}
              item={it}
              partners={partners}
              isDuplicate={itemFlags.confirmedRealIds.has(it.localId)}
              isPossibleDup={itemFlags.possibleDupIds.has(it.localId)}
              isIncomplete={itemFlags.incompleteIds.has(it.localId)}
              classificationReason={itemFlags.reasonById.get(it.localId)}
              forcePublish={forcePublishIds.has(it.localId)}
              onToggleForcePublish={() => toggleForcePublish(it.localId)}
              smartDup={smartDuplicates.get(it.localId)}
              onPartnerChange={(pid) => handlePartnerSelect(it.localId, pid)}
              onChangeForm={(patch) => patchForm(it.localId, patch)}
              onToggleExpand={() => patchItem(it.localId, { expanded: !it.expanded })}
              onRemove={() => removeItem(it.localId)}
              onGenerateDesc={() => handleGenerateDescription(it.localId)}
              generatingDesc={generatingDescIds.has(it.localId)}
              onChangeFormFull={(form) => patchForm(it.localId, form)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={saving || readyCount === 0}
            onClick={() => handleBulkSave("draft")}
            className="admin-glow flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50 flex-1"
          >
            <Save className="h-4 w-4" />
            {saving ? "Publicando no Ecossistema..." : "Guardar na Base"}
          </button>
          <button
            type="button"
            disabled={saving || readyCount === 0}
            onClick={() => handleBulkSave("published")}
            className={`admin-glow flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50 flex-1 ${
              !saving && readyCount > 0
                ? "animate-pulse shadow-[0_0_18px_hsl(var(--primary)/0.55),0_0_36px_hsl(var(--primary)/0.3)]"
                : ""
            }`}
          >
            <Send className="h-4 w-4" />
            {saving ? "Publicando no Ecossistema..." : `LANÇAR NO ECOSSISTEMA (${readyCount})`}
          </button>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Compact review row
────────────────────────────────────────────── */
interface ReviewRowProps {
  index: number;
  item: BulkItem;
  partners: Partner[];
  isDuplicate?: boolean;
  isPossibleDup?: boolean;
  isIncomplete?: boolean;
  classificationReason?: string;
  forcePublish?: boolean;
  onToggleForcePublish?: () => void;
  smartDup?: DuplicateConfidenceResult;
  onPartnerChange: (id: string) => void;
  onChangeForm: (patch: Partial<EventFormData>) => void;
  onChangeFormFull: (form: EventFormData) => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onGenerateDesc: () => void;
  generatingDesc: boolean;
}

function ReviewRowBase({
  index, item, partners, isDuplicate, isPossibleDup, isIncomplete,
  classificationReason, forcePublish, onToggleForcePublish,
  smartDup, onPartnerChange, onChangeForm,
  onChangeFormFull, onToggleExpand, onRemove, onGenerateDesc, generatingDesc,
}: ReviewRowProps) {
  const inputCls = "w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition";
  const isProcessing = item.status === "uploading" || item.status === "extracting";

  const containerCls = isDuplicate
    ? "border-destructive/80 ring-2 ring-destructive/40 shadow-[0_0_18px_hsl(var(--destructive)/0.45)]"
    : isPossibleDup
    ? "border-amber-500/60 ring-1 ring-amber-500/30"
    : isIncomplete
    ? "border-muted-foreground/40 ring-1 ring-muted-foreground/20"
    : "border-border/40";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition ${containerCls}`}>
      {isDuplicate && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-2 text-[11px] font-semibold text-destructive flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>🚫 Duplicado real — não será enviado</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md border border-destructive/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-destructive/20 transition shrink-0"
          >
            Editar
          </button>
        </div>
      )}
      {!isDuplicate && isPossibleDup && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 text-[11px] font-semibold text-amber-500 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>⚠ Possível duplicado — revise antes de publicar</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
            {smartDup?.matched_fields?.length ? (
              <div className="opacity-75 font-normal mt-0.5">
                Coincidências: {smartDup.matched_fields.join(" • ")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleForcePublish}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition shrink-0 ${
              forcePublish
                ? "bg-amber-500/30 text-amber-100 border border-amber-400"
                : "border border-amber-500/40 hover:bg-amber-500/20"
            }`}
          >
            {forcePublish ? "✓ Publicar mesmo assim" : "Publicar mesmo assim"}
          </button>
        </div>
      )}
      {!isDuplicate && !isPossibleDup && isIncomplete && (
        <div className="bg-secondary/40 border-b border-muted-foreground/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>📝 Revisar dados incompletos</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md border border-muted-foreground/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-secondary transition shrink-0"
          >
            Editar dados
          </button>
        </div>
      )}
      {item.categoryWarning && !isDuplicate && !isPossibleDup && !isIncomplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 text-[10px] font-semibold text-amber-500 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          ⚠️ Verifique a categoria: {item.categoryWarning}
        </div>
      )}
      <div className="flex items-stretch gap-2 p-2">
        {/* thumb */}
        <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-secondary/40">
          {item.thumbDataUrl || item.form.image_url ? (
            <img
              src={item.thumbDataUrl || item.form.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* fields */}
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
          <div className="col-span-2">
            <input
              className={inputCls}
              placeholder={isProcessing ? "Analisando a noite..." : "Qual o nome da fera?"}
              value={item.form.title}
              onChange={(e) => {
                const t = e.target.value.toUpperCase();
                onChangeForm({ title: t, slug: t ? slugify(t) : "" });
              }}
              disabled={isProcessing}
            />
          </div>
          <div>
            <input
              type="datetime-local"
              className={inputCls}
              value={item.form.date_time}
              onChange={(e) => onChangeForm({ date_time: e.target.value })}
              disabled={isProcessing}
            />
          </div>
          <div>
            <select
              className={inputCls}
              value={item.form.partner_id}
              onChange={(e) => onPartnerChange(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">— Sem parceiro —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="admin-glow-destructive rounded-md border border-destructive/30 p-1 text-destructive hover:bg-destructive/10 transition"
            title="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            disabled={isProcessing}
            className="admin-glow flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
          >
            {item.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Detalhes
          </button>
        </div>
      </div>

      {item.status === "error" && (
        <div className="px-3 pb-2 text-[10px] text-destructive">
          {item.errorMsg || "Erro ao processar este flyer."}
        </div>
      )}

      {item.expanded && (
        <div className="border-t border-border/40 bg-background/50 p-3">
          <EventFormBlock
            index={index}
            form={item.form}
            partners={partners}
            onChange={(_i, updated) => onChangeFormFull(updated)}
            onGenerateDescription={onGenerateDesc}
            generatingDesc={generatingDesc}
          />
        </div>
      )}
    </div>
  );
}

// Memoiza para evitar re-render em massa do lote a cada patchItem
const ReviewRow = memo(ReviewRowBase, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.partners === next.partners &&
    prev.isDuplicate === next.isDuplicate &&
    prev.isPossibleDup === next.isPossibleDup &&
    prev.isIncomplete === next.isIncomplete &&
    prev.classificationReason === next.classificationReason &&
    prev.forcePublish === next.forcePublish &&
    prev.smartDup === next.smartDup &&
    prev.generatingDesc === next.generatingDesc &&
    prev.index === next.index
  );
});

/* ──────────────────────────────────────────────
   Padrões do Lote — campos globais opcionais
────────────────────────────────────────────── */
interface BatchDefaultsSectionProps {
  value: BatchDefaults;
  onChange: (next: BatchDefaults) => void;
  partners: Partner[];
  onApply: () => void;
  hasItems: boolean;
}

const BatchDefaultsSection = memo(function BatchDefaultsSection({
  value, onChange, partners, onApply, hasItems,
}: BatchDefaultsSectionProps) {
  const set = (patch: Partial<BatchDefaults>) => onChange({ ...value, ...patch });
  const inputCls = "w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition";
  const partnerName = value.partner_id ? partners.find((p) => p.id === value.partner_id)?.name : null;
  const previewParts = [
    value.date ? `Data: ${value.date.split("-").reverse().join("/")}` : null,
    value.time ? `Hora: ${value.time}` : null,
    partnerName ? `Local: ${partnerName}` : null,
    value.category ? `Categoria: ${value.category}` : null,
  ].filter(Boolean);

  return (
    <div className={`mb-4 rounded-xl border ${value.enabled ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/40"} p-3 transition`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="h-3.5 w-3.5 accent-primary"
        />
        <span className="text-xs font-semibold text-foreground">🧭 Preencher automaticamente eventos sem informações</span>
        <span className="text-[10px] text-muted-foreground">(opcional)</span>
      </label>

      {value.enabled && (
        <div className="mt-3 space-y-2.5">
          {previewParts.length > 0 && (
            <div className="rounded-md border border-primary/20 bg-background/60 px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed">
              <div className="text-foreground font-semibold mb-1">Padrões definidos</div>
              {previewParts.map((p, i) => <div key={i}>{p}</div>)}
              <div className="mt-1.5 opacity-80">
                Quando o flyer não informar esses dados, a Roxou utilizará os valores acima.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Data padrão</label>
              <input
                type="date"
                className={inputCls}
                value={value.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Horário padrão</label>
              <input
                type="time"
                className={inputCls}
                value={value.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-medium text-muted-foreground">Local padrão (parceiro)</label>
              <select
                className={inputCls}
                value={value.partner_id}
                onChange={(e) => set({ partner_id: e.target.value })}
              >
                <option value="">— Sem padrão —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Categoria padrão</label>
              <select
                className={inputCls}
                value={value.category}
                onChange={(e) => set({ category: e.target.value, sub_category: supportsGenre(e.target.value) ? value.sub_category : "" })}
              >
                <option value="">— Sem padrão —</option>
                {ADMIN_MAIN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {supportsGenre(value.category) && (
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Gênero padrão</label>
                <select
                  className={inputCls}
                  value={value.sub_category}
                  onChange={(e) => set({ sub_category: e.target.value })}
                >
                  <option value="">— Sem padrão —</option>
                  {ADMIN_MUSICAL_SUBS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="batch-mode"
                checked={value.mode === "missing"}
                onChange={() => set({ mode: "missing" })}
                className="h-3 w-3 accent-primary"
              />
              <span className="text-[11px] text-foreground">
                ✅ <strong>Completar apenas dados ausentes</strong> <span className="opacity-70">(recomendado)</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="batch-mode"
                checked={value.mode === "all"}
                onChange={() => set({ mode: "all" })}
                className="h-3 w-3 accent-primary"
              />
              <span className="text-[11px] text-foreground">
                ⚠️ <strong>Substituir todos os dados pelos valores acima</strong>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={onApply}
            disabled={!hasItems}
            className="admin-glow w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-40"
          >
            Aplicar padrões ao lote
          </button>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Os padrões são aplicados apenas quando você clicar no botão — digitar aqui não reprocessa eventos.
          </p>
        </div>
      )}
    </div>
  );
});


export default EventoBulkForm;
