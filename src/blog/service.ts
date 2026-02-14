import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import slugifyModule from "slugify";
const slugify = slugifyModule as unknown as (
  str: string,
  opts?: { lower?: boolean; strict?: boolean },
) => string;
import { v4 as uuidv4 } from "uuid";
import type { Post, PostFrontmatter, PostSummary } from "../types.js";

const POSTS_DIR = process.env.POSTS_DIR || path.join(process.cwd(), "posts");

async function ensurePostsDir(): Promise<void> {
  await fs.mkdir(POSTS_DIR, { recursive: true });
}

function filenameForSlug(slug: string): string {
  return `${slug}.md`;
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

export async function listPosts(
  includedrafts = false,
): Promise<PostSummary[]> {
  await ensurePostsDir();
  const files = await fs.readdir(POSTS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const posts: PostSummary[] = [];

  for (const file of mdFiles) {
    const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    const { data } = matter(raw);
    const fm = data as PostFrontmatter;

    if (!includedrafts && fm.status === "draft") continue;

    posts.push({
      slug: fm.slug || slugFromFilename(file),
      title: fm.title || "Untitled",
      date: fm.date || "",
      author: fm.author,
      tags: fm.tags,
      status: fm.status || "draft",
      excerpt: fm.excerpt,
    });
  }

  posts.sort((a, b) => (b.date > a.date ? 1 : -1));
  return posts;
}

export async function getPost(slug: string): Promise<Post | null> {
  await ensurePostsDir();
  const filepath = path.join(POSTS_DIR, filenameForSlug(slug));

  try {
    const raw = await fs.readFile(filepath, "utf-8");
    const { data, content } = matter(raw);
    return {
      frontmatter: data as PostFrontmatter,
      content,
      raw,
    };
  } catch {
    return null;
  }
}

export async function createPost(markdown: string): Promise<Post> {
  await ensurePostsDir();

  const { data, content } = matter(markdown);
  const fm = data as Partial<PostFrontmatter>;

  if (!fm.title) {
    throw new Error("Post must have a title in frontmatter");
  }

  // Generate slug from title if not provided
  if (!fm.slug) {
    fm.slug = slugify(fm.title, { lower: true, strict: true });
  }

  // Set defaults
  fm.date = fm.date || new Date().toISOString().split("T")[0];
  fm.status = fm.status || "draft";

  // Check for slug collision
  const existing = path.join(POSTS_DIR, filenameForSlug(fm.slug!));
  try {
    await fs.access(existing);
    // File exists — append a short suffix
    fm.slug = `${fm.slug}-${uuidv4().slice(0, 6)}`;
  } catch {
    // No collision
  }

  const finalFrontmatter = fm as PostFrontmatter;
  const raw = matter.stringify(content, finalFrontmatter);
  await fs.writeFile(
    path.join(POSTS_DIR, filenameForSlug(finalFrontmatter.slug)),
    raw,
    "utf-8",
  );

  return { frontmatter: finalFrontmatter, content, raw };
}

export async function updatePost(
  slug: string,
  markdown: string,
): Promise<Post> {
  await ensurePostsDir();

  const filepath = path.join(POSTS_DIR, filenameForSlug(slug));

  try {
    await fs.access(filepath);
  } catch {
    throw new Error(`Post not found: ${slug}`);
  }

  const { data, content } = matter(markdown);
  const fm = data as PostFrontmatter;

  // Preserve the slug from the URL, set updated timestamp
  fm.slug = slug;
  fm.updated = new Date().toISOString().split("T")[0];

  const raw = matter.stringify(content, fm);
  await fs.writeFile(filepath, raw, "utf-8");

  return { frontmatter: fm, content, raw };
}

export async function deletePost(slug: string): Promise<boolean> {
  await ensurePostsDir();
  const filepath = path.join(POSTS_DIR, filenameForSlug(slug));

  try {
    await fs.unlink(filepath);
    return true;
  } catch {
    return false;
  }
}

export async function setPostStatus(
  slug: string,
  status: "draft" | "published",
): Promise<Post> {
  const post = await getPost(slug);
  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }

  post.frontmatter.status = status;
  post.frontmatter.updated = new Date().toISOString().split("T")[0];

  const raw = matter.stringify(post.content, post.frontmatter);
  await fs.writeFile(
    path.join(POSTS_DIR, filenameForSlug(slug)),
    raw,
    "utf-8",
  );

  return { frontmatter: post.frontmatter, content: post.content, raw };
}
