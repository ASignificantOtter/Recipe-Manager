import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join, extname } from "path";

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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function parseDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return simpleParseRecipe(result.value);
}

async function parsePdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return simpleParseRecipe(textResult?.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function parseDoc(buffer: Buffer) {
  try {
    const text = buffer.toString("utf8");
    return simpleParseRecipe(text);
  } catch (e) {
    return { name: "", ingredients: [], instructions: "" };
  }
}

async function parseImage(buffer: Buffer) {
  const text = await recognizeImage(buffer, { lang: "eng", maxWidth: 1600 });
  return simpleParseRecipe(text || "");
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

    if (!ALLOWED_TYPES.includes(file.type)) {
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

    // Parse based on type/extension
    const ext = extname(file.name).toLowerCase();
    let extractedRecipeData = { name: "", ingredients: [] as string[], instructions: "" };

    try {
      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === ".docx") {
        const parsed = await parseDocx(buffer);
        extractedRecipeData = parsed;
      } else if (file.type === "application/pdf" || ext === ".pdf") {
        const parsed = await parsePdf(buffer);
        extractedRecipeData = parsed;
      } else if (file.type === "application/msword" || ext === ".doc") {
        // Best-effort .doc parsing fallback
        const parsed = await parseDoc(buffer);
        extractedRecipeData = parsed;
      } else if (file.type.startsWith("image/") || ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
        const parsed = await parseImage(buffer);
        extractedRecipeData = parsed;
      }
    } catch (err) {
      console.error("Parsing error:", err);
    }

    // Return file info and extracted data
    return NextResponse.json({
      filename,
      originalName: file.name,
      fileType: file.type,
      size: file.size,
      extractedRecipeData,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
