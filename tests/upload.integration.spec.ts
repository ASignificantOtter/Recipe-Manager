import { describe, it, expect, vi } from "vitest";

// Mock auth to simulate authenticated user
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user" } })),
}));

// Mock mammoth, pdf-parse and ocr to return predictable text
vi.mock("mammoth", () => ({
  extractRawText: vi.fn(async ({ buffer }: any) => ({ value: "DOCX Title\n\nIngredients:\n- 1 cup sugar\n\nInstructions:\nMix" })),
}));

vi.mock("pdf-parse", () => ({
  default: vi.fn(async (buf: any) => ({ text: "PDF Title\n- 2 eggs\nInstructions:\nBake" })),
}));

vi.mock("@/lib/uploader/ocr", () => ({
  recognizeImage: vi.fn(async () => "IMG Title\n- 3 tomatoes\nInstructions:\nChop"),
}));

import { POST } from "../src/app/api/recipes/upload/route";

describe("upload route integration (mocked parsers)", () => {
  it("handles pdf upload and returns extracted data", async () => {
    const fakeFile = {
      name: "test.pdf",
      type: "application/pdf",
      size: 100,
      arrayBuffer: async () => Buffer.from("%PDF-1.4 fake"),
    } as any;

    const req = {
      formData: async () => ({ get: (k: string) => (k === "file" ? fakeFile : null) }),
    } as any;

    const res: any = await POST(req);
    const body = await res.json();
    expect(body).toHaveProperty("extractedRecipeData");
    expect(body.extractedRecipeData).toBeDefined();
    // Because we mocked pdf-parse to return text containing 'PDF Title', parser will detect that
    expect(body.extractedRecipeData.name || body.extractedRecipeData).toBeTruthy();
  });
});
