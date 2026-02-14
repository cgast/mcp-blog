import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { listPosts, getPost } from "../blog/service.js";
import { layout, indexPage, postPage, notFoundPage } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createWebApp(): express.Express {
  const app = express();

  const blogTitle = process.env.BLOG_TITLE || "MCP Blog";
  const blogDescription =
    process.env.BLOG_DESCRIPTION || "A blog managed by AI via MCP";

  // Static files
  app.use(
    "/static",
    express.static(path.join(__dirname, "..", "..", "public")),
  );

  // Home — list published posts
  app.get("/", async (_req, res) => {
    try {
      const posts = await listPosts(false);
      const html = layout(
        blogTitle,
        indexPage(posts, blogTitle, blogDescription),
      );
      res.type("html").send(html);
    } catch (e) {
      console.error("Error listing posts:", e);
      res.status(500).send("Internal server error");
    }
  });

  // Single post
  app.get("/post/:slug", async (req, res) => {
    try {
      const post = await getPost(req.params.slug);
      if (!post || post.frontmatter.status !== "published") {
        res.status(404).type("html").send(layout(blogTitle, notFoundPage()));
        return;
      }

      const htmlContent = await marked(post.content);
      const html = layout(
        `${post.frontmatter.title} — ${blogTitle}`,
        postPage(post.frontmatter, htmlContent, blogTitle),
      );
      res.type("html").send(html);
    } catch (e) {
      console.error("Error getting post:", e);
      res.status(500).send("Internal server error");
    }
  });

  // RSS feed (basic, extensible later)
  app.get("/feed.xml", async (_req, res) => {
    try {
      const posts = await listPosts(false);
      const baseUrl = process.env.BLOG_BASE_URL || "http://localhost:3000";

      const items = posts
        .slice(0, 20)
        .map(
          (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${baseUrl}/post/${p.slug}</link>
      <guid>${baseUrl}/post/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt || "")}</description>
    </item>`,
        )
        .join("\n");

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(blogTitle)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(blogDescription)}</description>
${items}
  </channel>
</rss>`;

      res.type("application/rss+xml").send(rss);
    } catch (e) {
      console.error("Error generating RSS:", e);
      res.status(500).send("Internal server error");
    }
  });

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).type("html").send(layout(blogTitle, notFoundPage()));
  });

  return app;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
