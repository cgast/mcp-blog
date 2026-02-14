export interface PostFrontmatter {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  author?: string;
  tags?: string[];
  status: "draft" | "published";
  excerpt?: string;
  // Future extension points:
  // language?: string;
  // translations?: Record<string, string>;
  // syndication?: Record<string, string>;
}

export interface Post {
  frontmatter: PostFrontmatter;
  content: string;
  /** The raw markdown file including frontmatter */
  raw: string;
}

export interface PostSummary {
  slug: string;
  title: string;
  date: string;
  author?: string;
  tags?: string[];
  status: "draft" | "published";
  excerpt?: string;
}
