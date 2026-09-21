"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";

const posts = [
  {
    titleKey: "post1Title",
    descKey: "post1Desc",
    date: "2024-01-15",
    author: "RCPS Team",
  },
  {
    titleKey: "post2Title",
    descKey: "post2Desc",
    date: "2024-01-10",
    author: "RCPS Team",
  },
  {
    titleKey: "post3Title",
    descKey: "post3Desc",
    date: "2024-01-05",
    author: "RCPS Team",
  },
];

export default function BlogPage() {
  const t = useTranslations("blog");

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold">{t(post.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(post.descKey)}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
