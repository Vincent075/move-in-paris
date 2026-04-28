import type { MetadataRoute } from "next";
import apartmentsDataRaw from "@/data/apartments.json";
import articlesDataRaw from "@/data/articles.json";
import type { ApartmentRecord } from "@/data/apartment-types";

const SITE_URL = "https://www.move-in-paris.com";
const apartments = apartmentsDataRaw as ApartmentRecord[];
const articles = articlesDataRaw as { slug: string; date: string }[];

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/nos-appartements", priority: 0.95, changeFrequency: "daily" },
  { path: "/gestion-locative-meublee-paris", priority: 0.93, changeFrequency: "monthly" },
  { path: "/location-corporate-paris", priority: 0.92, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise", priority: 0.92, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise-paris-8e", priority: 0.88, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise-paris-16e", priority: 0.88, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise-paris-17e", priority: 0.88, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise-la-defense", priority: 0.88, changeFrequency: "monthly" },
  { path: "/location-meublee-entreprise-neuilly", priority: 0.88, changeFrequency: "monthly" },
  { path: "/location-meublee-expatrie-paris", priority: 0.92, changeFrequency: "monthly" },
  { path: "/bail-mobilite-paris", priority: 0.9, changeFrequency: "monthly" },
  { path: "/code-civil-bail-meuble", priority: 0.88, changeFrequency: "monthly" },
  { path: "/proprietaires", priority: 0.85, changeFrequency: "monthly" },
  { path: "/proposer-mon-appartement", priority: 0.85, changeFrequency: "monthly" },
  { path: "/estimation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/a-propos", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cgu", priority: 0.2, changeFrequency: "yearly" },
  { path: "/politique-de-confidentialite", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const apartmentEntries: MetadataRoute.Sitemap = apartments.map((apt) => ({
    url: `${SITE_URL}/appartement/${apt.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: article.date ? new Date(article.date) : now,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticEntries, ...apartmentEntries, ...articleEntries];
}
