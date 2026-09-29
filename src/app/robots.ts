import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

const baseUrl = siteConfig.url.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
