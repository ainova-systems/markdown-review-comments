/**
 * Renders every visual asset the project ships: the Marketplace icon and the
 * README diagrams. Sources are SVG — hand-authored for the icon, generated
 * from the definitions below for the text-heavy diagrams — and rasterised to
 * PNG with `sharp-cli` (fetched on demand via `npx`, so the repository keeps
 * no image dependencies of its own).
 *
 *   npm run media
 *
 * The generated PNGs are committed: the Marketplace renders the README from
 * the repository, and neither CI nor a release may depend on a rasteriser.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'docs', 'media', 'src');
const outDir = join(root, 'docs', 'media');

const C = {
  bg: '#1B202C',
  panel: '#232838',
  panelEdge: '#333A4E',
  text: '#C6CFE6',
  dim: '#7B87A6',
  accent: '#7FA8FF',
  added: '#22352B',
  addedEdge: '#3E7A55',
  addedMark: '#6FD08C',
  heading: '#F0F4FF',
};

const MONO = 'Consolas, &quot;DejaVu Sans Mono&quot;, Menlo, monospace';
const SANS = '&quot;Segoe UI&quot;, &quot;DejaVu Sans&quot;, Helvetica, Arial, sans-serif';

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A diff card: lines tagged `add` render on a green, git-style background. */
function diffCard({ x, y, width, lines, lineHeight = 28, fontSize = 16, pad = 22 }) {
  const height = lines.length * lineHeight + pad * 2;
  const parts = [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${C.panel}" stroke="${C.panelEdge}"/>`,
  ];
  lines.forEach((line, i) => {
    const top = y + pad + i * lineHeight;
    const baseline = top + lineHeight / 2 + fontSize * 0.36;
    if (line.add) {
      parts.push(
        `<rect x="${x + 1}" y="${top}" width="${width - 2}" height="${lineHeight}" fill="${C.added}"/>`,
        `<rect x="${x + 1}" y="${top}" width="4" height="${lineHeight}" fill="${C.addedEdge}"/>`,
        `<text x="${x + 20}" y="${baseline}" font-family="${MONO}" font-size="${fontSize}" fill="${C.addedMark}">+</text>`
      );
    }
    if (line.text) {
      const fill = line.accent ? C.accent : line.dim ? C.dim : C.text;
      parts.push(
        `<text x="${x + 44}" y="${baseline}" font-family="${MONO}" font-size="${fontSize}" fill="${fill}" xml:space="preserve">${esc(line.text)}</text>`
      );
    }
  });
  return { svg: parts.join('\n  '), height };
}

const add = (text, extra = {}) => ({ text, add: true, ...extra });
const ctx = (text, extra = {}) => ({ text, dim: true, ...extra });

// --- hero: one review note, seen as the diff it produces --------------------

function hero() {
  const lines = [
    ctx('## Option B'),
    ctx(''),
    add('<!-- review-note: 2026-09-04-001 -->', { accent: true }),
    ctx('Decouple the Agent Skills directory entirely from adapters.'),
    ctx(''),
    add('---'),
    add(''),
    add('# Unresolved Comments'),
    add(''),
    add('## COMMENT-2026-09-04-001'),
    add(''),
    add('Created: 2026-09-04T14:32:11Z'),
    add('Status: unresolved'),
    add(''),
    add('Selected Text:'),
    add('> Decouple the Agent Skills directory entirely from adapters.'),
    add(''),
    add('Comment:'),
    add('Who owns the sync here - sync.sh, or the target adapters?'),
  ];
  const card = diffCard({ x: 48, y: 132, width: 1184, lines });
  const height = card.height + 132 + 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${height}" viewBox="0 0 1280 ${height}">
  <rect width="1280" height="${height}" fill="${C.bg}"/>
  <text x="48" y="60" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.heading}">A review note is a diff in your Markdown file.</text>
  <text x="48" y="96" font-family="${SANS}" font-size="19" fill="${C.dim}">No sidecar file, no database, no pull request - the note is committed with the text it reviews.</text>
  ${card.svg}
