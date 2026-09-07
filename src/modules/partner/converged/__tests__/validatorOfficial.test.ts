import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOfficialClient } from "./mockOfficialClient";
import { PartnerScopeError, type PartnerScope } from "../tenancy";

const mock = createMockOfficialClient({ ok: true });

vi.mock("@modules/partner/converged/client", () => ({
  officialClient: () => mock.client,
  convergenceBackendReady: false,
}));

const validator = await import(
  "@modules/partner/validator/converged/validatorOfficialService"
);

const ORG_A = "11111111-1111-1111-1111-111111111111";
const VENUE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const scope: PartnerScope = {
  organizationId: ORG_A,
  venueId: VENUE_A,
  roleCode: "validator",
};

beforeEach(() => {
  mock.calls.length = 0;
  mock.client.rpc.mockClear();
});

describe("validador convertido", () => {
  it("resolve token dentro da organização + venue", async () => {
    await validator.resolveValidationToken(scope, "tok-123");
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "partner_resolve_validation_token",
      { p_organization_id: ORG_A, p_venue_id: VENUE_A, p_token: "tok-123" },
    );
  });

  it("check-in exige venue resolvido", async () => {
    await expect(
      validator.validateCheckIn({ ...scope, venueId: null }, "tok-123"),
    ).rejects.toBeInstanceOf(PartnerScopeError);
  });

  it("check-in vai por RPC dedicada", async () => {
    await validator.validateCheckIn(scope, "tok-123");
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_validate_check_in", {
      p_organization_id: ORG_A,
      p_venue_id: VENUE_A,
      p_token: "tok-123",
    });
  });

  it("token vazio é rejeitado antes do backend", async () => {
    await expect(validator.validateCheckIn(scope, "   ")).rejects.toThrow();
  });

  it("desfazer check-in valida tipo do registro", async () => {
    await validator.undoCheckIn(scope, "vip_entry", "entry-1");
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_undo_check_in", {
      p_kind: "vip_entry",
      p_record_id: "entry-1",
    });
  });
});
