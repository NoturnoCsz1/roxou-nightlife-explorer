import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOfficialClient } from "./mockOfficialClient";
import { PartnerScopeError, type PartnerScope } from "../tenancy";

const mock = createMockOfficialClient([]);

vi.mock("@modules/partner/converged/client", () => ({
  officialClient: () => mock.client,
  convergenceBackendReady: false,
}));

const promoters = await import(
  "@modules/partner/vip/converged/promotersOfficialService"
);

const ORG_A = "11111111-1111-1111-1111-111111111111";
const scope: PartnerScope = {
  organizationId: ORG_A,
  venueId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  roleCode: "owner",
};

beforeEach(() => {
  mock.calls.length = 0;
  mock.client.rpc.mockClear();
  mock.client.from.mockClear();
});

describe("promoters convertidos", () => {
  it("lista sempre dentro da organização", async () => {
    await promoters.listPromoterProfiles(scope);
    expect(mock.calls[0].table).toBe("promoter_profiles");
    expect(mock.calls[0].filters.organization_id).toBe(ORG_A);
  });

  it("promoter COM conta é vinculado a um membro da organização", async () => {
    await promoters.upsertPromoterProfile(scope, {
      name: "Léo Promoter",
      organization_member_id: "member-1",
    });
    const args = mock.client.rpc.mock.calls[0][1] as Record<string, any>;
    expect(args.p_organization_id).toBe(ORG_A);
    expect(args.p_payload.organization_member_id).toBe("member-1");
  });

  it("promoter SEM conta existe sem user_id/member", async () => {
    await promoters.upsertPromoterProfile(scope, { name: "Bruna" });
    const args = mock.client.rpc.mock.calls[0][1] as Record<string, any>;
    expect(args.p_payload.organization_member_id).toBeUndefined();
    expect(args.p_promoter_id).toBeNull();
  });

  it("slug é normalizado e derivado do nome quando ausente", () => {
    expect(promoters.normalizePromoterSlug("João  Promoção!")).toBe(
      "joao-promocao",
    );
  });

  it("gera slug a partir do nome no upsert", async () => {
    await promoters.upsertPromoterProfile(scope, { name: "Maria Éden" });
    expect(
      (mock.client.rpc.mock.calls[0][1] as Record<string, any>).p_payload.slug,
    ).toBe("maria-eden");
  });

  it("nome obrigatório na criação", async () => {
    await expect(promoters.upsertPromoterProfile(scope, {})).rejects.toThrow();
  });

  it("sem organização não há promoters", async () => {
    await expect(
      promoters.listPromoterProfiles({
        organizationId: "",
        venueId: null,
        roleCode: null,
      }),
    ).rejects.toBeInstanceOf(PartnerScopeError);
  });

  it("métricas do promoter ficam no escopo da organização e da lista VIP", async () => {
    await promoters.getPromoterMetrics(scope, {
      promoterProfileId: "p-1",
      vipListId: "list-1",
    });
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_promoter_metrics", {
      p_organization_id: ORG_A,
      p_promoter_profile_id: "p-1",
      p_vip_list_id: "list-1",
    });
  });
});
