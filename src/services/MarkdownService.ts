/**
 * MarkdownService — pure string manipulation for review notes.
 *
 * This module intentionally has **no `vscode` dependency** so it can be unit
 * tested in plain Node and reused anywhere. It implements the "Markdown Parser"
 * and "Comment Service" responsibilities from the PRD:
 *  - finding / creating the unresolved section
 *  - generating deterministic ids
 *  - formatting comment blocks
 *  - parsing existing comments
 *  - inserting anchors and appending / removing comment blocks
 *
 * Per the PRD, "Simple regex acceptable for MVP" — we avoid a full markdown AST.
 */
import { CommentStatus, ReviewComment } from '../models/ReviewComment';

export interface SectionInfo {
  title: string;
  /** 0-based line of the `# Title` heading. */
  headingLine: number;
  /** Offset of the heading's first character. */
  headingStart: number;
  /** Offset where the section body starts (line after the heading). */
  contentStart: number;
  /** Offset where the section ends (start of the next H1, or EOF). */
  contentEnd: number;
}

export interface MarkerInfo {
  /** Anchor core, e.g. `2026-05-24-001`. */
  core: string;
  /** Full comment id, e.g. `COMMENT-2026-05-24-001`. */
  id: string;
  /** 0-based line of the anchor. */
  line: number;
  /** Offset of the anchor start. */
  start: number;
}

export interface RemoveOptions {
  removeMarker: boolean;
  removeEmptySection: boolean;
  sectionTitle: string;
  eol?: string;
}

const COMMENT_HEADING = /^##[ \t]+(COMMENT-\d{4}-\d{2}-\d{2}-\d+)[ \t]*$/;
const HEADING_BOUNDARY = /^#{1,2}[ \t]/;

export function detectEol(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface LineIndex {
  lines: string[];
  starts: number[];
  eol: string;
}

function indexLines(text: string): LineIndex {
  const eol = detectEol(text);
  const lines = text.split(eol);
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + eol.length;
  }
  return { lines, starts, eol };
}

function isH1(line: string): boolean {
  return /^#[ \t]/.test(line) && !line.startsWith('##');
}

// ---------------------------------------------------------------------------
// Ids & timestamps
// ---------------------------------------------------------------------------

/** UTC date portion (`YYYY-MM-DD`), consistent with `Date#toISOString`. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO timestamp without milliseconds, e.g. `2026-05-24T14:32:11Z`. */
export function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function formatCommentId(dateStr: string, sequence: number): string {
  return `COMMENT-${dateStr}-${String(sequence).padStart(3, '0')}`;
}

/** `COMMENT-2026-05-24-001` -> `2026-05-24-001`. */
export function markerCore(id: string): string {
  return id.replace(/^COMMENT-/, '');
}

/**
 * Next per-day sequence number. Deterministic: scans existing ids for the same
 * date and returns max + 1 (1-based, so the first comment of a day is 001).
 */
export function nextSequence(text: string, dateStr: string): number {
  const re = new RegExp(`COMMENT-${dateStr}-(\\d+)`, 'g');
  let max = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = parseInt(match[1], 10);
    if (value > max) {
      max = value;
    }
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function quoteSelectedText(selectedText: string, eol: string): string {
  if (selectedText.length === 0) {
    return '>';
  }
  return selectedText
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join(eol);
}

/**
 * Render a comment as the canonical markdown block (no trailing newline).
 *
 * The block intentionally omits a line number: the inline
 * `<!-- review-note: ID -->` anchor (whose core matches this id) is the stable
 * source link, and `Selected Text` is the human/AI-readable locator.
 */
export function formatCommentBlock(comment: ReviewComment, eol = '\n'): string {
  return [
    `## ${comment.id}`,
    '',
    `Created: ${comment.created}`,
    `Status: ${comment.status}`,
    '',
    'Selected Text:',
    quoteSelectedText(comment.selectedText, eol),
    '',
    'Comment:',
    comment.body,
  ].join(eol);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export function findSection(text: string, title: string): SectionInfo | null {
  const { lines, starts } = indexLines(text);
  const headingRe = new RegExp(`^#[ \\t]+${escapeRegExp(title)}[ \\t]*$`);

  let headingLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      headingLine = i;
      break;
    }
  }
  if (headingLine === -1) {
    return null;
  }

  let endLine = lines.length;
  for (let j = headingLine + 1; j < lines.length; j++) {
    if (isH1(lines[j])) {
      endLine = j;
      break;
    }
  }

  const headingStart = starts[headingLine];
  const contentStart = headingLine + 1 < lines.length ? starts[headingLine + 1] : text.length;
  const contentEnd = endLine < lines.length ? starts[endLine] : text.length;
  return { title, headingLine, headingStart, contentStart, contentEnd };
}

