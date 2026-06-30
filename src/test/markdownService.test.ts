import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReviewComment } from '../models/ReviewComment';
import * as md from '../services/MarkdownService';

function makeComment(overrides: Partial<ReviewComment> = {}): ReviewComment {
  return {
    id: 'COMMENT-2026-05-24-001',
    created: '2026-05-24T14:32:11Z',
    status: 'unresolved',
    selectedText: 'Decouple the Agent Skills directory entirely from adapters.',
    body: 'Need to validate whether ownership belongs to sync.sh or target adapters.',
    ...overrides,
  };
}

test('formatCommentId zero-pads the sequence', () => {
  assert.equal(md.formatCommentId('2026-05-24', 1), 'COMMENT-2026-05-24-001');
  assert.equal(md.formatCommentId('2026-05-24', 42), 'COMMENT-2026-05-24-042');
  assert.equal(md.formatCommentId('2026-05-24', 1234), 'COMMENT-2026-05-24-1234');
});

test('markerCore strips the COMMENT- prefix', () => {
  assert.equal(md.markerCore('COMMENT-2026-05-24-001'), '2026-05-24-001');
});

test('nextSequence returns 1 for an empty document', () => {
  assert.equal(md.nextSequence('', '2026-05-24'), 1);
});

test('nextSequence increments past the highest id for the day', () => {
  const text = [
    '## COMMENT-2026-05-24-001',
    '## COMMENT-2026-05-24-003',
    '## COMMENT-2026-05-23-009',
  ].join('\n');
  assert.equal(md.nextSequence(text, '2026-05-24'), 4);
  assert.equal(md.nextSequence(text, '2026-05-23'), 10);
  assert.equal(md.nextSequence(text, '2026-05-25'), 1);
});

test('formatCommentBlock renders the canonical block without a line number', () => {
  const block = md.formatCommentBlock(makeComment(), '\n');
  assert.equal(
    block,
    [
      '## COMMENT-2026-05-24-001',
      '',
      'Created: 2026-05-24T14:32:11Z',
      'Status: unresolved',
      '',
      'Selected Text:',
      '> Decouple the Agent Skills directory entirely from adapters.',
      '',
      'Comment:',
      'Need to validate whether ownership belongs to sync.sh or target adapters.',
    ].join('\n')
  );
  assert.doesNotMatch(block, /^Line:/m);
});

test('formatCommentBlock quotes multi-line and empty selections', () => {
  const block = md.formatCommentBlock(makeComment({ selectedText: 'first\n\nthird' }), '\n');
  assert.match(block, /Selected Text:\n> first\n>\n> third/);

  const empty = md.formatCommentBlock(makeComment({ selectedText: '' }), '\n');
  assert.match(empty, /Selected Text:\n>\n/);
});

