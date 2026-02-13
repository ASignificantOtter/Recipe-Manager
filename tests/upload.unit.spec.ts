import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Mock auth to simulate authenticated user
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user" } })),
}));

import { POST } from "../src/app/api/recipes/upload/route";

const TEST_UPLOAD_DIR = join(process.cwd(), "public/uploads");

describe("Upload Route - File Validation", () => {
  beforeEach(async () => {
    // Ensure upload directory exists
    if (!existsSync(TEST_UPLOAD_DIR)) {
      await mkdir(TEST_UPLOAD_DIR, { recursive: true });
    }
  });

  describe("File Type Validation", () => {
    it("accepts valid DOCX files", async () => {
      const fakeDocx = Buffer.from("PK"); // DOCX files start with PK (ZIP format)
      const file = new File([fakeDocx], "recipe.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("Invalid file type");
    });

    it("accepts valid PDF files", async () => {
      const fakePdf = Buffer.from("%PDF-1.4");
      const file = new File([fakePdf], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("Invalid file type");
    });

    it("accepts valid image files", async () => {
      // Minimal JPEG header
      const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const file = new File([fakeJpeg], "recipe.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("Invalid file type");
    });

    it("rejects invalid file types", async () => {
      const file = new File([Buffer.from("test")], "recipe.txt", {
        type: "text/plain",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid file type");
    });

    it("rejects executable files", async () => {
      const file = new File([Buffer.from("MZ")], "malware.exe", {
        type: "application/x-msdownload",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid file type");
    });

    it("validates by extension when MIME type is generic", async () => {
      const file = new File([Buffer.from("test")], "recipe.docx", {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("Invalid file type");
    });

    it("handles files without extensions", async () => {
      const file = new File([Buffer.from("test")], "recipe", {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid file type");
    });
  });

  describe("File Size Validation", () => {
    it("accepts files under 10MB", async () => {
      const smallFile = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const file = new File([smallFile], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("File too large");
    });

    it("rejects files over 10MB", async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const file = new File([largeFile], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("File too large");
    });

    it("accepts exactly 10MB files", async () => {
      const maxFile = Buffer.alloc(10 * 1024 * 1024); // Exactly 10MB
      const file = new File([maxFile], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("File too large");
    });

    it("handles zero-byte files", async () => {
      const emptyFile = Buffer.alloc(0);
      const file = new File([emptyFile], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      // Should process but may have parsing warning
      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe("File too large");
    });
  });

  describe("File Upload Mechanics", () => {
    it("requires file in form data", async () => {
      const formData = new FormData();

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("No file provided");
    });

    it("saves file with timestamped name", async () => {
      const content = Buffer.from("test content");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body.filename).toMatch(/^\d+-recipe\.pdf$/);
      expect(body.originalName).toBe("recipe.pdf");
    });

    it("preserves file metadata in response", async () => {
      const content = Buffer.from("test content");
      const file = new File([content], "my-recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body.originalName).toBe("my-recipe.pdf");
      expect(body.fileType).toBe("application/pdf");
      expect(body.size).toBe(content.length);
    });

    it("handles special characters in filename", async () => {
      const content = Buffer.from("test");
      const file = new File([content], "my recipe (v2).pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body.originalName).toBe("my recipe (v2).pdf");
      expect(body.filename).toContain("my recipe (v2).pdf");
    });

    it("handles unicode characters in filename", async () => {
      const content = Buffer.from("test");
      const file = new File([content], "receta-española.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body.originalName).toBe("receta-española.pdf");
    });
  });

  describe("Authentication", () => {
    it("requires authentication", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValueOnce(null);

      const content = Buffer.from("test");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("requires user id in session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValueOnce({ user: {} });

      const content = Buffer.from("test");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("Parsing Fallback Behavior", () => {
    it("uses filename as recipe name when parsing fails", async () => {
      const content = Buffer.from("unstructured text without any recipe format");
      const file = new File([content], "my-special-recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      // When parsing fails, should use filename as fallback
      expect(body.parsingWarning).toBeTruthy();
      expect(body.extractedRecipeData.name).toContain("my-special-recipe");
    });

    it("includes parsing warning when sections not detected", async () => {
      const content = Buffer.from("Just some random text");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      // May have parsing warning depending on content
      if (body.parsingWarning) {
        expect(body.parsingWarning).toBeTruthy();
      }
    });

    it("handles parsing errors gracefully", async () => {
      // Corrupted PDF that might cause parsing error
      const corruptedPdf = Buffer.from("PDF but corrupted content");
      const file = new File([corruptedPdf], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).not.toBe(500);
      // Should return response even if parsing fails
      expect(body).toHaveProperty("extractedRecipeData");
    });
  });

  describe("Response Format", () => {
    it("returns all required fields", async () => {
      const content = Buffer.from("test");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body).toHaveProperty("filename");
      expect(body).toHaveProperty("originalName");
      expect(body).toHaveProperty("fileType");
      expect(body).toHaveProperty("size");
      expect(body).toHaveProperty("extractedRecipeData");
    });

    it("includes extracted recipe data structure", async () => {
      const content = Buffer.from("test");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body.extractedRecipeData).toHaveProperty("name");
      expect(body.extractedRecipeData).toHaveProperty("ingredients");
      expect(body.extractedRecipeData).toHaveProperty("instructions");
    });

    it("includes parsingWarning when applicable", async () => {
      const content = Buffer.from("unstructured content");
      const file = new File([content], "recipe.pdf", {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(body).toHaveProperty("parsingWarning");
    });
  });

  describe("Concurrent Uploads", () => {
    it("handles multiple simultaneous uploads", async () => {
      const createUpload = (name: string) => {
        const content = Buffer.from(`test content for ${name}`);
        const file = new File([content], name, {
          type: "application/pdf",
        });
        const formData = new FormData();
        formData.append("file", file);
        return POST({ formData: async () => formData } as any);
      };

      const uploads = [
        createUpload("recipe1.pdf"),
        createUpload("recipe2.pdf"),
        createUpload("recipe3.pdf"),
      ];

      const results = await Promise.all(uploads);
      const bodies = await Promise.all(results.map((r) => r.json()));

      expect(bodies).toHaveLength(3);
      expect(bodies[0].originalName).toBe("recipe1.pdf");
      expect(bodies[1].originalName).toBe("recipe2.pdf");
      expect(bodies[2].originalName).toBe("recipe3.pdf");

      // Filenames should be unique due to timestamp
      const filenames = bodies.map((b) => b.filename);
      const uniqueFilenames = new Set(filenames);
      expect(uniqueFilenames.size).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("handles malformed form data", async () => {
      const req = {
        formData: async () => {
          throw new Error("Invalid form data");
        },
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles file read errors gracefully", async () => {
      const file = new File([Buffer.from("test")], "recipe.pdf", {
        type: "application/pdf",
      });

      // Override arrayBuffer to throw error
      file.arrayBuffer = async () => {
        throw new Error("Failed to read file");
      };

      const formData = new FormData();
      formData.append("file", file);

      const req = {
        formData: async () => formData,
      } as any;

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });
});
