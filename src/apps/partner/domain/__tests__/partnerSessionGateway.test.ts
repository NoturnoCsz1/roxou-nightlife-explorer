import { describe, expect, it, vi } from "vitest";
import { fetchOfficialMemberships } from "../partnerSessionGateway";

const USER = "370a3a7d-5ffb-42d5-b356-0c261717828a";
const ORG = "44d1d3a9-43f3-468b-9bfa-d96f9404290c";
const VENUE = "5b1cc088-cb43-4429-a632-00df7980077e";

function createMockClient({ members = [], venues = [], membershipError = null }: {
  members?: unknown[];
  venues?: unknown[];
  membershipError?: { message: string; code?: string } | null;
} = {}) {
  const calls: { table: string; select: string; filters: Record<string, unknown> }[] = [];

  function builder(table: string) {
    const call: (typeof calls)[number] = { table, select: "", filters: {} };
    calls.push(call);
    const chain: Record<string, unknown> = {};
    const passthrough = ["select", "order", "limit"];
    for (const m of passthrough) {
      chain[m] = vi.fn((value?: string) => {
        if (m === "select" && value) call.select = value;
        return chain;
      });
    }
    chain.eq = vi.fn((col: string, val: unknown) => {
      call.filters[col] = val;
      return chain;
    });
    chain.in = vi.fn((col: string, val: unknown[]) => {
      call.filters[col] = val;
      return chain;
    });
    chain.then = (resolve: (v: unknown) => unknown) => {
      const isMembershipQuery = table === "organization_members";
      const error = isMembershipQuery ? membershipError : null;
      const data = isMembershipQuery ? members : venues;
      return Promise.resolve({ data, error }).then(resolve);
    };
    return chain;
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
  };

  return { client, calls };
}

vi.mock("../../backend/partnerSupabase", () => ({
  partnerBackendQuery: vi.fn(() => createMockClient().client),
  partnerBackendIsDedicated: true,
  partnerSupabase: {},
}));

describe("fetchOfficialMemberships", () => {
  it("usuário com organization_members ativo retorna membership", async () => {
    const { client } = createMockClient({
      members: [
        {
          organization_id: ORG,
          user_id: USER,
          role_id: "role-owner",
          role_code: "owner",
          status: "active",
          organizations: { id: ORG, name: "Cultura" },
        },
      ],
      venues: [
        {
          id: VENUE,
          name: "Cultura",
          slug: "cultura",
          city: "Presidente Prudente",
          organization_id: ORG,
        },
      ],
    });

    vi.mocked((await import("../../backend/partnerSupabase")).partnerBackendQuery).mockReturnValue(client);

    const memberships = await fetchOfficialMemberships(USER);

    expect(memberships).toHaveLength(1);
    expect(memberships[0].organization_id).toBe(ORG);
    expect(memberships[0].role_code).toBe("owner");
    expect(memberships[0].status).toBe("active");
    expect(memberships[0].organization).toEqual({
      id: ORG,
      name: "Cultura",
      slug: null,
    });
    expect(memberships[0].venues).toHaveLength(1);
    expect(memberships[0].venues[0].id).toBe(VENUE);
  });

  it("erro na consulta é logado e retorna [] (sem conceder acesso)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = createMockClient({
      membershipError: { message: "column organizations.slug does not exist", code: "42703" },
    });

    vi.mocked((await import("../../backend/partnerSupabase")).partnerBackendQuery).mockReturnValue(client);

    const memberships = await fetchOfficialMemberships(USER);

    expect(memberships).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("fetchOfficialMemberships failed"),
      expect.objectContaining({ code: "42703" }),
    );

    consoleSpy.mockRestore();
  });
});
