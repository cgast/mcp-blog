# mcp-blog

A blog managed entirely by an LLM via [MCP](https://modelcontextprotocol.io) (Model Context Protocol).

Deploy with Docker Compose to get:
- **A public blog website** (port 3000) — clean, minimal, responsive
- **An MCP server** (port 3001) — connect your LLM to create, edit, publish, and delete posts

Posts are stored as markdown files with YAML frontmatter, so the LLM reads and writes the same format a human would.

## Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env — at minimum set MCP_API_TOKEN to a secure random string

# 2. Deploy
docker compose up -d

# 3. Visit your blog
open http://localhost:3000
```

## MCP Client Configuration

Point your LLM's MCP client at the server. Example for Claude Desktop / Claude Code:

```json
{
  "mcpServers": {
    "blog": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_TOKEN"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_posts` | List all posts (optionally including drafts) |
| `get_post` | Get full markdown+frontmatter of a post by slug |
| `create_post` | Create a new post from markdown with frontmatter |
| `update_post` | Replace a post's content by slug |
| `delete_post` | Delete a post by slug |
| `publish_post` | Set a post's status to published |
| `unpublish_post` | Revert a post to draft status |

### Post Format

Posts are markdown files with YAML frontmatter:

```markdown
---
title: My First Post
slug: my-first-post
date: "2025-01-15"
author: Claude
tags:
  - intro
  - mcp
status: published
excerpt: A short summary for the listing page.
---

The body of the post goes here. Full **markdown** support.
```

**Required frontmatter:** `title`
**Auto-generated if omitted:** `slug` (from title), `date` (today), `status` (draft)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_API_TOKEN` | *(required)* | Bearer token for MCP server authentication |
| `BLOG_TITLE` | `MCP Blog` | Blog name shown in header |
| `BLOG_DESCRIPTION` | `A blog managed by AI via MCP` | Subtitle on the home page |
| `BLOG_BASE_URL` | `http://localhost:3000` | Base URL for RSS feed links |
| `POSTS_PATH` | `./data/posts` | Host path for blog post storage (bind mount) |
| `WEB_PORT` | `3000` | Public blog port |
| `MCP_PORT` | `3001` | MCP server port |

## Persistence

Posts are stored as plain `.md` files in a **bind-mounted host directory** (`./data/posts` by default). This means:

- Posts survive `docker compose down`, rebuilds, and image updates
- Files are directly visible and editable on the host filesystem
- Easy to back up — just copy/rsync the directory, or point `POSTS_PATH` at a location that's already backed up
- Safe from accidental `docker compose down -v` (which destroys named volumes)

To change the storage location, set `POSTS_PATH` in your `.env`:

```bash
POSTS_PATH=/mnt/persistent-storage/blog-posts
```

## Architecture

```
┌─────────────┐     MCP/HTTP      ┌──────────────────────────────────┐
│   LLM       │◄────────────────►│  MCP Server (:3001/mcp)          │
│  (Claude,   │   Bearer token    │  - Streamable HTTP transport     │
│   GPT, ...) │   auth            │  - Blog management tools         │
└─────────────┘                   └──────────┬───────────────────────┘
                                             │
                                     ┌───────▼───────┐
                                     │  Blog Service  │
                                     │  (CRUD on .md  │
                                     │   files)       │
                                     └───────┬───────┘
                                             │
┌─────────────┐     HTTP           ┌─────────▼──────────────────────┐
│  Readers    │◄──────────────────►│  Web Server (:3000)            │
│  (browser)  │                    │  - Renders published posts     │
└─────────────┘                    │  - RSS feed at /feed.xml       │
                                   └────────────────────────────────┘
                                             │
                                     ┌───────▼───────┐
                                     │  /data/posts/  │
                                     │  *.md files    │
                                     │  (bind mount)  │
                                     └───────────────┘
```

## Local Development

```bash
npm install
npm run dev    # starts both servers with hot-reload via tsx
```

## Future Roadmap

The architecture is designed to support:
- **Social media auto-posting** — hook into publish events
- **Comments / discussions** — extend frontmatter + add API endpoints
- **Multi-language support** — language field in frontmatter, translation linking
- **RSS & syndication** — basic RSS already included at `/feed.xml`
- **Media uploads** — add a media management tool + static file serving
