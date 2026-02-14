import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  setPostStatus,
} from "../blog/service.js";

export function createMcpBlogServer(): McpServer {
  const server = new McpServer({
    name: "mcp-blog",
    version: "1.0.0",
  });

  // --- list_posts ---
  server.tool(
    "list_posts",
    "List all blog posts. Returns slug, title, date, status, tags, and excerpt for each post.",
    {
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include draft posts in the listing"),
    },
    async ({ include_drafts }) => {
      const posts = await listPosts(include_drafts);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    },
  );

  // --- get_post ---
  server.tool(
    "get_post",
    "Get a single blog post by slug. Returns the full markdown content including YAML frontmatter.",
    {
      slug: z.string().describe("The slug of the post to retrieve"),
    },
    async ({ slug }) => {
      const post = await getPost(slug);
      if (!post) {
        return {
          content: [{ type: "text", text: `Post not found: ${slug}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: post.raw }],
      };
    },
  );

  // --- create_post ---
  server.tool(
    "create_post",
    `Create a new blog post. Supply full markdown with YAML frontmatter.
Required frontmatter fields: title
Optional frontmatter fields: slug, date, author, tags, status (draft|published), excerpt
If slug is omitted it is derived from the title. If date is omitted today's date is used.
The post is created as a draft unless status is set to "published".`,
    {
      markdown: z
        .string()
        .describe(
          "Full markdown content including YAML frontmatter (---\\ntitle: ...\\n---\\n\\nBody here)",
        ),
    },
    async ({ markdown }) => {
      try {
        const post = await createPost(markdown);
        return {
          content: [
            {
              type: "text",
              text: `Post created: "${post.frontmatter.title}" (slug: ${post.frontmatter.slug}, status: ${post.frontmatter.status})`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating post: ${(e as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --- update_post ---
  server.tool(
    "update_post",
    "Update an existing blog post. Supply the slug and the full new markdown with YAML frontmatter.",
    {
      slug: z.string().describe("The slug of the post to update"),
      markdown: z
        .string()
        .describe("Full replacement markdown content including YAML frontmatter"),
    },
    async ({ slug, markdown }) => {
      try {
        const post = await updatePost(slug, markdown);
        return {
          content: [
            {
              type: "text",
              text: `Post updated: "${post.frontmatter.title}" (slug: ${post.frontmatter.slug})`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating post: ${(e as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --- delete_post ---
  server.tool(
    "delete_post",
    "Delete a blog post by slug.",
    {
      slug: z.string().describe("The slug of the post to delete"),
    },
    async ({ slug }) => {
      const deleted = await deletePost(slug);
      if (!deleted) {
        return {
          content: [{ type: "text", text: `Post not found: ${slug}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `Post deleted: ${slug}` }],
      };
    },
  );

  // --- publish_post ---
  server.tool(
    "publish_post",
    "Set a blog post's status to published.",
    {
      slug: z.string().describe("The slug of the post to publish"),
    },
    async ({ slug }) => {
      try {
        const post = await setPostStatus(slug, "published");
        return {
          content: [
            {
              type: "text",
              text: `Post published: "${post.frontmatter.title}"`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${(e as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --- unpublish_post ---
  server.tool(
    "unpublish_post",
    "Set a blog post's status back to draft.",
    {
      slug: z.string().describe("The slug of the post to unpublish"),
    },
    async ({ slug }) => {
      try {
        const post = await setPostStatus(slug, "draft");
        return {
          content: [
            {
              type: "text",
              text: `Post unpublished (set to draft): "${post.frontmatter.title}"`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${(e as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
