import type { IncomingMessage, ServerResponse } from "node:http";

const API_TOKEN = process.env.MCP_API_TOKEN || "";

export function validateToken(req: IncomingMessage): boolean {
  if (!API_TOKEN) {
    // No token configured — allow all (dev mode)
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer") return false;

  return token === API_TOKEN;
}

export function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (validateToken(req)) return true;

  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return false;
}