/**
 * Append `block` to the section titled `sectionTitle`, creating the section
 * (with a leading `---` separator) at the end of the document if it is missing.
 * Returns the full new document text.
 */
export function insertCommentBlock(text: string, sectionTitle: string, block: string): string {
  const eol = detectEol(text);
  const section = findSection(text, sectionTitle);

  if (section) {
    let head = text.slice(0, section.contentStart);
    const content = text.slice(section.contentStart, section.contentEnd);
    const tail = text.slice(section.contentEnd);
    const trimmedContent = content.replace(/\s+$/, '');

    if (!head.endsWith('\n')) {
      head += eol;
    }

    const newContent =
      trimmedContent.length === 0
        ? `${eol}${block}${eol}`
        : `${trimmedContent}${eol}${eol}${block}${eol}`;

    const separator = tail.length > 0 ? eol : '';
    return head + newContent + separator + tail;
  }

  const trimmedAll = text.replace(/\s+$/, '');
  if (trimmedAll.length === 0) {
    return `# ${sectionTitle}${eol}${eol}${block}${eol}`;
  }
  return `${trimmedAll}${eol}${eol}---${eol}${eol}# ${sectionTitle}${eol}${eol}${block}${eol}`;
}

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

/** Insert `markerText` on its own line above the 0-based `lineIndex`. */
export function insertMarker(text: string, lineIndex: number, markerText: string): string {
  const { lines, starts, eol } = indexLines(text);
  const target = Math.max(0, lineIndex);

  if (target >= lines.length) {
    const needsEol = text.length > 0 && !text.endsWith('\n');
    return `${text}${needsEol ? eol : ''}${markerText}${eol}`;
  }

  const offset = starts[target];
  return `${text.slice(0, offset)}${markerText}${eol}${text.slice(offset)}`;
}

export function findMarkers(text: string): MarkerInfo[] {
  const { lines, starts } = indexLines(text);
  const re = /<!--\s*review-note:\s*(\d{4}-\d{2}-\d{2}-\d+)\s*-->/;
  const result: MarkerInfo[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = re.exec(lines[i]);
    if (match) {
      result.push({ core: match[1], id: `COMMENT-${match[1]}`, line: i, start: starts[i] });
    }
  }
  return result;
}

