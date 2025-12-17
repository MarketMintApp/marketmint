// app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  // Keep this tight + intentional. Add more routes as you publish content pages.
  const routes: Array<{ path: string; priority?: number; changeFreq?: MetadataRoute.Sitemap[number]["changeFrequency"] }> =
    [
      { path: "/", priority: 1.0, changeFreq: "weekly" },
      { path: "/value", priority: 0.9, changeFreq: "weekly" },
      { path: "/offers", priority: 0.8, changeFreq: "weekly" },
      { path: "/offers/hub", priority: 0.7, changeFreq: "weekly" },
      { path: "/items", priority: 0.6, changeFreq: "weekly" },
      { path: "/login", priority: 0.3, changeFreq: "yearly" },
    ];

  const now = new Date();

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));
}
