import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOfficialClient } from "./mockOfficialClient";
import { PartnerScopeError, type PartnerScope } from "../tenancy";

const mock = createMockOfficialClient([]);

vi.mock("@modules/partner/converged/client", () => ({
  officialClient: () => mock.client,
  convergenceBackendReady: false,
}));

const vip = await import("@modules/partner/vip/converged/vipOfficialService");

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const VENUE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const scopeA: PartnerScope = {
  organizationId: ORG_A,
  venueId: VENUE_A,
  roleCode: "manager",
};

beforeEach(() => {
  mock.calls.length = 0;
  mock.client.rpc.mockClear();
  mock.client.from.mockClear();
});

describe("VIP convertido — listas", () => {
  it("cria lista via RPC com organização e venue da sessão", async () => {
    await vip.createVipList(scopeA, { title: "Lista Sexta" });
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_create_vip_list", {
      p_organization_id: ORG_A,
      p_venue_id: VENUE_A,
      p_payload: expect.objectContaining({ title: "Lista Sexta" }),
    });
  });

  it("recusa lista sem título", async () => {
    await expect(vip.createVipList(scopeA, { title: "" })).rejects.toThrow();
  });

  it("listagem é isolada por organização", async () => {
    await vip.listVipLists(scopeA);
    expect(mock.calls[0].filters.organization_id).toBe(ORG_A);
    expect(mock.calls[0].filters.organization_id).not.toBe(ORG_B);
  });

  it("abrir/fechar/arquivar usam a mesma RPC de estado", async () => {
    await vip.openVipList(scopeA, "list-1");
    await vip.closeVipList(scopeA, "list-1", "fim da noite");
    await vip.archiveVipList(scopeA, "list-1");
    const states = mock.client.rpc.mock.calls.map((c) => c[1].p_state);
    expect(states).toEqual(["open", "closed", "archived"]);
  });
});

describe("VIP convertido — entradas e check-in", () => {
  it("adiciona entrada na lista", async () => {
    await vip.addVipEntry(scopeA, "list-1", { name: "Convidada" });
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_add_vip_entry", {
      p_vip_list_id: "list-1",
      p_payload: expect.objectContaining({ name: "Convidada" }),
    });
  });

  it("entradas são lidas dentro da organização", async () => {
    await vip.listVipEntries(scopeA, "list-1");
    expect(mock.calls[0].filters.organization_id).toBe(ORG_A);
    expect(mock.calls[0].filters.vip_list_id).toBe("list-1");
  });

  it("check-in / cancelamento / no-show via RPC de status", async () => {
    await vip.checkInVipEntry(scopeA, "entry-1");
    await vip.cancelVipEntry(scopeA, "entry-1");
    await vip.noShowVipEntry(scopeA, "entry-1");
    const statuses = mock.client.rpc.mock.calls.map((c) => c[1].p_status);
    expect(statuses).toEqual(["checked_in", "cancelled", "no_show"]);
  });

  it("sessão sem organização não opera VIP", async () => {
    await expect(
      vip.listVipLists({ organizationId: "", venueId: null, roleCode: null }),
    ).rejects.toBeInstanceOf(PartnerScopeError);
  });
});

describe("VIP convertido — superfície pública", () => {
  it("slug obrigatório na consulta pública", async () => {
    await expect(vip.getPublicVipListBySlug("  ")).rejects.toThrow();
    await vip.getPublicVipListBySlug("lista-sexta");
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "public_get_vip_list_by_slug",
      { p_slug: "lista-sexta" },
    );
  });

  it("inscrição pública valida nome e telefone", async () => {
    await expect(
      vip.submitPublicVipEntry("lista", { name: "", phone: "18999999999" }),
    ).rejects.toThrow();
    await expect(
      vip.submitPublicVipEntry("lista", { name: "Ana", phone: "" }),
    ).rejects.toThrow();
  });

  it("comprovante público exige token forte", async () => {
    await expect(vip.getPublicVipEntryByToken("abc")).rejects.toThrow();
  });
});
