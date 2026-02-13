import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user" } })),
}));

import { POST } from "../src/app/api/recipes/import-url/route";

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/recipes/import-url", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("import-url route", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("requires authentication", async () => {
    const { auth } = await import("@/lib/auth");
    const authMock = auth as unknown as { mockResolvedValueOnce: (value: unknown) => void };
    authMock.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ url: "https://example.com" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects invalid URL", async () => {
    const res = await POST(makeRequest({ url: "not-a-url" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid URL");
  });

  it("blocks private URLs", async () => {
    const res = await POST(makeRequest({ url: "http://localhost/recipe" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Private or local URLs are not allowed");
  });

  it("parses JSON-LD recipe data", async () => {
    const html = `<!doctype html>
<html>
<head><title>Sample Recipe</title></head>
<body>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Lemon Soup",
  "recipeIngredient": ["1 cup water", "2 lemons"],
  "recipeInstructions": ["Boil water", "Add lemons"]
}
</script>
</body>
</html>`;

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => html,
    })) as unknown as typeof fetch;

    const res = await POST(makeRequest({ url: "https://example.com/recipe" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.extractedRecipeData.name).toBe("Lemon Soup");
    expect(body.extractedRecipeData.ingredients).toEqual(["1 cup water", "2 lemons"]);
    expect(body.extractedRecipeData.instructions).toContain("Boil water");
  });

  it("falls back to text parsing when JSON-LD missing", async () => {
    const html = `<!doctype html>
<html>
<head><title>Fallback Recipe</title></head>
<body>
<h1>Fallback Recipe</h1>
<p>Ingredients</p>
<ul><li>1 cup rice</li></ul>
<p>Instructions</p>
<ol><li>Cook rice</li></ol>
</body>
</html>`;

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => html,
    })) as unknown as typeof fetch;

    const res = await POST(makeRequest({ url: "https://example.com/fallback" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.extractedRecipeData.name).toBeTruthy();
    expect(body.extractedRecipeData.ingredients.length).toBeGreaterThan(0);
  });
});
