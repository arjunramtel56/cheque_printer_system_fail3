"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Tag } from "lucide-react";

const posts = [
  {
    titleKey: "post1Title",
    descKey: "post1Desc",
    date: "Sep 22, 2026",
    author: "RCPS Team",
    categoryKey: "category1",
    categoryColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    titleKey: "post2Title",
    descKey: "post2Desc",
    date: "Sep 20, 2026",
    author: "RCPS Team",
    categoryKey: "category2",
    categoryColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    titleKey: "post3Title",
    descKey: "post3Desc",
    date: "Sep 15, 2026",
    author: "RCPS Team",
    categoryKey: "category3",
    categoryColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
];

export default function BlogPage() {
  const t = useTranslations("blog");

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="absolute top-0 right-0 -mx-4 -mt-4 h-64 w-64 rounded-full bg-primary/10 blur-2xl" />
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t("description")}</p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardContent className="p-8 md:p-12">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  {t("category1")}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                {t("post1Title")}
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{t("post1Desc")}</p>
              <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Sep 22, 2026
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  RCPS Team
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            All Articles
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Card key={index} className="border-0 shadow-sm dark:bg-slate-800 group">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${post.categoryColor}`}
                    >
                      <Tag className="h-3 w-3" />
                      {t(post.categoryKey)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {t(post.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {t(post.descKey)}
                  </p>
                  <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
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