/** 0-based line of the anchor for `core`, or -1 if none. */
export function findMarkerLine(text: string, core: string): number {
  const { lines } = indexLines(text);
  const re = new RegExp(`<!--\\s*review-note:\\s*${escapeRegExp(core)}\\s*-->`);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * 0-based line of the first line containing `needle` (used as a navigation
 * fallback when no anchor is present), or -1. Anchor lines are skipped so we
 * land on the content rather than on the marker.
 */
export function findFirstLineContaining(text: string, needle: string): number {
  if (!needle) {
    return -1;
  }
  const { lines } = indexLines(text);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle) && !/<!--\s*review-note:/.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function removeMarkerLine(text: string, core: string): string {
  const line = findMarkerLine(text, core);
  if (line === -1) {
    return text;
  }
  const { starts } = indexLines(text);
  const lineStart = starts[line];
  const lineEnd = line + 1 < starts.length ? starts[line + 1] : text.length;
  return text.slice(0, lineStart) + text.slice(lineEnd);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function matchField(lines: string[], re: RegExp): string | undefined {
  for (const line of lines) {
    const match = re.exec(line);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function parseBody(
  id: string,
  headingLine: number,
  blockStart: number,
  blockEnd: number,
  bodyLines: string[],
  eol: string
): ReviewComment {
  const lineValue = matchField(bodyLines, /^Line:\s*(\d+)/);
  const created = matchField(bodyLines, /^Created:\s*(.+)$/);
  const status = matchField(bodyLines, /^Status:\s*(\w+)/);

  let selectedText = '';
  const selectedIdx = bodyLines.findIndex((l) => /^Selected Text:\s*$/.test(l));
  if (selectedIdx >= 0) {
    const quoted: string[] = [];
    for (let k = selectedIdx + 1; k < bodyLines.length; k++) {
      const line = bodyLines[k];
      if (/^>/.test(line)) {
        quoted.push(line.replace(/^>\s?/, ''));
      } else if (line.trim() === '') {
        if (quoted.length > 0) {
          break;
        }
      } else {
        break;
      }
    }
    selectedText = quoted.join(eol);
  }

  let body = '';
  const commentIdx = bodyLines.findIndex((l) => /^Comment:\s*$/.test(l));
  if (commentIdx >= 0) {
    body = bodyLines.slice(commentIdx + 1).join(eol).replace(/\s+$/, '');
  }

  return {
    id,
    headingLine,
    blockStart,
    blockEnd,
    line: lineValue ? parseInt(lineValue, 10) : undefined,
    created: created ?? '',
    status: (status as CommentStatus) ?? 'unresolved',
    selectedText,
    body,
  };
}

export function parseComments(text: string): ReviewComment[] {
  const { lines, starts, eol } = indexLines(text);
  const result: ReviewComment[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = COMMENT_HEADING.exec(lines[i]);
    if (!match) {
      continue;
    }

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (HEADING_BOUNDARY.test(lines[j])) {
        end = j;
        break;
      }
    }

    const blockStart = starts[i];
    const blockEnd = end < lines.length ? starts[end] : text.length;
    const bodyLines = lines.slice(i + 1, end);
    result.push(parseBody(match[1], i, blockStart, blockEnd, bodyLines, eol));
    i = end - 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Resolve (= remove)
// ---------------------------------------------------------------------------

function joinPreservingTrailing(before: string, after: string, eol: string, originalEndsWithNewline: boolean): string {
  let result: string;
  if (before && after) {
    result = `${before}${eol}${eol}${after}`;
  } else if (before) {
    result = before + eol;
  } else {
    result = after;
  }
  if (originalEndsWithNewline && result.length > 0 && !result.endsWith('\n')) {
    result += eol;
  }
  return result;
}

function removeEmptySection(text: string, title: string, eol: string): string {
  const section = findSection(text, title);
  if (!section) {
    return text;
  }
  const body = text.slice(section.contentStart, section.contentEnd).trim();
  if (body.length > 0) {
    return text;
  }

  const { lines, starts } = indexLines(text);
  let startLine = section.headingLine;

  // Walk upward past blank lines, optionally consuming a `---` separator.
  let probe = startLine - 1;
  let firstBlank = startLine;
  while (probe >= 0 && lines[probe].trim() === '') {
    firstBlank = probe;
    probe--;
  }
  if (probe >= 0 && /^-{3,}$/.test(lines[probe].trim())) {
    startLine = probe;
  } else if (firstBlank < startLine) {
    startLine = firstBlank;
  }

  const before = text.slice(0, starts[startLine]).replace(/\s+$/, '');
  const after = text.slice(section.contentEnd).replace(/^\s+/, '');
  return joinPreservingTrailing(before, after, eol, text.endsWith('\n'));
}

/**
 * Resolve a comment by removing its block (and, by default, its inline anchor).
 * Returns the full new document text, or `null` if the comment id is unknown.
 */
export function removeComment(text: string, id: string, options: RemoveOptions): string | null {
  const eol = options.eol ?? detectEol(text);
  const exists = parseComments(text).some((c) => c.id === id);
  if (!exists) {
    return null;
  }

  let working = text;
  if (options.removeMarker) {
    working = removeMarkerLine(working, markerCore(id));
  }

  const target = parseComments(working).find((c) => c.id === id);
  if (!target || target.blockStart === undefined || target.blockEnd === undefined) {
    return working;
  }

  const before = working.slice(0, target.blockStart).replace(/\s+$/, '');
  const after = working.slice(target.blockEnd).replace(/^\s+/, '');
  let result = joinPreservingTrailing(before, after, eol, working.endsWith('\n'));

  if (options.removeEmptySection) {
    result = removeEmptySection(result, options.sectionTitle, eol);
  }

  return result;
}
