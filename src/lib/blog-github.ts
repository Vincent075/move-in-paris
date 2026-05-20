/**
 * Shared GitHub REST helpers for the blog feature.
 *
 * The blog system reuses the same backing pattern as the apartments admin :
 * `src/data/articles.json` and `src/data/blog-ideas.json` live in the git repo,
 * are read at build time as JSON modules, and are mutated by the admin via the
 * GitHub Contents API. Every mutation triggers a Vercel redeploy.
 */

const REPO_OWNER = "Vincent075";
const REPO_NAME = "move-in-paris";

const ARTICLES_PATH = "src/data/articles.json";
const IDEAS_PATH = "src/data/blog-ideas.json";

type GitHubFile<T> = {
  sha: string;
  content: T;
};

async function githubAPI<T = unknown>(
  path: string,
  method: "GET" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN manquant");

  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API ${res.status}: ${errText}`);
  }

  return res.json() as Promise<T>;
}

async function readJsonFile<T>(repoPath: string): Promise<GitHubFile<T>> {
  const file = await githubAPI<{ sha: string; content: string }>(
    `contents/${repoPath}`,
  );
  const decoded = Buffer.from(file.content, "base64").toString("utf-8");
  return { sha: file.sha, content: JSON.parse(decoded) as T };
}

async function writeJsonFile(
  repoPath: string,
  sha: string,
  content: unknown,
  message: string,
): Promise<void> {
  await githubAPI(`contents/${repoPath}`, "PUT", {
    message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    sha,
  });
}

export type Apartment = {
  slug: string;
  title: string;
  address: string;
  district: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  images: string[];
  status?: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  date: string;
  author: string;
  image: string;
  tags: string[];
  metaDescription: string;
  content: Array<{ type: string; text: string; level?: number }>;
  status?: "draft" | "published";
  apartment_slug?: string;
  apartment_cover?: string;
  idea_id?: string;
  created_at?: string;
  published_at?: string | null;
};

export type Idea = {
  id: string;
  topic: string;
  angle: string;
  target_keywords: string[];
  priority_score: number;
  used: boolean;
  created_at: string;
  used_at: string | null;
  generated_article_slug: string | null;
  trend_source?: string;
};

export async function loadArticles(): Promise<GitHubFile<Article[]>> {
  return readJsonFile<Article[]>(ARTICLES_PATH);
}

export async function loadIdeas(): Promise<GitHubFile<Idea[]>> {
  return readJsonFile<Idea[]>(IDEAS_PATH);
}

export async function loadApartments(): Promise<GitHubFile<Apartment[]>> {
  return readJsonFile<Apartment[]>("src/data/apartments.json");
}

export async function saveArticles(
  sha: string,
  articles: Article[],
  message: string,
): Promise<void> {
  await writeJsonFile(ARTICLES_PATH, sha, articles, message);
}

export async function saveIdeas(
  sha: string,
  ideas: Idea[],
  message: string,
): Promise<void> {
  await writeJsonFile(IDEAS_PATH, sha, ideas, message);
}