</svg>`;
}

// --- flow: the three-step loop ---------------------------------------------

const STEP_TOP = 116;
const STEP_LINE = 26;
const stepHeight = (body) => STEP_TOP + body.split('\n').length * STEP_LINE + 12;

function step({ x, y, width, height, index, title, body }) {
  const rows = body
    .split('\n')
    .map(
      (line, i) =>
        `<text x="${x + 26}" y="${y + STEP_TOP + i * STEP_LINE}" font-family="${MONO}" font-size="15" fill="${C.dim}" xml:space="preserve">${esc(line)}</text>`
    )
    .join('\n  ');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${C.panel}" stroke="${C.panelEdge}"/>
  <circle cx="${x + 46}" cy="${y + 50}" r="20" fill="${C.accent}"/>
  <text x="${x + 46}" y="${y + 57}" text-anchor="middle" font-family="${SANS}" font-size="19" font-weight="700" fill="${C.bg}">${index}</text>
  <text x="${x + 80}" y="${y + 57}" font-family="${SANS}" font-size="21" font-weight="600" fill="${C.heading}">${esc(title)}</text>
  ${rows}`;
}

function flow() {
  const w = 373;
  const gap = 32;
  const steps = [
    {
      title: 'Comment',
      body: 'Hover the gutter, click +, type\nthe note below the line.\n\nAn anchor goes into the source,\nthe note into the section at the\nbottom of the same file.',
    },
    {
      title: 'Hand it to an agent',
      body: 'Claude, Copilot or Cursor reads\nthe file it was already given.\n\nPlain Markdown - no JSON, no\nhidden metadata. The review is\npart of the document.',
    },
    {
      title: 'Resolve',
      body: 'Resolving deletes the note and\nits anchor.\n\nWhat is left is the corrected\ndocument, plus a git history\nthat records the exchange.',
    },
  ];
  const cardTop = 108;
  const cardHeight = Math.max(...steps.map((s) => stepHeight(s.body)));
  const height = cardTop + cardHeight + 44;
  const body = steps
    .map((s, i) =>
      step({ x: 48 + i * (w + gap), y: cardTop, width: w, height: cardHeight, index: i + 1, ...s })
    )
    .join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${height}" viewBox="0 0 1280 ${height}">
  <rect width="1280" height="${height}" fill="${C.bg}"/>
  <text x="48" y="56" font-family="${SANS}" font-size="28" font-weight="600" fill="${C.heading}">The review loop, without leaving the file</text>
  <text x="48" y="88" font-family="${SANS}" font-size="18" fill="${C.dim}">Every step is a plain-text edit you can read, diff and review.</text>
  ${body}
</svg>`;
}

// --- render -----------------------------------------------------------------

const generated = { 'hero.svg': hero(), 'flow.svg': flow() };

mkdirSync(srcDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(root, 'images'), { recursive: true });

for (const [name, svg] of Object.entries(generated)) {
  writeFileSync(join(srcDir, name), `${svg}\n`, 'utf8');
}

const targets = [
  { svg: 'icon.svg', png: join(root, 'images', 'icon.png') },
  { svg: 'hero.svg', png: join(outDir, 'hero.png') },
  { svg: 'flow.svg', png: join(outDir, 'flow.png') },
];

// `npx` is a shell script on POSIX and a .cmd shim on Windows, so it is invoked
// through the shell as a single quoted command line.
const quote = (value) => `"${value}"`;

let failed = false;
for (const target of targets) {
  const command = [
    'npx --yes sharp-cli@5 -i',
    quote(join(srcDir, target.svg)),
    '-o',
    quote(target.png),
    '--format png',
  ].join(' ');
  const result = spawnSync(command, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    failed = true;
    console.error(`Failed to render ${target.svg}`);
  }
}

process.exit(failed ? 1 : 0);
