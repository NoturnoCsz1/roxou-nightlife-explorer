import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOfficialClient } from "./mockOfficialClient";
import type { PartnerScope } from "../tenancy";
import { PartnerScopeError } from "../tenancy";

const mock = createMockOfficialClient([]);

vi.mock("@modules/partner/converged/client", () => ({
  officialClient: () => mock.client,
  convergenceBackendReady: false,
}));

const svc = await import(
  "@modules/partner/reservations/converged/reservationsOfficialService"
);

const ORG_A = "11111111-1111-1111-1111-111111111111";
const VENUE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const scope: PartnerScope = {
  organizationId: ORG_A,
  venueId: VENUE_A,
  roleCode: "owner",
};

beforeEach(() => {
  mock.calls.length = 0;
  mock.client.rpc.mockClear();
  mock.client.from.mockClear();
});

describe("reservas convertidas — tenancy", () => {
  it("lista sempre filtrando por organization_id e venue_id", async () => {
    await svc.listReservations(scope);
    const call = mock.calls[0];
    expect(call.table).toBe("reservations");
    expect(call.filters.organization_id).toBe(ORG_A);
    expect(call.filters.venue_id).toBe(VENUE_A);
  });

  it("nega acesso quando não há organização (sem membership)", async () => {
    await expect(
      svc.listReservations({
        organizationId: "",
        venueId: null,
        roleCode: null,
      } as PartnerScope),
    ).rejects.toBeInstanceOf(PartnerScopeError);
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it("exige venue para operações do estabelecimento", async () => {
    await expect(
      svc.listReservationTypes({ ...scope, venueId: null }),
    ).rejects.toBeInstanceOf(PartnerScopeError);
  });

  it("busca por id não escapa da organização", async () => {
    await svc.getReservation(scope, "res-1");
    expect(mock.calls[0].filters.organization_id).toBe(ORG_A);
    expect(mock.calls[0].filters.id).toBe("res-1");
  });
});

describe("reservas convertidas — operações", () => {
  it("criação usa RPC com organização/venue da sessão", async () => {
    await svc.createReservation(scope, {
      name: "Fernando",
      reservation_date: "2026-09-10T22:00:00-03:00",
    });
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_create_reservation", {
      p_organization_id: ORG_A,
      p_venue_id: VENUE_A,
      p_payload: expect.objectContaining({ name: "Fernando" }),
    });
  });

  it("criação valida campos obrigatórios antes de chamar o backend", async () => {
    await expect(svc.createReservation(scope, { name: " " })).rejects.toThrow();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it("mudança de status vai por RPC", async () => {
    await svc.confirmReservation(scope, "res-1");
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "partner_set_reservation_status",
      { p_reservation_id: "res-1", p_status: "confirmed" },
    );
  });

  it("check-in vai por RPC dedicada", async () => {
    await svc.checkInReservation(scope, "res-1");
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "partner_check_in_reservation",
      { p_reservation_id: "res-1" },
    );
  });

  it("token público exige token forte", async () => {
    await expect(svc.getPublicReservationByToken("curto")).rejects.toThrow();
    await svc.getPublicReservationByToken("a".repeat(48));
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "public_get_reservation_by_token",
      { p_token: "a".repeat(48) },
    );
  });
});
