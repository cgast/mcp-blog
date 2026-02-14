import type { PostFrontmatter, PostSummary } from "../types.js";

export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/static/style.css">
  <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml">
</head>
<body>
  ${body}
</body>
</html>`;
}

export function indexPage(
  posts: PostSummary[],
  blogTitle: string,
  blogDescription: string,
): string {
  const postListHtml =
    posts.length === 0
      ? `<p class="empty">No posts yet. Connect an LLM via MCP to start writing!</p>`
      : posts
          .map(
            (p) => `
      <article class="post-card">
        <a href="/post/${esc(p.slug)}">
          <h2>${esc(p.title)}</h2>
        </a>
        <div class="post-meta">
          <time datetime="${esc(p.date)}">${esc(p.date)}</time>
          ${p.author ? `<span class="author">by ${esc(p.author)}</span>` : ""}
        </div>
        ${p.tags && p.tags.length > 0 ? `<div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</div>` : ""}
        ${p.excerpt ? `<p class="excerpt">${esc(p.excerpt)}</p>` : ""}
      </article>`,
          )
          .join("\n");

  return `
  <header>
    <h1><a href="/">${esc(blogTitle)}</a></h1>
    <p class="description">${esc(blogDescription)}</p>
  </header>
  <main>
    ${postListHtml}
  </main>
  <footer>
    <p>Powered by <a href="https://modelcontextprotocol.io">MCP</a> &middot; <a href="/feed.xml">RSS</a></p>
  </footer>`;
}

export function postPage(
  frontmatter: PostFrontmatter,
  htmlContent: string,
  blogTitle: string,
): string {
  return `
  <header>
    <h1><a href="/">${esc(blogTitle)}</a></h1>
  </header>
  <main>
    <article class="post-full">
      <h1 class="post-title">${esc(frontmatter.title)}</h1>
      <div class="post-meta">
        <time datetime="${esc(frontmatter.date)}">${esc(frontmatter.date)}</time>
        ${frontmatter.author ? `<span class="author">by ${esc(frontmatter.author)}</span>` : ""}
        ${frontmatter.updated ? `<span class="updated">(updated ${esc(frontmatter.updated)})</span>` : ""}
      </div>
      ${frontmatter.tags && frontmatter.tags.length > 0 ? `<div class="tags">${frontmatter.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</div>` : ""}
      <div class="post-content">
        ${htmlContent}
      </div>
    </article>
    <nav class="back-link">
      <a href="/">&larr; Back to all posts</a>
    </nav>
  </main>
  <footer>
    <p>Powered by <a href="https://modelcontextprotocol.io">MCP</a> &middot; <a href="/feed.xml">RSS</a></p>
  </footer>`;
}

export function notFoundPage(): string {
  return `
  <main>
    <h1>404 — Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">&larr; Back to home</a>
  </main>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
