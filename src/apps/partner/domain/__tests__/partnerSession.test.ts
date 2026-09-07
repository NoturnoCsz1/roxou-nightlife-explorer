import { describe, expect, it } from "vitest";
import {
  assertSameOrganization,
  buildPartnerSession,
  normalizeMembership,
  type RawMembershipRow,
} from "../partnerSession";
import {
  canManageEvents,
  canManageReservations,
  canValidateCheckIn,
  canViewAnalytics,
  isOrgManagerOrOwner,
  mapLegacyRole,
} from "../roles";

const USER = "11111111-1111-1111-1111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function member(overrides: Partial<RawMembershipRow> = {}): RawMembershipRow {
  return {
    organization_id: ORG_A,
    user_id: USER,
    role_id: "role-owner",
    role_code: "owner",
    status: "active",
    organization: { id: ORG_A, name: "Org A", slug: "org-a" },
    venues: [
      { id: "venue-a", name: "Venue A", slug: "venue-a", city: "Prudente", organizationId: ORG_A },
    ],
    ...overrides,
  };
}

describe("PartnerSession — resolução", () => {
  it("sem usuário → signed_out", () => {
    const s = buildPartnerSession({ userId: null, memberships: [] });
    expect(s.status).toBe("signed_out");
    expect(s.organizationId).toBeNull();
    expect(s.venueId).toBeNull();
  });

  it("usuário sem organization → not_enabled e nada é criado", () => {
    const s = buildPartnerSession({ userId: USER, memberships: [] });
    expect(s.status).toBe("not_enabled");
    expect(s.organizationId).toBeNull();
    expect(s.venueId).toBeNull();
    expect(s.roleCode).toBeNull();
    expect(s.memberships).toEqual([]);
  });

  it("owner ativo resolve organization + venue + role", () => {
    const s = buildPartnerSession({ userId: USER, memberships: [member()] });
    expect(s.status).toBe("active");
    expect(s.organizationId).toBe(ORG_A);
    expect(s.venueId).toBe("venue-a");
    expect(s.roleCode).toBe("owner");
  });

  it.each(["manager", "staff", "promoter", "validator"] as const)(
    "role oficial %s é aceita",
    (role) => {
      const s = buildPartnerSession({
        userId: USER,
        memberships: [member({ role_code: role, role_id: `role-${role}` })],
      });
      expect(s.status).toBe("active");
      expect(s.roleCode).toBe(role);
    },
  );

  it("role desconhecida ou vinda adulterada do cliente não concede acesso", () => {
    const s = buildPartnerSession({
      userId: USER,
      memberships: [member({ role_code: "superadmin" })],
    });
    expect(s.status).toBe("not_enabled");
    expect(s.roleCode).toBeNull();
  });

  it("membership inativo é ignorado", () => {
    expect(normalizeMembership(member({ status: "invited" }))).toBeNull();
    expect(normalizeMembership(member({ status: "revoked" }))).toBeNull();
  });

  it("membership de outro usuário é descartado", () => {
    const s = buildPartnerSession({
      userId: USER,
      memberships: [member({ user_id: "outro-usuario" })],
    });
    expect(s.status).toBe("not_enabled");
  });
});

describe("PartnerSession — isolamento entre organizations", () => {
  it("respeita a organização preferida quando o usuário tem várias", () => {
    const s = buildPartnerSession({
      userId: USER,
      memberships: [
        member(),
        member({
          organization_id: ORG_B,
          role_code: "manager",
          organization: { id: ORG_B, name: "Org B", slug: "org-b" },
          venues: [
            { id: "venue-b", name: "Venue B", slug: "venue-b", city: "Prudente", organizationId: ORG_B },
          ],
        }),
      ],
      preferredOrganizationId: ORG_B,
    });
    expect(s.organizationId).toBe(ORG_B);
    expect(s.venueId).toBe("venue-b");
    expect(s.roleCode).toBe("manager");
  });

  it("venue de outra organização nunca entra na membership", () => {
    const s = buildPartnerSession({
      userId: USER,
      memberships: [
        member({
          venues: [
            { id: "venue-b", name: "Venue B", slug: "venue-b", city: "x", organizationId: ORG_B },
          ],
        }),
      ],
    });
    expect(s.memberships[0].venues).toEqual([]);
    expect(s.venueId).toBeNull();
  });

  it("assertSameOrganization bloqueia recurso de outra organização", () => {
    const s = buildPartnerSession({ userId: USER, memberships: [member()] });
    expect(assertSameOrganization(s, ORG_A)).toBe(true);
    expect(assertSameOrganization(s, ORG_B)).toBe(false);
    const off = buildPartnerSession({ userId: USER, memberships: [] });
    expect(assertSameOrganization(off, ORG_A)).toBe(false);
  });
});

describe("LEGACY COMPATIBILITY — roles legadas", () => {
  it("mapeia papéis legados para os oficiais", () => {
    expect(mapLegacyRole("owner")).toBe("owner");
    expect(mapLegacyRole("admin")).toBe("manager");
    expect(mapLegacyRole("editor")).toBe("manager");
    expect(mapLegacyRole("attendant")).toBe("staff");
    expect(mapLegacyRole("desconhecido")).toBeNull();
    expect(mapLegacyRole(null)).toBeNull();
  });

  it("vínculo legado não habilita a sessão oficial (sem dual-write nem bypass)", () => {
    const s = buildPartnerSession({
      userId: USER,
      memberships: [],
      legacy: { partnerId: "legacy-partner", partnerName: "Bar X", legacyRole: "owner" },
    });
    expect(s.status).toBe("not_enabled");
    expect(s.organizationId).toBeNull();
    expect(s.legacy?.partnerId).toBe("legacy-partner");
  });
});

describe("Capacidades por role", () => {
  it("owner e manager são gestores", () => {
    expect(isOrgManagerOrOwner("owner")).toBe(true);
    expect(isOrgManagerOrOwner("manager")).toBe(true);
    expect(isOrgManagerOrOwner("staff")).toBe(false);
    expect(isOrgManagerOrOwner("promoter")).toBe(false);
    expect(isOrgManagerOrOwner("validator")).toBe(false);
  });

  it("staff opera reservas, validator só valida", () => {
    expect(canManageReservations("staff")).toBe(true);
    expect(canManageReservations("validator")).toBe(false);
    expect(canValidateCheckIn("validator")).toBe(true);
    expect(canManageEvents("staff")).toBe(false);
    expect(canViewAnalytics("promoter")).toBe(false);
  });
});
