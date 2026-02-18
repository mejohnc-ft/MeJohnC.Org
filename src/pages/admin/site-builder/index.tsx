import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FileText, Plus, Eye, Edit, Trash2, Globe } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/lib/seo";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getSiteBuilderPages,
  deleteSiteBuilderPage,
  publishSiteBuilderPage,
  unpublishSiteBuilderPage,
} from "@/lib/site-builder-queries";
import type { SiteBuilderPage } from "@/lib/schemas";
import { captureException } from "@/lib/sentry";

export default function SiteBuilderIndex() {
  useSEO({ title: "Site Builder", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [pages, setPages] = useState<SiteBuilderPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadPages() {
    if (!supabase) return;

    try {
      setIsLoading(true);
      const data = await getSiteBuilderPages(true, supabase);
      setPages(data);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "SiteBuilderIndex.loadPages",
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!supabase || !confirm("Are you sure you want to delete this page?"))
      return;

    try {
      await deleteSiteBuilderPage(id, supabase);
      setPages(pages.filter((p) => p.id !== id));
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "SiteBuilderIndex.handleDelete",
        },
      );
      toast.error("Failed to delete page");
    }
  }

  async function handleTogglePublish(page: SiteBuilderPage) {
    if (!supabase) return;

    try {
      if (page.status === "published") {
        await unpublishSiteBuilderPage(page.id, supabase);
      } else {
        await publishSiteBuilderPage(page.id, supabase);
      }
      loadPages();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "SiteBuilderIndex.handleTogglePublish",
        },
      );
      toast.error("Failed to update page status");
    }
  }

  const filteredPages = pages.filter((page) => {
    if (filter === "all") return true;
    return page.status === filter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Site Builder</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage public pages
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/site-builder/new">
              <Plus className="w-4 h-4 mr-2" />
              New Page
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50"
            }`}
          >
            All Pages
          </button>
          <button
            onClick={() => setFilter("published")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "published"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setFilter("draft")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "draft"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50"
            }`}
          >
            Drafts
          </button>
        </div>

        {/* Pages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No pages yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first page to get started
            </p>
            <Button asChild>
              <Link to="/admin/site-builder/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Page
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{page.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          page.status === "published"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {page.status}
                      </span>
                    </div>
                    {page.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {page.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Slug: /{page.slug}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {page.status === "published" && (
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={`/p/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/site-builder/${page.id}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(page)}
                    >
                      <Globe className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(page.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
