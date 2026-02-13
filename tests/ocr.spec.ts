import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock tesseract.js to avoid running real OCR in tests
vi.mock("tesseract.js", () => {
  const createWorkerMock = vi.fn(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    recognize: vi.fn().mockResolvedValue({ data: { text: "Test OCR result\n- 2 eggs\n- salt" } }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }));
  return { createWorker: createWorkerMock };
});

// Mock sharp to avoid real image processing in tests
vi.mock("sharp", () => {
  return {
    default: (buf: Buffer) => ({
      resize: () => ({
        grayscale: () => ({
          normalise: () => ({
            toBuffer: async () => buf,
          }),
        }),
      }),
    }),
  };
});

import { recognizeImage, terminateWorker } from "../src/lib/uploader/ocr";

describe("OCR helper", () => {
  beforeEach(() => {
    // noop
  });

  afterEach(async () => {
    await terminateWorker();
    vi.resetAllMocks();
  });

  it("returns OCR text from mocked worker", async () => {
    const buf = Buffer.from("fake-image-data");
    const text = await recognizeImage(buf, { lang: "eng", maxWidth: 800 });
    expect(text).toContain("Test OCR result");
    expect(text).toContain("2 eggs");
  });
});
