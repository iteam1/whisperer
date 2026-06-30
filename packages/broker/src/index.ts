type WindowEntry = {
    port: number;
    context: { document_uri: string; cursor: { line: number; col: number } } | null;
};

const registry = new Map<string, WindowEntry>();

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function text(body: string, status = 200): Response {
    return new Response(body, { status });
}

const server = Bun.serve({
    port: 2323,
    hostname: "127.0.0.1",
    fetch: async (req) => {
        const url = new URL(req.url);

        // POST /register
        if (req.method === "POST" && url.pathname === "/register") {
            const { workspace_path, port } = await req.json();
            registry.set(workspace_path, { port, context: null });
            const count = registry.size;
            console.log(`+ register   ${workspace_path} -> :${port}  (${count} active)`);
            return text("ok");
        }

        // POST /unregister
        if (req.method === "POST" && url.pathname === "/unregister") {
            const { workspace_path } = await req.json();
            registry.delete(workspace_path);
            const count = registry.size;
            console.log(`- unregister ${workspace_path}  (${count} active)`);
            return text("ok");
        }

        // POST /context
        if (req.method === "POST" && url.pathname === "/context") {
            const { workspace_path, document_uri, cursor } = await req.json();
            const entry = registry.get(workspace_path);
            if (!entry) return text("not found", 404);
            entry.context = { document_uri, cursor };
            return text("ok");
        }

        // GET /context?workspace=<path>
        if (req.method === "GET" && url.pathname === "/context") {
            const workspace = url.searchParams.get("workspace");
            if (!workspace) return text("missing workspace", 400);
            const entry = registry.get(workspace);
            if (!entry) return text("not found", 404);
            return json(entry.context);
        }

        // POST /completion
        if (req.method === "POST" && url.pathname === "/completion") {
            const { workspace_path, effort, text: completion } = await req.json();
            const entry = registry.get(workspace_path);
            if (!entry) return text("not found", 404);
            try {
                const res = await fetch(`http://127.0.0.1:${entry.port}/completion`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ effort, text: completion }),
                });
                if (!res.ok) return text("bad gateway", 502);
                return text("ok");
            } catch {
                return text("bad gateway", 502);
            }
        }

        return text("not found", 404);
    },
});

console.log(`whisperer broker listening on http://127.0.0.1:${server.port}`);
