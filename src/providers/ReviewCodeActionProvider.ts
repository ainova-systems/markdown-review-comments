import * as vscode from 'vscode';
import * as md from './../services/MarkdownService';

/**
 * ReviewCodeActionProvider — FR-2.
 *
 * Surfaces review actions via the lightbulb / Ctrl+. Anywhere in a Markdown
 * file it offers "Add Unresolved Comment". When the cursor sits inside an
 * existing comment block it additionally offers "Mark Comment Resolved" and
 * "Go to Source Line".
 */
export class ReviewCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.CodeAction[] {
    if (document.languageId !== 'markdown') {
      return [];
    }

    const actions: vscode.CodeAction[] = [];

    const add = new vscode.CodeAction('Add Unresolved Comment', vscode.CodeActionKind.QuickFix);
    add.command = { command: 'markdownReviewNotes.addComment', title: 'Add Unresolved Comment' };
    actions.push(add);

    const offset = document.offsetAt(range.start);
    const comment = md
      .parseComments(document.getText())
      .find((c) => c.blockStart !== undefined && c.blockEnd !== undefined && c.blockStart <= offset && offset < c.blockEnd);

    if (comment) {
      if (comment.status === 'unresolved') {
        const resolve = new vscode.CodeAction('Mark Comment Resolved', vscode.CodeActionKind.QuickFix);
        resolve.command = {
          command: 'markdownReviewNotes.resolveComment',
          title: 'Mark Comment Resolved',
          arguments: [comment.id],
        };
        actions.push(resolve);
      }

      const navigate = new vscode.CodeAction('Go to Source Line', vscode.CodeActionKind.QuickFix);
      navigate.command = {
        command: 'markdownReviewNotes.navigateToSource',
        title: 'Go to Source Line',
        arguments: [comment.id],
      };
      actions.push(navigate);
    }

    return actions;
  }
}
