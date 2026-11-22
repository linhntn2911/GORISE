#!/usr/bin/env node
/**
 * GORISE CSS migration helper
 *
 * Usage:
 *   node tools/split-css.mjs
 *   node tools/split-css.mjs --source styles.css --out styles/generated
 *
 * This script is intentionally non-destructive:
 * - It never edits styles.css or HTML files.
 * - It splits comment-delimited CSS blocks into candidate files.
 * - Unrecognised blocks go to review.css instead of being guessed away.
 * - Review generated files before replacing the monolithic stylesheet.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const value = process.argv[i];
  if (value.startsWith('--')) args.set(value.slice(2), process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true);
}

const sourcePath = path.resolve(projectRoot, String(args.get('source') || 'styles.css'));
const outputDir = path.resolve(projectRoot, String(args.get('out') || 'styles/generated'));
const source = await fs.readFile(sourcePath, 'utf8');

const routeRules = [
  { file: 'core.css', test: /fonts|reset|token|design system|typography system|responsive design system/i },
  { file: 'public-shell.css', test: /header|footer|mascot|floating gorise mascot|tigori ai companion|mobile experience|mobile tigori|collision fix/i },
  { file: 'home.css', test: /homepage|^section [2-6]|section 2|section 3|section 4|section 5|section 6|hero video banner|adventure map|board game journey|safe home cinematic|character cards/i },
  { file: 'about.css', test: /về gorise|about|storybook|philosophy|vision|mission|interactive storybook|flashcard/i },
  { file: 'news.css', test: /tin tức|news/i },
  { file: 'shop.css', test: /shop|explorer|comparison|product/i },
  { file: 'video.css', test: /situation|video|playlist|player|hero tình huống/i },
  { file: 'contact.css', test: /liên hệ|contact/i },
  { file: 'cart.css', test: /cart|checkout|payment|gio hang|giỏ hàng/i },
  { file: 'admin.css', test: /cms dashboard|video analytics|admin|builder|phase 3|studio/i },
];

function classify(title) {
  for (const rule of routeRules) {
    if (rule.test.test(title)) return rule.file;
  }
  return 'review.css';
}

function extractBlocks(text) {
  const lines = text.split(/(?<=\n)/);
  const blocks = [];
  let current = { title: 'Preamble / unlabelled CSS', startLine: 1, lines: [] };
  let lineNumber = 1;

  for (const line of lines) {
    // Current styles.css uses standalone comment headings for most sections.
    const heading = line.match(/^\s*\/\*\s*(.*?)\s*\*\/\s*$/);
    if (heading && current.lines.length) {
      blocks.push({ ...current, endLine: lineNumber - 1 });
      current = { title: heading[1], startLine: lineNumber, lines: [line] };
    } else {
      current.lines.push(line);
    }
    lineNumber += 1;
  }
  if (current.lines.length) blocks.push({ ...current, endLine: lineNumber - 1 });
  return blocks;
}

const blocks = extractBlocks(source);
const grouped = new Map();
for (const block of blocks) {
  const file = classify(block.title);
  if (!grouped.has(file)) grouped.set(file, []);
  grouped.get(file).push(block);
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const banner = (file) => `/* GENERATED CANDIDATE — review before integration.\n * Source: styles.css\n * Destination: ${file}\n * This file is not loaded automatically.\n */\n\n`;
const report = [];

for (const [file, fileBlocks] of grouped) {
  const body = fileBlocks.map((block) => block.lines.join('')).join('\n');
  await fs.writeFile(path.join(outputDir, file), banner(file) + body);
  report.push({ file, blocks: fileBlocks.map((block) => ({ title: block.title, startLine: block.startLine, endLine: block.endLine, bytes: Buffer.byteLength(block.lines.join('')) })) });
}

const reportLines = [
  '# CSS split review report',
  '',
  `Source: \`${path.relative(projectRoot, sourcePath)}\``,
  `Output: \`${path.relative(projectRoot, outputDir)}\``,
  '',
  '> These are candidate files. Do not remove the monolithic stylesheet until each route is visually and functionally verified.',
  '',
];
for (const item of report) {
  reportLines.push(`## ${item.file}`);
  for (const block of item.blocks) {
    reportLines.push(`- Lines ${block.startLine}-${block.endLine} (${block.bytes} bytes): ${block.title}`);
  }
  reportLines.push('');
}
await fs.writeFile(path.join(outputDir, 'REPORT.md'), reportLines.join('\n'));
await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({ source: path.relative(projectRoot, sourcePath), generatedAt: new Date().toISOString(), files: report }, null, 2) + '\n');

console.log(`Generated ${grouped.size} candidate CSS files in ${path.relative(projectRoot, outputDir)}`);
for (const [file, fileBlocks] of grouped) {
  const bytes = fileBlocks.reduce((sum, block) => sum + Buffer.byteLength(block.lines.join('')), 0);
  console.log(`- ${file}: ${fileBlocks.length} blocks, ${bytes} bytes`);
}
console.log('Review REPORT.md before integrating any file.');
