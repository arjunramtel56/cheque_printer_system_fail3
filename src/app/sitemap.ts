import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

const baseUrl = siteConfig.url.replace(/\/$/, "");

const paths = [
  "/",
  "/benefits",
  "/how-it-works",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms-of-service",
  "/refund-policy",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    url: `${baseUrl}/en${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
