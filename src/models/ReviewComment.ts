/**
 * Domain model for a single review note.
 *
 * The markdown file is the source of truth (Design Principle 1), so this type
 * is just an in-memory projection of a `## COMMENT-...` block. Parse-time
 * offsets are optional and only populated when a comment is read back from
 * existing markdown.
 */
export type CommentStatus = 'unresolved' | 'resolved';

export interface ReviewComment {
  /** Human-readable, deterministic id, e.g. `COMMENT-2026-05-24-001`. */
  id: string;
  /**
   * Legacy 1-based source line. No longer written to new comments: line
   * numbers drift whenever text is added above them. The inline
   * `<!-- review-note: ID -->` anchor is the authoritative source link. Kept
   * optional so older files still parse.
   */
  line?: number;
  /** ISO-8601 creation timestamp, e.g. `2026-05-24T14:32:11Z`. */
  created: string;
  /** Workflow status. */
  status: CommentStatus;
  /** The text that was selected when the comment was created. */
  selectedText: string;
  /** The reviewer's note. */
  body: string;

  /** 0-based line of the `## COMMENT-...` heading (parse-time only). */
  headingLine?: number;
  /** Character offset of the block start (parse-time only). */
  blockStart?: number;
  /** Character offset just past the block end (parse-time only). */
  blockEnd?: number;
}
