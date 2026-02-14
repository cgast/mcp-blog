import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpBlogServer } from "./mcp/server.js";
import { createWebApp } from "./web/server.js";
import { requireAuth } from "./auth.js";

const WEB_PORT = parseInt(process.env.WEB_PORT || "3000", 10);
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);

// ── Web server (public blog) ─────────────────────────────────────────────
const webApp = createWebApp();
webApp.listen(WEB_PORT, "0.0.0.0", () => {
  console.log(`Blog web server listening on http://0.0.0.0:${WEB_PORT}`);
});

// ── MCP server (LLM management interface) ────────────────────────────────
const mcpApp = express();
mcpApp.use(express.json());

// Map of active sessions
const transports = new Map<string, StreamableHTTPServerTransport>();

// Health check
mcpApp.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "mcp-blog" });
});

// Handle MCP POST requests (initialize + tool calls)
mcpApp.post("/mcp", async (req, res) => {
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
mcpApp.get("/mcp", async (req, res) => {
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
mcpApp.delete("/mcp", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

mcpApp.listen(MCP_PORT, "0.0.0.0", () => {
  console.log(`MCP server listening on http://0.0.0.0:${MCP_PORT}/mcp`);
});
