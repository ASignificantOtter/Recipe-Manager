import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { pathToFileURL } from "url";

// Parsing libraries
import mammoth from "mammoth"; // docx
// pdf-parse is CommonJS; import dynamically to support ESM runtime
import { simpleParseRecipe } from "@/lib/uploader/parser";
import { recognizeImage } from "@/lib/uploader/ocr";

const UPLOAD_DIR = join(process.cwd(), "public/uploads");
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/pdf",
  "image/jpeg",
  "image/png",
];
const ALLOWED_EXTENSIONS = [".docx", ".doc", ".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isAllowedFile(fileName: string, fileType: string): boolean {
  const ext = extname(fileName).toLowerCase();
  return ALLOWED_TYPES.includes(fileType) || (ALLOWED_EXTENSIONS.includes(ext) && fileType !== "");
}

function isEmptyParsed(p: { name: string; ingredients: string[]; instructions: string }) {
  return !p.name.trim() && p.ingredients.length === 0 && !p.instructions.trim();
}

async function parseDocx(buffer: Buffer): Promise<{ parsed: { name: string; ingredients: string[]; instructions: string }; rawText: string }> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || "";
  const parsed = simpleParseRecipe(rawText);
  return { parsed, rawText };
}

async function parsePdf(buffer: Buffer): Promise<{ parsed: { name: string; ingredients: string[]; instructions: string }; rawText: string }> {
  const { PDFParse } = await import("pdf-parse");
  // Next.js/Turbopack cannot resolve pdf.worker.mjs from pdfjs-dist; set worker path explicitly
  // (fixes terminal error: "Setting up fake worker failed: Cannot find module '.../pdf.worker.mjs'")
  if (typeof PDFParse.setWorker === "function") {
    const workerPath = join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const rawText = textResult?.text ?? "";
    const parsed = simpleParseRecipe(rawText);
    return { parsed, rawText };
  } finally {
    await parser.destroy();
  }
}

async function parseDoc(buffer: Buffer): Promise<{ parsed: { name: string; ingredients: string[]; instructions: string }; rawText: string }> {
  try {
    const rawText = buffer.toString("utf8");
    const parsed = simpleParseRecipe(rawText);
    return { parsed, rawText };
  } catch {
    return { parsed: { name: "", ingredients: [], instructions: "" }, rawText: "" };
  }
}

async function parseImage(buffer: Buffer): Promise<{ parsed: { name: string; ingredients: string[]; instructions: string }; rawText: string }> {
  const rawText = await recognizeImage(buffer, { lang: "eng", maxWidth: 1600 }) || "";
  const parsed = simpleParseRecipe(rawText);
  return { parsed, rawText };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedFile(file.name, file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(UPLOAD_DIR, filename);

    await writeFile(filepath, buffer);

    // Parse based on type/extension (use ext when MIME is generic e.g. application/octet-stream)
    const ext = extname(file.name).toLowerCase();
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === ".docx";
    const isPdf = file.type === "application/pdf" || ext === ".pdf";
    const isDoc = file.type === "application/msword" || ext === ".doc";
    const isImage = file.type.startsWith("image/") || [".jpg", ".jpeg", ".png"].includes(ext);

    let extractedRecipeData = { name: "", ingredients: [] as string[], instructions: "" };
    let parsingWarning: string | null = null;

    try {
      if (isDocx) {
        const { parsed, rawText } = await parseDocx(buffer);
        if (isEmptyParsed(parsed) && rawText.trim()) {
          extractedRecipeData = { name: file.name.replace(/\.[^.]+$/, "") || "Recipe", ingredients: [], instructions: rawText.trim() };
          parsingWarning = "Could not detect recipe sections; full text is in Instructions.";
        } else {
          extractedRecipeData = parsed;
        }
      } else if (isPdf) {
        const { parsed, rawText } = await parsePdf(buffer);
        if (isEmptyParsed(parsed) && rawText.trim()) {
          extractedRecipeData = { name: file.name.replace(/\.[^.]+$/, "") || "Recipe", ingredients: [], instructions: rawText.trim() };
          parsingWarning = "Could not detect recipe sections; full text is in Instructions.";
        } else {
          extractedRecipeData = parsed;
        }
      } else if (isDoc) {
        const { parsed, rawText } = await parseDoc(buffer);
        if (isEmptyParsed(parsed) && rawText.trim()) {
          extractedRecipeData = { name: file.name.replace(/\.[^.]+$/, "") || "Recipe", ingredients: [], instructions: rawText.trim() };
          parsingWarning = "Could not detect recipe sections; full text is in Instructions.";
        } else {
          extractedRecipeData = parsed;
        }
      } else if (isImage) {
        const { parsed, rawText } = await parseImage(buffer);
        if (isEmptyParsed(parsed) && rawText.trim()) {
          extractedRecipeData = { name: file.name.replace(/\.[^.]+$/, "") || "Recipe", ingredients: [], instructions: rawText.trim() };
          parsingWarning = "Could not detect recipe sections; full text is in Instructions.";
        } else {
          extractedRecipeData = parsed;
        }
      }
    } catch (err) {
      console.error("Parsing error:", err);
      parsingWarning = "Parsing failed; you can still add the recipe manually.";
    }

    return NextResponse.json({
      filename,
      originalName: file.name,
      fileType: file.type,
      size: file.size,
      extractedRecipeData,
      parsingWarning,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
