import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const source = resolve(root, 'tin-tuc/index.html');
const template = readFileSync(source, 'utf8');
const meta = JSON.parse(readFileSync(resolve(root, 'news-seo-meta.json'), 'utf8'));
const legacySlugs = [
  '5-khu-vuc-tiem-an-nguy-hiem-trong-ngoi-nha',
  'con-biet-nguy-hiem-nhung-lieu-con-co-biet-phai-lam-gi',
  'vi-sao-tre-can-hoc-ky-nang-an-toan-tu-som',
  'safe-home-hoc-ky-nang-an-toan-qua-tung-luot-choi',
  'board-game-giao-duc-la-gi',
  'gorise-hanh-trinh-bat-dau-tu-mot-y-tuong',
];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const replaceMeta = (html, article) => {
  const title = `${article.title} | Tin tức GORISE`;
  const image = article.image;
  const tags = [
    ['title', title],
    ['meta[name="description"]', article.summary],
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', article.summary],
    ['meta[property="og:type"]', 'article'],
    ['meta[property="og:image"]', image],
    ['meta[property="og:image:alt"]', article.alt],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', article.summary],
    ['meta[name="twitter:image"]', image],
    ['meta[name="twitter:image:alt"]', article.alt],
  ];
  let out=html;
  out=out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  for (const [selector,value] of tags.slice(1)) {
    if (selector === 'meta[name="description"]') out=out.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, `$1${escapeHtml(value)}$2`);
    else {
      const attr=selector.includes('property=')?'property':'name';
      const key=selector.match(/=["']([^"']+)/)[1];
      const re=new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*("\\s*\\/?>)`,`i`);
      out=out.replace(re, `$1${escapeHtml(value)}$2`);
    }
  }
  return out;
};
const all = [...legacySlugs.map((slug) => ({slug})), ...meta];
for (const item of all) {
  const article = meta.find((candidate) => candidate.slug === item.slug);
  const target = resolve(root, 'dist', 'tin-tuc', item.slug);
  mkdirSync(target, { recursive: true });
  writeFileSync(resolve(target, 'index.html'), article ? replaceMeta(template, article) : template);
}
console.log(`Created ${all.length} Tin tức detail routes.`);
