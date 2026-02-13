import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { simpleParseRecipe } from "@/lib/uploader/parser";

const MAX_URL_CHARS = 2_000_000;
const FETCH_TIMEOUT_MS = 10_000;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    const parts = lower.split(".").map((p) => parseInt(p, 10));
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function stripHtmlToText(html: string) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, "");
  const withBreaks = withoutStyles
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n")
    .replace(/<\s*\/div\s*>/gi, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, " ");
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

function extractJsonLdBlocks(html: string) {
  const blocks: string[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);
  while (match) {
    blocks.push(match[1]);
    match = regex.exec(html);
  }
  return blocks;
}

function findRecipeNode(input: JsonValue | undefined): JsonObject | null {
  if (!input) return null;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof input === "object") {
    const obj = input as JsonObject;
    const type = obj["@type"] || obj.type;
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      if (types.some((t) => String(t).toLowerCase() === "recipe")) return input;
    }
    if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
    for (const key of Object.keys(obj)) {
      const found = findRecipeNode(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

function normalizeInstructions(value: JsonValue | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as JsonObject;
          if (typeof obj.text === "string") return obj.text.trim();
          if (typeof obj.name === "string") return obj.name.trim();
        }
        return "";
      })
      .filter(Boolean);
    return parts.join("\n");
  }
  if (typeof value === "object") {
    const obj = value as JsonObject;
    if (Array.isArray(obj.itemListElement)) {
      return normalizeInstructions(obj.itemListElement);
    }
    if (typeof obj.text === "string") return obj.text.trim();
  }
  return "";
}

function parseRecipeFromJsonLd(html: string) {
  const blocks = extractJsonLdBlocks(html);
  for (const block of blocks) {
    try {
      const json = JSON.parse(block.trim()) as JsonValue;
      const recipe = findRecipeNode(json);
      if (!recipe) continue;
      const name = typeof recipe.name === "string" ? recipe.name.trim() : "";
      const ingredients = Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient
            .filter((i: JsonValue) => typeof i === "string")
            .map((i) => String(i).trim())
        : [];
      const instructions = normalizeInstructions(recipe.recipeInstructions);
      if (name || ingredients.length || instructions) {
        return { name, ingredients, instructions };
      }
    } catch {
      // ignore invalid json-ld blocks
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const urlInput = body?.url;
    if (!urlInput || typeof urlInput !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(urlInput);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!/^https?:$/.test(targetUrl.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
    }

    if (isPrivateHostname(targetUrl.hostname)) {
      return NextResponse.json({ error: "Private or local URLs are not allowed" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html = "";
    try {
      const response = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Recipe-Repository/1.0",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch URL (${response.status})` }, { status: 400 });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return NextResponse.json({ error: "URL must return HTML or plain text" }, { status: 400 });
      }

      html = await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json({ error: "Fetching URL timed out" }, { status: 408 });
      }
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 });
    } finally {
      clearTimeout(timeout);
    }

    let parsingWarning: string | null = null;
    if (html.length > MAX_URL_CHARS) {
      html = html.slice(0, MAX_URL_CHARS);
      parsingWarning = "Content truncated while parsing; verify the results.";
    }

    const jsonLdParsed = parseRecipeFromJsonLd(html);
    let extractedRecipeData = jsonLdParsed || { name: "", ingredients: [] as string[], instructions: "" };

    if (!jsonLdParsed) {
      const text = stripHtmlToText(html);
      extractedRecipeData = simpleParseRecipe(text);
      if (!extractedRecipeData.name) {
        const title = extractTitle(html);
        if (title) extractedRecipeData.name = title;
      }
    }

    if (!extractedRecipeData.name && extractedRecipeData.ingredients.length === 0 && !extractedRecipeData.instructions) {
      parsingWarning = parsingWarning || "Could not detect recipe sections; review the extracted text.";
    }

    return NextResponse.json({ extractedRecipeData, parsingWarning });
  } catch (error) {
    console.error("Error importing recipe from URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
