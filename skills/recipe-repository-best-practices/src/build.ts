#!/usr/bin/env node
/**
 * Build script to compile rules into AGENTS.md and test-cases.json
 * This generates the main skill documentation from individual rule files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(__dirname, "../rules");
const outputDir = path.join(__dirname, "..");

interface RuleFrontmatter {
  title: string;
  impact: string;
  impactDescription?: string;
  tags: string;
}

interface ProcessedRule {
  id: string;
  section: string;
  order: number;
  frontmatter: RuleFrontmatter;
  content: string;
  filename: string;
}

const sectionOrder: Record<string, number> = {
  "async": 1,
  "bundle": 2,
  "server": 3,
  "client": 4,
  "rerender": 5,
  "rendering": 6,
  "js": 7,
  "advanced": 8,
};

const sectionTitles: Record<string, string> = {
  "async": "1. Eliminating Waterfalls",
  "bundle": "2. Bundle Size Optimization",
  "server": "3. Server-Side Performance",
  "client": "4. Client-Side Data Fetching",
  "rerender": "5. Re-render Optimization",
  "rendering": "6. Rendering Performance",
  "js": "7. JavaScript Performance",
  "advanced": "8. Advanced Patterns",
};

function parseFrontmatter(content: string): {
  frontmatter: RuleFrontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Invalid frontmatter");

  const frontmatterStr = match[1];
  const body = match[2];

  const frontmatter: RuleFrontmatter = {
    title: "",
    impact: "",
    tags: "",
  };

  frontmatterStr.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();

    if (key.trim() === "title") frontmatter.title = value.replace(/^["']|["']$/g, "");
    if (key.trim() === "impact") frontmatter.impact = value.trim();
    if (key.trim() === "impactDescription")
      frontmatter.impactDescription = value.replace(/^["']|["']$/g, "");
    if (key.trim() === "tags") frontmatter.tags = value.trim();
  });

  return { frontmatter, body };
}

function getRuleSection(filename: string): string {
  const prefix = filename.split("-")[0];
  return prefix || "advanced";
}

function getRuleOrder(filename: string): number {
  const parts = filename.replace(/\.md$/, "").split("-");
  parts.shift(); // Remove prefix
  return parts.join(" ").charCodeAt(0) || 0; // Simple alphabetical sort
}

function buildAgentsMd(rules: ProcessedRule[]): string {
  let output = `# Recipe Repository Best Practices

> Agent-optimized best practices guide for Recipe Repository development.
> Last updated: ${new Date().toISOString().split("T")[0]}

## Table of Contents

`;

  // Generate TOC by section
  const sections = new Map<number, string>();
  const sectionRules = new Map<number, ProcessedRule[]>();

  rules.forEach((rule) => {
    const order = sectionOrder[rule.section];
    if (!sections.has(order)) {
      sections.set(order, sectionTitles[rule.section]);
      sectionRules.set(order, []);
    }
    sectionRules.get(order)!.push(rule);
  });

  Array.from(sections.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([order, title]) => {
      output += `- [${title}](#section-${order})\n`;
      const rulesInSection = sectionRules.get(order)!;
      rulesInSection.forEach((rule) => {
        output += `  - [${rule.frontmatter.title}](#${rule.id})\n`;
      });
    });

  output += "\n---\n\n";

  // Generate full content by section
  Array.from(sections.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([order, title]) => {
      output += `## ${title} {#section-${order}}\n\n`;

      const rulesInSection = sectionRules
        .get(order)!
        .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

      rulesInSection.forEach((rule, index) => {
        output += `### ${rule.frontmatter.title} {#${rule.id}}\n\n`;
        output += `**Impact**: ${rule.frontmatter.impact}\n\n`;
        if (rule.frontmatter.impactDescription) {
          output += `${rule.frontmatter.impactDescription}\n\n`;
        }
        output += `**Tags**: ${rule.frontmatter.tags}\n\n`;
        output += rule.content;

        if (index < rulesInSection.length - 1) {
          output += "\n---\n\n";
        }
      });

      output += "\n---\n\n";
    });

  output += `## Resources

- [React Best Practices - React Docs](https://react.dev/learn)
- [Next.js Performance Guide](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [MDN Web Docs](https://developer.mozilla.org/)

`;

  return output;
}

function extractTestCases(rules: ProcessedRule[]): Array<any> {
  const testCases: Array<any> = [];

  rules.forEach((rule) => {
    const codeBlocks = rule.content.match(/```(?:typescript|javascript)\n([\s\S]*?)```/g) || [];

    codeBlocks.forEach((block, index) => {
      const code = block.replace(/```(?:typescript|javascript)\n/, "").replace(/```$/, "");
      const isBad = code.includes("❌");

      testCases.push({
        id: `${rule.id}-test-${index}`,
        rule: rule.frontmatter.title,
        type: isBad ? "bad-example" : "good-example",
        code: code.replace(/^\/\/ ❌ .*\n|^\/\/ ✅ .*\n/g, ""),
        section: rule.section,
      });
    });
  });

  return testCases;
}

// Main execution
try {
  console.log("📦 Building Recipe Repository Best Practices...\n");

  // Read all rule files
  const ruleFiles = fs
    .readdirSync(rulesDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  if (ruleFiles.length === 0) {
    console.warn("⚠️  No rule files found in", rulesDir);
    process.exit(1);
  }

  console.log(`✓ Found ${ruleFiles.length} rule files`);

  // Process rules
  const rules: ProcessedRule[] = ruleFiles.map((filename) => {
    const content = fs.readFileSync(path.join(rulesDir, filename), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const section = getRuleSection(filename);
    const order = getRuleOrder(filename);

    const id = filename.replace(/\.md$/, "");

    return {
      id,
      section,
      order,
      frontmatter,
      content: body,
      filename,
    };
  });

  console.log(`✓ Processed ${rules.length} rules`);

  // Build AGENTS.md
  const agentsMd = buildAgentsMd(rules);
  fs.writeFileSync(path.join(outputDir, "AGENTS.md"), agentsMd);
  console.log("✓ Generated AGENTS.md");

  // Extract test cases
  const testCases = extractTestCases(rules);
  fs.writeFileSync(path.join(outputDir, "test-cases.json"), JSON.stringify(testCases, null, 2));
  console.log(`✓ Extracted ${testCases.length} test cases`);

  console.log("\n✅ Build complete!\n");
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}
