import rss from "@astrojs/rss";
import { getPosts, getPostUrl } from "../lib/posts";
import { site } from "../site.config";

export async function GET() {
  const posts = await getPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: getPostUrl(post),
    })),
  });
}
