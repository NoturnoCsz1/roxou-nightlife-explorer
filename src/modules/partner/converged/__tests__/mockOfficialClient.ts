/**
 * Fake client oficial para os testes da Fase 3.
 * Registra as chamadas feitas pelos serviços convertidos (tabela, filtros e RPCs)
 * para permitir asserções de tenancy/isolamento sem tocar em banco real.
 */
import { vi } from "vitest";

export interface RecordedQuery {
  table: string;
  filters: Record<string, unknown>;
  rpc?: string;
  args?: Record<string, unknown>;
}

export function createMockOfficialClient(result: unknown = []) {
  const calls: RecordedQuery[] = [];
  const state: { nextMaybeSingle?: unknown } = {};

  function builder(table: string) {
    const record: RecordedQuery = { table, filters: {} };
    calls.push(record);
    const chain: Record<string, unknown> = {};
    const passthrough = ["select", "order", "limit", "or", "gte", "lte", "update", "insert", "is", "in"];
    for (const m of passthrough) {
      chain[m] = vi.fn(() => chain);
    }
    chain.eq = vi.fn((col: string, val: unknown) => {
      record.filters[col] = val;
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => {
      if (state.nextMaybeSingle !== undefined) {
        const data = state.nextMaybeSingle;
        state.nextMaybeSingle = undefined;
        return { data, error: null };
      }
      return { data: result, error: null };
    });
    chain.single = vi.fn(async () => ({ data: result, error: null }));
    chain.delete = vi.fn(() => chain);
    // await direto na query (PostgrestBuilder é thenable)
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: result, error: null }).then(resolve);
    return chain;
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async (rpc: string, args: Record<string, unknown>) => {
      calls.push({ table: `rpc:${rpc}`, filters: {}, rpc, args });
      return { data: result, error: null };
    }),
  };

  return {
    client,
    calls,
    set nextMaybeSingle(value: unknown) {
      state.nextMaybeSingle = value;
    },
  };
}
