import * as vscode from 'vscode';
import { ReviewCodeActionProvider } from './providers/ReviewCodeActionProvider';
import { ReviewCommentController } from './providers/ReviewCommentController';
import { CommentService } from './services/CommentService';
import { NavigationService } from './services/NavigationService';

const MARKDOWN: vscode.DocumentSelector = [
  { language: 'markdown', scheme: 'file' },
  { language: 'markdown', scheme: 'untitled' },
];

export function activate(context: vscode.ExtensionContext): void {
  const commentService = new CommentService();
  const navigationService = new NavigationService();
  const reviewComments = new ReviewCommentController(commentService);

  const activeMarkdownDocument = (): vscode.TextDocument | undefined => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('Markdown Review Comments: open a Markdown file first.');
      return undefined;
    }
    return editor.document;
  };

  context.subscriptions.push(
    // Opens the native inline input at the selection (lightbulb / Ctrl+Alt+M / palette).
    vscode.commands.registerCommand('markdownReviewComments.addComment', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Markdown Review Comments: open a Markdown file first.');
        return;
      }
      reviewComments.startCommentAtSelection(editor);
    }),
    // Submit button inside an inline input thread.
    vscode.commands.registerCommand('markdownReviewComments.createComment', (reply: vscode.CommentReply) =>
      reviewComments.createComment(reply)
    ),
    // Resolve button on a displayed comment thread.
    vscode.commands.registerCommand('markdownReviewComments.resolveThread', (thread: vscode.CommentThread) =>
      reviewComments.resolveThread(thread)
    ),
    // Resolve via palette / CodeLens / code action (id-based).
    vscode.commands.registerCommand('markdownReviewComments.resolveComment', async (id?: string) => {
      const document = activeMarkdownDocument();
      if (document) {
        await commentService.resolveComment(document, id);
      }
    }),
    vscode.commands.registerCommand('markdownReviewComments.navigateToSource', (id: string) =>
      navigationService.navigateToSource(id)
    ),
    vscode.commands.registerCommand('markdownReviewComments.navigateToComment', (id: string) =>
      navigationService.navigateToComment(id)
    ),
    vscode.commands.registerCommand('markdownReviewComments.exportReviewContext', () =>
      commentService.exportReviewContext()
    ),

    vscode.languages.registerCodeActionsProvider(MARKDOWN, new ReviewCodeActionProvider(), {
      providedCodeActionKinds: ReviewCodeActionProvider.providedCodeActionKinds,
    }),
    vscode.languages.registerCodeLensProvider(MARKDOWN, navigationService),

    navigationService,
    reviewComments,

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'markdown') {
        navigationService.refresh();
        reviewComments.scheduleRefresh(event.document);
      }
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'markdown') {
        reviewComments.scheduleRefresh(document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === 'markdown') {
        reviewComments.disposeForUri(document.uri);
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => reviewComments.scheduleRefresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('markdownReviewComments')) {
        reviewComments.scheduleRefresh();
      }
    })
  );
}

export function deactivate(): void {
  // All disposables are registered on the extension context.
}
