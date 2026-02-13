#!/usr/bin/env node
/**
 * Validate script to check rule files for proper formatting
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(__dirname, "../rules");

const requiredFields = ["title", "impact", "tags"];
const validImpactLevels = [
  "CRITICAL",
  "HIGH",
  "MEDIUM-HIGH",
  "MEDIUM",
  "LOW-MEDIUM",
  "LOW",
];

let errorCount = 0;

function validateRule(filename: string, content: string) {
  const lines = content.split("\n");

  // Check frontmatter
  if (!content.startsWith("---")) {
    console.error(`❌ ${filename}: Missing frontmatter opening`);
    errorCount++;
    return;
  }

  const frontmatterEnd = content.indexOf("\n---\n");
  if (frontmatterEnd === -1) {
    console.error(`❌ ${filename}: Missing frontmatter closing`);
    errorCount++;
    return;
  }

  const frontmatterStr = content.substring(4, frontmatterEnd);
  const frontmatterObj: Record<string, string> = {};

  frontmatterStr.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key) {
      frontmatterObj[key.trim()] = value;
    }
  });

  // Check required fields
  requiredFields.forEach((field) => {
    if (!frontmatterObj[field]) {
      console.error(`❌ ${filename}: Missing required field '${field}'`);
      errorCount++;
    }
  });

  // Check impact level
  if (
    frontmatterObj.impact &&
    !validImpactLevels.includes(frontmatterObj.impact)
  ) {
    console.error(
      `❌ ${filename}: Invalid impact level '${frontmatterObj.impact}'`
    );
    console.error(`   Valid levels: ${validImpactLevels.join(", ")}`);
    errorCount++;
  }

  // Check for content structure
  const body = content.substring(frontmatterEnd + 5);

  if (!body.includes("### Incorrect") && !body.includes("### Correct")) {
    console.warn(`⚠️  ${filename}: Should include "Incorrect" and "Correct" sections`);
  }

  if (!body.includes("```")) {
    console.warn(`⚠️  ${filename}: Consider adding code examples`);
  }
}

// Main execution
try {
  const ruleFiles = fs
    .readdirSync(rulesDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  console.log(`🔍 Validating ${ruleFiles.length} rule files...\n`);

  ruleFiles.forEach((filename) => {
    const content = fs.readFileSync(path.join(rulesDir, filename), "utf-8");
    validateRule(filename, content);
  });

  if (errorCount === 0) {
    console.log(`✅ All rules are valid!\n`);
  } else {
    console.error(`\n❌ Found ${errorCount} error(s)\n`);
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Validation failed:", error);
  process.exit(1);
}