test('insertCommentBlock creates the section when missing', () => {
  const text = '# Title\n\nSome content.\n';
  const block = md.formatCommentBlock(makeComment(), '\n');
  const result = md.insertCommentBlock(text, 'Unresolved Comments', block);

  assert.match(result, /Some content\.\n\n---\n\n# Unresolved Comments\n\n## COMMENT-2026-05-24-001/);
  // exactly one section heading
  assert.equal((result.match(/^# Unresolved Comments$/gm) ?? []).length, 1);
});

test('insertCommentBlock appends to an existing section without duplicating it', () => {
  const text = [
    '# Doc',
    '',
    '---',
    '',
    '# Unresolved Comments',
    '',
    '## COMMENT-2026-05-24-001',
    '',
    'Line: 1',
    'Created: 2026-05-24T10:00:00Z',
    'Status: unresolved',
    '',
    'Selected Text:',
    '> a',
    '',
    'Comment:',
    'first',
    '',
  ].join('\n');

  const block = md.formatCommentBlock(makeComment({ id: 'COMMENT-2026-05-24-002', body: 'second' }), '\n');
  const result = md.insertCommentBlock(text, 'Unresolved Comments', block);

  assert.equal((result.match(/^# Unresolved Comments$/gm) ?? []).length, 1);
  assert.ok(result.indexOf('COMMENT-2026-05-24-001') < result.indexOf('COMMENT-2026-05-24-002'));
  assert.match(result, /first\n\n## COMMENT-2026-05-24-002/);
});

test('insertCommentBlock works on an empty document', () => {
  const block = md.formatCommentBlock(makeComment(), '\n');
  const result = md.insertCommentBlock('', 'Unresolved Comments', block);
  assert.ok(result.startsWith('# Unresolved Comments\n\n## COMMENT-2026-05-24-001'));
});

test('insertMarker places the anchor on its own line above the target', () => {
  const text = '## Option B\n\nDecouple the agent skills.\n';
  const result = md.insertMarker(text, 2, '<!-- review-note: 2026-05-24-001 -->');
  assert.match(result, /\n<!-- review-note: 2026-05-24-001 -->\nDecouple the agent skills\./);
});

test('findMarkers and findMarkerLine locate anchors', () => {
  const text = ['line 0', '<!-- review-note: 2026-05-24-001 -->', 'anchored line'].join('\n');
  const markers = md.findMarkers(text);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].core, '2026-05-24-001');
  assert.equal(markers[0].id, 'COMMENT-2026-05-24-001');
  assert.equal(markers[0].line, 1);
  assert.equal(md.findMarkerLine(text, '2026-05-24-001'), 1);
  assert.equal(md.findMarkerLine(text, '2026-05-24-999'), -1);
});

test('findFirstLineContaining locates content and skips anchor lines', () => {
  const text = [
    '# Doc',
    '<!-- review-note: 2026-05-24-001 -->',
    'Decouple the agent skills.',
    'Another paragraph.',
  ].join('\n');
  assert.equal(md.findFirstLineContaining(text, 'Decouple the agent skills.'), 2);
  assert.equal(md.findFirstLineContaining(text, 'missing text'), -1);
  assert.equal(md.findFirstLineContaining(text, ''), -1);
});

test('parseComments reads back every field', () => {
  const text = [
    '# Doc',
    '',
    '# Unresolved Comments',
    '',
    '## COMMENT-2026-05-24-001',
    '',
    'Line: 12',
    'Created: 2026-05-24T14:32:11Z',
    'Status: unresolved',
    '',
    'Selected Text:',
    '> Decouple the Agent Skills directory entirely from adapters.',
    '',
    'Comment:',
    'Need to validate ownership.',
  ].join('\n');

  const comments = md.parseComments(text);
  assert.equal(comments.length, 1);
  const [c] = comments;
  assert.equal(c.id, 'COMMENT-2026-05-24-001');
  assert.equal(c.line, 12);
  assert.equal(c.created, '2026-05-24T14:32:11Z');
  assert.equal(c.status, 'unresolved');
  assert.equal(c.selectedText, 'Decouple the Agent Skills directory entirely from adapters.');
  assert.equal(c.body, 'Need to validate ownership.');
  assert.equal(c.headingLine, 4);
});

test('round-trip: a formatted block parses back to the same comment', () => {
  const original = makeComment();
  const text = md.insertCommentBlock('', 'Unresolved Comments', md.formatCommentBlock(original, '\n'));
  const [parsed] = md.parseComments(text);
  assert.equal(parsed.id, original.id);
  assert.equal(parsed.line, original.line);
  assert.equal(parsed.created, original.created);
  assert.equal(parsed.status, original.status);
  assert.equal(parsed.selectedText, original.selectedText);
  assert.equal(parsed.body, original.body);
});

test('removeComment returns null for an unknown id', () => {
  const result = md.removeComment('# Doc\n', 'COMMENT-2026-05-24-099', {
    removeMarker: true,
    removeEmptySection: true,
    sectionTitle: 'Unresolved Comments',
  });
  assert.equal(result, null);
});

test('removeComment removes the block, its anchor and the empty section', () => {
  let text = '## Option B\n\nDecouple the agent skills.\n';
  text = md.insertMarker(text, 2, '<!-- review-note: 2026-05-24-001 -->');
  text = md.insertCommentBlock(text, 'Unresolved Comments', md.formatCommentBlock(makeComment(), '\n'));

  // sanity: anchor + section exist
  assert.match(text, /<!-- review-note: 2026-05-24-001 -->/);
  assert.match(text, /# Unresolved Comments/);

  const result = md.removeComment(text, 'COMMENT-2026-05-24-001', {
    removeMarker: true,
    removeEmptySection: true,
    sectionTitle: 'Unresolved Comments',
  });

  assert.ok(result !== null);
  assert.doesNotMatch(result as string, /review-note/);
  assert.doesNotMatch(result as string, /COMMENT-2026-05-24-001/);
  assert.doesNotMatch(result as string, /# Unresolved Comments/);
  assert.match(result as string, /## Option B/);
  assert.match(result as string, /Decouple the agent skills\./);
});

test('removeComment keeps the section when other comments remain', () => {
  let text = '# Doc\n';
  text = md.insertCommentBlock(text, 'Unresolved Comments', md.formatCommentBlock(makeComment(), '\n'));
  text = md.insertCommentBlock(
    text,
    'Unresolved Comments',
    md.formatCommentBlock(makeComment({ id: 'COMMENT-2026-05-24-002', body: 'second' }), '\n')
  );

  const result = md.removeComment(text, 'COMMENT-2026-05-24-001', {
    removeMarker: false,
    removeEmptySection: true,
    sectionTitle: 'Unresolved Comments',
  });

  assert.ok(result !== null);
  assert.match(result as string, /# Unresolved Comments/);
  assert.doesNotMatch(result as string, /COMMENT-2026-05-24-001/);
  assert.match(result as string, /COMMENT-2026-05-24-002/);
});

test('CRLF documents keep CRLF line endings', () => {
  const text = '# Doc\r\n\r\nContent.\r\n';
  const block = md.formatCommentBlock(makeComment(), '\r\n');
  const result = md.insertCommentBlock(text, 'Unresolved Comments', block);
  assert.ok(result.includes('\r\n'));
  assert.ok(!/[^\r]\n/.test(result), 'should not contain bare LF');
});
