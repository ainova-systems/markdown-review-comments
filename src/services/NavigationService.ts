import * as vscode from 'vscode';
import * as md from './MarkdownService';

/**
 * NavigationService — FR-9.
 *
 * Implements navigation as a {@link vscode.CodeLensProvider}, which is reliable
 * inside the editor (unlike command links, which only fire in the rendered
 * preview). It exposes lenses above each comment block ("Go to source",
 * "Resolve") and above each inline anchor ("Go to comment"), plus the commands
 * those lenses invoke.
 */
export class NavigationService implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  /** Ask VSCode to re-query lenses (call when the document changes). */
  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (document.languageId !== 'markdown') {
      return [];
    }
    if (!vscode.workspace.getConfiguration('markdownReviewComments').get<boolean>('enableCodeLens', true)) {
      return [];
    }

    const text = document.getText();
    const lenses: vscode.CodeLens[] = [];
    const comments = md.parseComments(text);

    // "Go to comment" above each inline anchor — but only where the block it
    // points at still exists, so a leftover anchor cannot offer a dead jump.
    const known = new Set(comments.map((c) => c.id));
    for (const marker of md.findMarkers(text)) {
      if (!known.has(marker.id)) {
        continue;
      }
      lenses.push(
        new vscode.CodeLens(new vscode.Range(marker.line, 0, marker.line, 0), {
          title: '$(comment) Go to comment',
          command: 'markdownReviewComments.navigateToComment',
          arguments: [marker.id],
        })
      );
    }

    for (const comment of comments) {
      const range = new vscode.Range(comment.headingLine ?? 0, 0, comment.headingLine ?? 0, 0);
      lenses.push(
        new vscode.CodeLens(range, {
          title: '$(arrow-right) Go to source',
          command: 'markdownReviewComments.navigateToSource',
          arguments: [comment.id],
        })
      );
      if (comment.status === 'unresolved') {
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(check) Resolve',
            command: 'markdownReviewComments.resolveComment',
            arguments: [comment.id],
          })
        );
      }
    }

    return lenses;
  }

  /** Jump from a comment block to its anchored source line. */
  async navigateToSource(commentId: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const text = editor.document.getText();

    // Primary: the inline anchor (moves with the text, never stale).
    let line = md.findMarkerLine(text, md.markerCore(commentId));

    // Fallback: locate by the comment's selected text (anchors may be disabled).
    if (line < 0) {
      const comment = md.parseComments(text).find((c) => c.id === commentId);
      const needle = comment?.selectedText.split(/\r?\n/)[0]?.trim();
      if (needle) {
        line = md.findFirstLineContaining(text, needle);
      }
    }

    if (line < 0) {
      vscode.window.showWarningMessage(`Source for ${commentId} was not found.`);
      return;
    }
    this.reveal(editor, line);
  }

  /** Jump from an inline anchor to its comment block. */
  async navigateToComment(commentId: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const comment = md.parseComments(editor.document.getText()).find((c) => c.id === commentId);
    if (!comment || comment.headingLine === undefined) {
      vscode.window.showWarningMessage(`Comment ${commentId} was not found.`);
      return;
    }
    this.reveal(editor, comment.headingLine);
  }

  private reveal(editor: vscode.TextEditor, line: number): void {
    const position = new vscode.Position(line, 0);
    const lineRange = editor.document.lineAt(line).range;
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(lineRange, vscode.TextEditorRevealType.InCenter);
  }
}
