import * as vscode from 'vscode';
import { ReviewComment } from '../models/ReviewComment';
import * as md from './MarkdownService';

/**
 * CommentService — orchestrates comment persistence on top of the pure
 * {@link md MarkdownService}.
 *
 * Operations work on a {@link vscode.TextDocument} and apply changes via
 * {@link vscode.WorkspaceEdit}, so they can be driven either from the active
 * editor or from a comment-thread action (where there may be no active editor).
 */
export class CommentService {
  private config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('markdownReviewComments');
  }

  private eol(document: vscode.TextDocument): string {
    return document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  }

  private async replaceAll(document: vscode.TextDocument, newText: string): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    edit.replace(document.uri, fullRange, newText);
    return vscode.workspace.applyEdit(edit);
  }

  /**
   * FR-3 / FR-4 / FR-5 / FR-6: append a comment block (and an inline anchor)
   * for the given range. Returns the generated comment id.
   */
  async addComment(document: vscode.TextDocument, range: vscode.Range, body: string): Promise<string | undefined> {
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      return undefined;
    }

    const config = this.config();
    const insertMarker = config.get<boolean>('insertSourceMarker', true);
    const sectionTitle = config.get<string>('unresolvedSectionTitle', 'Unresolved Comments');
    const eol = this.eol(document);

    const firstLine = range.start.line;
    const isMultiCharRange = range.start.line !== range.end.line || range.end.character > range.start.character;
    const selectedText = isMultiCharRange ? document.getText(range) : document.lineAt(firstLine).text;

    const text = document.getText();
    const now = new Date();
    const dateStr = md.formatDate(now);
    const sequence = md.nextSequence(text, dateStr);
    const id = md.formatCommentId(dateStr, sequence);

    const comment: ReviewComment = {
      id,
      created: md.formatTimestamp(now),
      status: 'unresolved',
      selectedText,
      body: trimmedBody,
    };

    let newText = text;
    if (insertMarker) {
      newText = md.insertMarker(newText, firstLine, `<!-- review-note: ${md.markerCore(id)} -->`);
    }
    newText = md.insertCommentBlock(newText, sectionTitle, md.formatCommentBlock(comment, eol));

    const applied = await this.replaceAll(document, newText);
    if (applied) {
      vscode.window.setStatusBarMessage(`$(comment) Added ${id}`, 3000);
      return id;
    }
    return undefined;
  }

  /** FR-8: resolve a comment by removing it (and its anchor). */
  async resolveComment(document: vscode.TextDocument, commentId?: string): Promise<void> {
    if (document.languageId !== 'markdown') {
      return;
    }

    const text = document.getText();
    const comments = md.parseComments(text);

    let id = commentId;
    if (!id) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.toString() === document.uri.toString()) {
        const offset = document.offsetAt(editor.selection.active);
        const atCursor = comments.find(
          (c) => c.blockStart !== undefined && c.blockEnd !== undefined && c.blockStart <= offset && offset < c.blockEnd
        );
        if (atCursor) {
          id = atCursor.id;
        }
      }
      if (!id) {
        const unresolved = comments.filter((c) => c.status === 'unresolved');
        if (unresolved.length === 0) {
          vscode.window.showInformationMessage('No unresolved comments found.');
          return;
        }
        const pick = await vscode.window.showQuickPick(
          unresolved.map((c) => ({ label: c.id, detail: c.body })),
          { title: 'Mark Comment Resolved', placeHolder: 'Select a comment to resolve and remove' }
        );
        if (!pick) {
          return;
        }
        id = pick.label;
      }
    }

    const config = this.config();
    const newText = md.removeComment(text, id, {
      removeMarker: config.get<boolean>('removeMarkerOnResolve', true),
      removeEmptySection: config.get<boolean>('removeEmptySection', true),
      sectionTitle: config.get<string>('unresolvedSectionTitle', 'Unresolved Comments'),
      eol: this.eol(document),
    });

    if (newText === null) {
      vscode.window.showWarningMessage(`Comment ${id} was not found.`);
      return;
    }

    const applied = await this.replaceAll(document, newText);
    if (applied) {
      vscode.window.setStatusBarMessage(`$(check) Resolved & removed ${id}`, 3000);
    }
  }

  /** Future Idea: export unresolved comments as an LLM-friendly prompt. */
  async exportReviewContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('Open a Markdown file to export its review context.');
      return;
    }

    const document = editor.document;
    const unresolved = md.parseComments(document.getText()).filter((c) => c.status === 'unresolved');
    if (unresolved.length === 0) {
      vscode.window.showInformationMessage('No unresolved comments to export.');
      return;
    }

    const eol = '\n';
    const lines: string[] = [
      '# Review Context Export',
      '',
      `Source: ${vscode.workspace.asRelativePath(document.uri)}`,
      `Generated: ${md.formatTimestamp(new Date())}`,
      `Unresolved comments: ${unresolved.length}`,
      '',
      'Each note is anchored in the source by `<!-- review-note: CORE -->` (the',
      'CORE matches the comment id without the `COMMENT-` prefix). Address the',
      'concern in the source and remove the corresponding comment block.',
      '',
      '---',
      '',
    ];

    for (const comment of unresolved) {
      lines.push(`## ${comment.id}`, '', `Anchor: review-note: ${md.markerCore(comment.id)}`, '', 'Selected Text:');
      const selected = comment.selectedText.length === 0 ? [''] : comment.selectedText.split(/\r?\n/);
      for (const sel of selected) {
        lines.push(sel.length > 0 ? `> ${sel}` : '>');
      }
      lines.push('', 'Comment:', comment.body, '');
    }

    const content = lines.join(eol);
    const exported = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
    await vscode.window.showTextDocument(exported, { preview: false });
  }
}
