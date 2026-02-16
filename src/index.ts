import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpBlogServer } from "./mcp/server.js";
import { createWebApp, createNotFoundHandler } from "./web/server.js";
import { requireAuth } from "./auth.js";

const PORT = parseInt(process.env.PORT || process.env.WEB_PORT || "3000", 10);

// ── Single Express app serving both blog and MCP ──────────────────────────
const app = createWebApp();

// MCP routes need JSON body parsing
app.use("/mcp", express.json());

// Map of active sessions
const transports = new Map<string, StreamableHTTPServerTransport>();

// Handle MCP POST requests (initialize + tool calls)
app.post("/mcp", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session
  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
      console.log(`MCP session initialized: ${id}`);
    },
  });

  transport.onclose = () => {
    const id = transport.sessionId;
    if (id) {
      transports.delete(id);
      console.log(`MCP session closed: ${id}`);
    }
  };

  const server = createMcpBlogServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Handle MCP GET requests (SSE streams)
app.get("/mcp", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// Handle MCP DELETE requests (session termination)
app.delete("/mcp", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// 404 fallback (must be after all routes including MCP)
app.use(createNotFoundHandler());

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Blog + MCP server listening on http://0.0.0.0:${PORT}`);
});
