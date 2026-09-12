import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOfficialClient } from "./mockOfficialClient";

const mock = createMockOfficialClient(null);

vi.mock("@modules/partner/converged/client", () => ({
  officialClient: () => mock.client,
  convergenceBackendReady: true,
}));

const bio = await import("@modules/partner/bio/converged/venueBioService");

const VENUE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

beforeEach(() => {
  mock.calls.length = 0;
  mock.client.rpc.mockClear();
  mock.client.from.mockClear();
});

describe("Roxou Bio oficial — escrita", () => {
  it("grava sempre pela RPC oficial", async () => {
    await bio.upsertVenueBio(USER, VENUE, { headline: " Casa de shows " });
    expect(mock.client.rpc).toHaveBeenCalledWith("partner_upsert_venue_bio", {
      _caller_id: USER,
      _venue_id: VENUE,
      _patch: { headline: "Casa de shows" },
    });
    expect(mock.client.from).not.toHaveBeenCalledWith("venue_bio_profiles");
  });

  it("publica e despublica sem tocar em published_at", async () => {
    await bio.publishVenueBio(USER, VENUE);
    await bio.unpublishVenueBio(USER, VENUE);
    const patches = mock.client.rpc.mock.calls.map((c) => c[1]._patch);
    expect(patches).toEqual([{ is_published: true }, { is_published: false }]);
    expect(JSON.stringify(patches)).not.toContain("published_at");
  });

  it("string vazia limpa o campo", () => {
    expect(bio.buildBioPatch({ headline: "" })).toEqual({ headline: null });
  });

  it("rejeita cor inválida", () => {
    expect(() => bio.buildBioPatch({ accent_color: "roxo" })).toThrow();
    expect(bio.buildBioPatch({ accent_color: "#A020F0" })).toEqual({
      accent_color: "#A020F0",
    });
  });

  it("rejeita URL inválida", () => {
    expect(() => bio.buildBioPatch({ primary_cta_url: "javascript:alert(1)" })).toThrow();
    expect(() => bio.buildBioPatch({ cover_url: "ftp://x/y" })).toThrow();
    expect(bio.buildBioPatch({ cover_url: "https://cdn.roxou.com/a.jpg" })).toEqual({
      cover_url: "https://cdn.roxou.com/a.jpg",
    });
  });

  it("rejeita tema inválido e tema nulo", () => {
    expect(() => bio.buildBioPatch({ theme: "neon_x" as never })).toThrow();
    expect(() => bio.buildBioPatch({ theme: null as never })).toThrow();
    expect(bio.buildBioPatch({ theme: "roxou_neon" })).toEqual({ theme: "roxou_neon" });
  });

  it("ignora campos não permitidos", () => {
    expect(
      bio.buildBioPatch({ organization_id: "x", published_at: "y" } as never),
    ).toEqual({});
  });

  it("exige sessão e venue", async () => {
    await expect(bio.upsertVenueBio("", VENUE, {})).rejects.toThrow();
    await expect(bio.upsertVenueBio(USER, "", {})).rejects.toThrow();
  });
});

describe("Roxou Bio oficial — links e página pública", () => {
  it("usa o encurtador oficial para montar a URL do link", () => {
    expect(bio.bioLinkUrl("cultura-ingressos")).toBe(
      "https://roxou.click/cultura-ingressos",
    );
  });

  it("lê e marca links na tabela oficial short_links", async () => {
    await bio.listBioCandidateLinks(VENUE, USER);
    await bio.setLinkOnBio("link-1", VENUE, true);
    expect(mock.calls.map((c) => c.table)).toEqual(["short_links", "short_links"]);
  });

  it("página pública lê apenas a RPC pública", async () => {
    await bio.getPublicVenueBio("cultura");
    expect(mock.client.rpc).toHaveBeenCalledWith("public_get_venue_bio", {
      _slug: "cultura",
    });
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it("URL pública usa o slug oficial do venue", () => {
    expect(bio.bioPublicUrl("cultura")).toBe("https://parceiro.roxou.click/cultura");
  });
});
