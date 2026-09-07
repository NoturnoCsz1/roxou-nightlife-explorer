import { describe, expect, it } from "vitest";
import {
  PartnerScopeError,
  assertSameOrganizationScope,
  assertVenueBelongsToOrganization,
  isValidScope,
  requireOrganization,
  requireVenue,
  scopeFilter,
  type PartnerScope,
} from "../tenancy";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const VENUE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const scopeA: PartnerScope = {
  organizationId: ORG_A,
  venueId: VENUE_A,
  roleCode: "owner",
};

describe("tenancy — organização", () => {
  it("aceita escopo com organização resolvida", () => {
    expect(isValidScope(scopeA)).toBe(true);
    expect(requireOrganization(scopeA)).toBe(ORG_A);
  });

  it("usuário sem membership não tem escopo válido", () => {
    expect(isValidScope(null)).toBe(false);
    expect(() => requireOrganization(null)).toThrow(PartnerScopeError);
  });

  it("organization A não acessa recurso da organization B", () => {
    expect(() => assertSameOrganizationScope(scopeA, ORG_B)).toThrow(
      PartnerScopeError,
    );
    expect(() => assertSameOrganizationScope(scopeA, ORG_A)).not.toThrow();
  });

  it("recurso sem organização é rejeitado", () => {
    expect(() => assertSameOrganizationScope(scopeA, null)).toThrow(
      PartnerScopeError,
    );
  });
});

describe("tenancy — venue", () => {
  it("exige venue nas operações de estabelecimento físico", () => {
    expect(requireVenue(scopeA)).toBe(VENUE_A);
    expect(() =>
      requireVenue({ organizationId: ORG_A, venueId: null, roleCode: "owner" }),
    ).toThrow(PartnerScopeError);
  });

  it("venue precisa pertencer à organização", () => {
    expect(() =>
      assertVenueBelongsToOrganization(scopeA, {
        id: VENUE_A,
        organizationId: ORG_B,
      }),
    ).toThrow(PartnerScopeError);
    expect(() =>
      assertVenueBelongsToOrganization(scopeA, {
        id: VENUE_A,
        organizationId: ORG_A,
      }),
    ).not.toThrow();
  });

  it("scopeFilter sempre carrega organization_id", () => {
    expect(scopeFilter(scopeA)).toEqual({
      organization_id: ORG_A,
      venue_id: VENUE_A,
    });
    expect(
      scopeFilter({ organizationId: ORG_A, venueId: null, roleCode: "staff" }),
    ).toEqual({ organization_id: ORG_A });
  });
});
