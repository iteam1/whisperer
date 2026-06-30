import * as http from "node:http";
import * as vscode from "vscode";

const BROKER = "http://127.0.0.1:2323";
const out = vscode.window.createOutputChannel("Whisperer");

// Workspace path — routing key for the broker
const workspace_path = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

// Inline ghost-text mailbox
let pending: string | null = null;

// Diff view state
let pendingDiff: string | null = null;
let pendingDiffTarget: vscode.Uri | null = null;
let diffCounter = 0;

// Virtual document content provider for high-effort diff
const diffProvider = new (class implements vscode.TextDocumentContentProvider {
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;
    provideTextDocumentContent(_uri: vscode.Uri): string {
        return pendingDiff ?? "";
    }
})();

function postBroker(path: string, body: object): void {
    const data = JSON.stringify(body);
    const req = http.request(`${BROKER}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    });
    req.on("error", () => {});
    req.write(data);
    req.end();
}

export function activate(context: vscode.ExtensionContext): void {
    if (!workspace_path) {
        out.appendLine("whisperer: no workspace folder open — skipping activation");
        return;
    }

    out.appendLine("whisperer activated");

    // Virtual doc provider for diff view
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("whisperer", diffProvider),
    );

    // Inline completion provider
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: "**" },
            {
                provideInlineCompletionItems(document, position) {
                    if (!pending) return [];
                    const item = new vscode.InlineCompletionItem(
                        pending,
                        new vscode.Range(position, position),
                    );
                    pending = null;
                    return [item];
                },
            },
        ),
    );

    // Accept diff command
    context.subscriptions.push(
        vscode.commands.registerCommand("whisperer.acceptDiff", async () => {
            if (!pendingDiffTarget || !pendingDiff) return;
            const doc = await vscode.workspace.openTextDocument(pendingDiffTarget);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length),
            );
            edit.replace(pendingDiffTarget, fullRange, pendingDiff);
            await vscode.workspace.applyEdit(edit);
            await doc.save();
            await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            pendingDiff = null;
            pendingDiffTarget = null;
            vscode.commands.executeCommand("setContext", "whisperer.diffOpen", false);
        }),
    );

    // Reset diffOpen context when the whisperer diff tab is closed
    context.subscriptions.push(
        vscode.window.tabGroups.onDidChangeTabs((e) => {
            for (const tab of e.closed) {
                if (
                    tab.input instanceof vscode.TabInputTextDiff &&
                    tab.input.modified.scheme === "whisperer"
                ) {
                    pendingDiff = null;
                    pendingDiffTarget = null;
                    vscode.commands.executeCommand("setContext", "whisperer.diffOpen", false);
                }
            }
        }),
    );

    // Stream cursor context to broker
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection((e) => {
            const doc = e.textEditor.document;
            const pos = e.textEditor.selection.active;
            postBroker("/context", {
                workspace_path,
                document_uri: doc.uri.toString(),
                cursor: { line: pos.line, col: pos.character },
            });
        }),
    );

    // Extension's own HTTP server to receive completions from broker
    const server = http.createServer((req, res) => {
        if (req.method !== "POST" || req.url !== "/completion") {
            res.writeHead(404).end();
            return;
        }
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try {
                const { effort, text } = JSON.parse(body) as { effort: string; text: string };
                handleCompletion(effort, text);
                res.writeHead(200).end("ok");
            } catch {
                res.writeHead(400).end("bad request");
            }
        });
    });

    server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        out.appendLine(`whisperer HTTP server on :${addr.port}`);
        postBroker("/register", { workspace_path, port: addr.port });
    });

    context.subscriptions.push({ dispose: () => {
        postBroker("/unregister", { workspace_path });
        server.close();
    }});
}

function handleCompletion(effort: string, text: string): void {
    if (effort === "high") {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        pendingDiffTarget = editor.document.uri;
        pendingDiff = text;
        const n = diffCounter++;
        const completed = vscode.Uri.parse(`whisperer://diff/completed-${n}`);
        diffProvider.onDidChangeEmitter.fire(completed);
        vscode.commands.executeCommand(
            "vscode.diff",
            editor.document.uri,
            completed,
            "Whisperer suggestion",
        );
        vscode.commands.executeCommand("setContext", "whisperer.diffOpen", true);
    } else {
        // low / medium — ghost text
        pending = text;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            vscode.window.showTextDocument(editor.document, editor.viewColumn).then(() =>
                vscode.commands.executeCommand("editor.action.inlineSuggest.trigger"),
            );
        }
    }
}

export function deactivate(): void {
    postBroker("/unregister", { workspace_path: workspace_path ?? "" });
}
