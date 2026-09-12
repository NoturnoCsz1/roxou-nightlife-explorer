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

describe("Roxou Bio oficial — fechamento do módulo", () => {
  it("aceita as novas chaves de exibição dos módulos", () => {
    expect(
      bio.buildBioPatch({
        show_address: false,
        show_hours: true,
      }),
    ).toEqual({
      show_address: false,
      show_hours: true,
    });
  });

  it("não aceita CTA próprio de reservas/VIP (fonte de verdade é a rota oficial)", () => {
    expect(
      bio.buildBioPatch({
        show_reservations: true,
        vip_cta_url: "https://exemplo.com",
      } as never),
    ).toEqual({ show_reservations: true });
  });

  it("rejeita URL insegura em CTA principal", () => {
    expect(() =>
      bio.buildBioPatch({ primary_cta_url: "javascript:alert(1)" }),
    ).toThrow();
  });

  it("valida, limita e reindexa os posts do Instagram", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      url: `https://www.instagram.com/p/ABC${i}/`,
      enabled: true,
      position: 99,
    }));
    const out = bio.buildBioPatch({ instagram_featured_posts: many })
      .instagram_featured_posts as { position: number }[];
    expect(out).toHaveLength(bio.MAX_INSTAGRAM_POSTS);
    expect(out.map((p) => p.position)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("rejeita link que não é do Instagram", () => {
    expect(() =>
      bio.buildBioPatch({
        instagram_featured_posts: [
          { url: "https://exemplo.com/p/1", enabled: true, position: 0 },
        ],
      }),
    ).toThrow();
  });

  it("cria link na tabela oficial do encurtador, já vinculado à Bio", async () => {
    await bio.createBioLink(
      { title: "Ingressos", slug: "Ingressos da Festa", target_url: "https://ex.com" },
      VENUE,
      "org-1",
      USER,
      2,
    );
    expect(mock.calls.at(-1)?.table).toBe("short_links");
  });

  it("rejeita link sem destino válido", async () => {
    await expect(
      bio.createBioLink({ title: "x", slug: "x", target_url: "ftp://x" }, VENUE, "o", USER, 0),
    ).rejects.toThrow();
  });

  it("remover link não apaga o registro do encurtador", async () => {
    await bio.removeBioLink("link-1", VENUE);
    expect(mock.calls.at(-1)?.table).toBe("short_links");
    expect(mock.calls.at(-1)?.filters).toMatchObject({ id: "link-1", venue_id: VENUE });
  });

  it("CTA do sorteio aponta para a rota pública oficial do local", () => {
    expect(bio.giveawayPublicUrl("cultura")).toBe(
      "https://roxou.com.br/local/cultura",
    );
    expect(bio.giveawayPublicUrl(null)).toBeNull();
  });
});

describe("Roxou Bio — criação de link: conflito de código", () => {
  it("consulta o slug no encurtador oficial antes de inserir", async () => {
    await bio.createBioLink(
      { title: "Expo", slug: "expo2026", target_url: "https://ex.com" },
      VENUE,
      "org-1",
      USER,
      0,
    );
    expect(mock.calls.filter((c) => c.table === "short_links").length).toBe(2);
    expect(mock.calls.at(-2)?.filters).toMatchObject({ slug: "expo2026" });
  });

  it("traduz erro de código duplicado em mensagem clara", () => {
    expect(bio.describeLinkError({ code: "23505" }, "expo2026").message).toContain(
      "já está em uso",
    );
  });

  it("traduz erro de permissão em mensagem clara", () => {
    expect(bio.describeLinkError({ code: "42501" }).message).toContain("permissão");
  });
});
