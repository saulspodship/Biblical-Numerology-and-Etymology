import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gematria-lab.saulspodship.com";
const topicSlugs = [
  "topic-epstein", "topic-antarctica", "topic-platform-ownership", "topic-families",
  "topic-mystery-traditions", "topic-scriptural-numbers", "topic-propaganda-history",
];
const termSlugs = ["shalom", "ahavah", "emet", "or", "logos", "phos", "peace", "truth", "salam", "pax"];

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = ["", "/privacy", ...topicSlugs.map((slug) => `/topic/${slug}`), ...termSlugs.map((slug) => `/term/${slug}`)];
  return urls.map((pathname) => ({ url: `${siteUrl}${pathname}`, changeFrequency: pathname ? "monthly" : "weekly", priority: pathname ? 0.6 : 1 }));
}
