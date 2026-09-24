import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiClient,
  createMonster,
  createSpell,
  deleteMonster,
  deleteSpell,
  getAbilities,
  getDungeonLayout,
  getPlayerSpellbook,
  saveDungeonLayout,
  updateMonster,
} from "../client";
import { targetSpell } from "../../features/spells/__tests__/spellFixtures";

function mockFetchOnce(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(fetchMock: ReturnType<typeof vi.fn>) {
  return new URL((fetchMock.mock.calls[0][0] as Request).url);
}

describe("generated API client facade", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("configures the generated transport and GET requests parse generated response data", async () => {
    const fetchMock = mockFetchOnce(jsonResponse([{ id: 1, name: "Strength", description: null }]));

    const result = await getAbilities();

    expect(apiClient.getConfig()).toMatchObject({ responseStyle: "fields", throwOnError: true });
    expect(requestUrl(fetchMock).pathname).toBe("/api/abilities");
    expect(result).toEqual([{ id: 1, name: "Strength", description: null }]);
  });

  it("forwards an AbortSignal to a generated SDK request", async () => {
    const spellbook = [{ id: 7, name: "Mira", spells: [targetSpell] }];
    const fetchMock = mockFetchOnce(jsonResponse(spellbook));
    const controller = new AbortController();

    const result = await getPlayerSpellbook(controller.signal);

    expect(requestUrl(fetchMock).pathname).toBe("/api/players/spellbook");
    expect((fetchMock.mock.calls[0][0] as Request).signal.aborted).toBe(false);
    expect(result).toEqual(spellbook);
  });

  it("preserves opaque nested JSON in generated response data and request bodies", async () => {
    const layout = {
      data: {
        rooms: [{ id: "room-1", terrain: ["stone"], extension: { custom: true } }],
        metadata: { generated_by: "test", custom_values: [1, "two", null] },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(layout))
      .mockResolvedValueOnce(jsonResponse(layout));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDungeonLayout(23)).resolves.toEqual(layout);
    await saveDungeonLayout(23, layout);

    const saveRequest = fetchMock.mock.calls[1][0] as Request;
    expect(new URL(saveRequest.url).pathname).toBe("/api/dungeons/23/layout");
    expect(saveRequest.method).toBe("PUT");
    await expect(saveRequest.clone().json()).resolves.toEqual(layout);
  });

  it("sends JSON bodies and uses generated path parameters for writes", async () => {
    const { id: _id, ...spellResponse } = targetSpell;
    const spell = { ...spellResponse, quick_rules: targetSpell.quick_rules ?? "" };
    const fetchMock = mockFetchOnce(jsonResponse(targetSpell));

    await createSpell(spell);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/spells");
    expect(request.method).toBe("POST");
    expect(await request.clone().json()).toEqual(spell);
  });

  it("preserves the existing 204 delete contract", async () => {
    const fetchMock = mockFetchOnce(new Response(null, { status: 204 }));

    await expect(deleteSpell(1)).resolves.toBeUndefined();

    expect(new URL((fetchMock.mock.calls[0][0] as Request).url).pathname).toBe("/api/spells/1");
  });

  it("routes monster create, update, and delete through the generated operations", async () => {
    const monster = { name: "Tiny Test Drake", cr: "1/2" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 42, ...monster }))
      .mockResolvedValueOnce(jsonResponse({ id: 42, ...monster, name: "Tiny Test Drake Updated" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createMonster(monster);
    await updateMonster(42, { name: "Tiny Test Drake Updated" });
    await deleteMonster(42);

    const [createRequest, updateRequest, deleteRequest] = fetchMock.mock.calls.map(
      ([request]) => request as Request,
    );
    expect(new URL(createRequest.url).pathname).toBe("/api/monsters");
    expect(createRequest.method).toBe("POST");
    expect(await createRequest.clone().json()).toEqual(monster);
    expect(new URL(updateRequest.url).pathname).toBe("/api/monsters/42");
    expect(updateRequest.method).toBe("PUT");
    expect(await updateRequest.clone().json()).toEqual({ name: "Tiny Test Drake Updated" });
    expect(new URL(deleteRequest.url).pathname).toBe("/api/monsters/42");
    expect(deleteRequest.method).toBe("DELETE");
  });

  it("converts structured backend errors to status-aware ApiError values", async () => {
    mockFetchOnce(jsonResponse({ code: "spell_not_found", message: "Spell not found" }, 404));

    await expect(getAbilities()).rejects.toMatchObject(
      new ApiError(404, "Spell not found", "spell_not_found"),
    );
  });

  it("retains the FastAPI validation detail body for UI error messages", async () => {
    const body = { detail: [{ loc: ["body", "name"], msg: "Field required", type: "missing" }] };
    mockFetchOnce(jsonResponse(body, 422));

    await expect(getAbilities()).rejects.toMatchObject(new ApiError(422, JSON.stringify(body)));
  });
});
