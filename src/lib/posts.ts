import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { site } from "../site.config";

export type Post = CollectionEntry<"posts">;

export async function getPosts() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function getPostSlug(post: Post) {
  return post.id.replace(/\.md$/, "");
}

export function getPostUrl(post: Post) {
  return `/posts/${getPostSlug(post)}/`;
}

export function getSourceUrl(post: Post) {
  const filename = post.id.endsWith(".md") ? post.id : `${post.id}.md`;
  return `https://github.com/L1rics06/L1rics06.github.io/blob/main/src/content/posts/${filename}`;
}

export function getPostCover(post: Post) {
  return post.data.cover ?? getFirstPostImage(post.body ?? "") ?? site.avatarUrl;
}

function getFirstPostImage(body: string) {
  const content = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
  const candidates: Array<{ index: number; src: string }> = [];

  const markdownImagePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+["'][^"']*["'])?\s*\)/g;
  for (const match of content.matchAll(markdownImagePattern)) {
    const src = match[1] ?? match[2];
    if (src) candidates.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, src });
  }

  const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const match of content.matchAll(htmlImagePattern)) {
    const src = match[1];
    if (src) candidates.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, src });
  }

  return candidates.sort((a, b) => a.index - b.index)[0]?.src;
}

export function getReadingStats(body: string) {
  const text = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fa5]+/gu, "");
  const count = text.length;
  return {
    words: count,
    minutes: Math.max(1, Math.ceil(count / 500)),
  };
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getAllTags(posts: Post[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
