import * as vscode from 'vscode';
import { ReviewComment } from '../models/ReviewComment';
import { CommentService } from '../services/CommentService';
import * as md from '../services/MarkdownService';

const CONTROLLER_ID = 'markdownReviewComments';
const REFRESH_DEBOUNCE_MS = 350;

interface TrackedThread {
  thread: vscode.CommentThread;
  line: number;
  signature: string;
}

/**
 * ReviewCommentController — the GitHub-style editing surface (FR-2 UX,
 * FR-10 inline threads).
 *
 * Uses VSCode's native Comments API so that:
 *  - hovering the gutter of a Markdown file shows a `+` that opens an inline
 *    input box right below the line (no intermediate menus, no top-of-window
 *    prompt);
 *  - saved comments are projected back as inline threads anchored beneath the
 *    line they reference, each with a `Resolve` action.
 *
 * The markdown file remains the single source of truth — threads are a pure
 * projection of it, rebuilt (diffed to avoid flicker) whenever the text or the
 * visible editors change.
 */
export class ReviewCommentController {
  private readonly controller: vscode.CommentController;
  private readonly tracked = new Map<string, TrackedThread>();
  private readonly pending = new Map<string, vscode.TextDocument>();
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly commentService: CommentService) {
    this.controller = vscode.comments.createCommentController(CONTROLLER_ID, 'Markdown Review Comments');
    this.controller.options = {
      prompt: 'Add a review note…',
      placeHolder: 'Leave a review note',
    };
    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document) => {
        if (document.languageId !== 'markdown') {
          return [];
        }
        const lastLine = Math.max(0, document.lineCount - 1);
        return [new vscode.Range(0, 0, lastLine, 0)];
      },
    };

    this.scheduleRefreshVisible();
  }

  // -- entry points ---------------------------------------------------------

  /** Open an inline input thread at the editor's current selection. */
  startCommentAtSelection(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('Markdown Review Comments works only in Markdown files.');
      return;
    }
    const selection = editor.selection;
    const range = new vscode.Range(selection.start, selection.end);
    const thread = this.controller.createCommentThread(editor.document.uri, range, []);
    thread.canReply = true;
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.label = 'Add review note';
    thread.contextValue = 'new';
  }

  /** Persist a new comment typed into an (empty) input thread. */
  async createComment(reply: vscode.CommentReply): Promise<void> {
    const body = (reply.text ?? '').trim();
    const thread = reply.thread;
    if (body.length === 0) {
      thread.dispose();
      return;
    }
    const document = await vscode.workspace.openTextDocument(thread.uri);
    const range = thread.range ?? new vscode.Range(0, 0, 0, 0);
    await this.commentService.addComment(document, range, body);
    thread.dispose();
    this.scheduleRefresh(document);
  }

  /** Resolve (remove) the comment backing a displayed thread. */
  async resolveThread(thread: vscode.CommentThread): Promise<void> {
    const id = typeof thread.contextValue === 'string' && thread.contextValue !== 'new' ? thread.contextValue : undefined;
    const document = await vscode.workspace.openTextDocument(thread.uri);
    await this.commentService.resolveComment(document, id);
    thread.dispose();
    if (id) {
      this.tracked.delete(this.key(thread.uri, id));
    }
    this.scheduleRefresh(document);
  }

  // -- refresh / projection -------------------------------------------------

  scheduleRefresh(document?: vscode.TextDocument): void {
    if (document) {
      if (document.languageId === 'markdown') {
        this.pending.set(document.uri.toString(), document);
      }
    } else {
      this.scheduleRefreshVisible();
      return;
    }
    this.armTimer();
  }

  private scheduleRefreshVisible(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId === 'markdown') {
        this.pending.set(editor.document.uri.toString(), editor.document);
      }
    }
    this.armTimer();
  }

  private armTimer(): void {
    if (this.pending.size === 0) {
      return;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => this.flush(), REFRESH_DEBOUNCE_MS);
  }

  private flush(): void {
    const documents = [...this.pending.values()];
    this.pending.clear();
    for (const document of documents) {
      this.renderDocument(document);
    }
  }

  disposeForUri(uri: vscode.Uri): void {
    const prefix = `${uri.toString()}::`;
    for (const [key, entry] of this.tracked) {
      if (key.startsWith(prefix)) {
        entry.thread.dispose();
        this.tracked.delete(key);
      }
    }
  }

  private renderDocument(document: vscode.TextDocument): void {
    const uriKey = document.uri.toString();

    if (!vscode.workspace.getConfiguration('markdownReviewComments').get<boolean>('showInlineComments', true)) {
      this.disposeForUri(document.uri);
      return;
    }
    if (document.languageId !== 'markdown') {
      return;
    }

    const text = document.getText();
    const markerByCore = new Map(md.findMarkers(text).map((m) => [m.core, m]));
    const lastLine = Math.max(0, document.lineCount - 1);

    const desired = new Map<string, { line: number; signature: string; comment: ReviewComment }>();
    for (const comment of md.parseComments(text)) {
      const marker = markerByCore.get(md.markerCore(comment.id));
      if (!marker) {
        continue; // no anchor → cannot place an inline thread reliably
      }
      const line = Math.min(marker.line + 1, lastLine); // the content line, just below the anchor
      desired.set(comment.id, { line, signature: `${comment.status}|${comment.body}`, comment });
    }

    // Remove threads that no longer exist in this document.
    const prefix = `${uriKey}::`;
    for (const [key, entry] of this.tracked) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const id = key.slice(prefix.length);
      if (!desired.has(id)) {
        entry.thread.dispose();
        this.tracked.delete(key);
      }
    }

    // Create or update threads (only when line/content actually changed).
    for (const [id, info] of desired) {
      const key = this.key(document.uri, id);
      const existing = this.tracked.get(key);
      if (existing && existing.line === info.line && existing.signature === info.signature) {
        continue;
      }
      if (existing) {
        existing.thread.dispose();
        this.tracked.delete(key);
      }
      const thread = this.createDisplayThread(document.uri, info.comment, info.line);
      this.tracked.set(key, { thread, line: info.line, signature: info.signature });
    }
  }

  private createDisplayThread(uri: vscode.Uri, comment: ReviewComment, line: number): vscode.CommentThread {
    const range = new vscode.Range(line, 0, line, 0);
    const display: vscode.Comment = {
      author: { name: comment.id },
      body: new vscode.MarkdownString(comment.body),
      mode: vscode.CommentMode.Preview,
      label: comment.status,
    };
    const thread = this.controller.createCommentThread(uri, range, [display]);
    thread.canReply = false;
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
    thread.label = `Review note ${comment.id}`;
    thread.contextValue = comment.id;
    return thread;
  }

  private key(uri: vscode.Uri, id: string): string {
    return `${uri.toString()}::${id}`;
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    for (const entry of this.tracked.values()) {
      entry.thread.dispose();
    }
    this.tracked.clear();
    this.controller.dispose();
  }
}
