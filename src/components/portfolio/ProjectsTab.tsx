import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CardSkeleton } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignedIn } from "@/lib/auth";
import {
  getProjects,
  getSiteContent,
  type Project,
  type SiteContent,
} from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { toError } from "@/lib/errors";
import { publicBuilds } from "@/data/public-builds";

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsContent, setProjectsContent] = useState<SiteContent | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsData, contentData] = await Promise.all([
          getProjects(),
          getSiteContent("projects"),
        ]);
        setProjects(projectsData);
        setProjectsContent(contentData);
      } catch (err) {
        captureException(toError(err), {
          context: "ProjectsTab.fetchProjects",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <motion.div
      key="projects"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Experiments
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mt-2">
              {projectsContent?.title || "Side Projects"}
            </h1>
          </div>
          <SignedIn>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/settings">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          </SignedIn>
        </div>
        {projectsContent?.content && (
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
            {projectsContent.content}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Territories Project - Static Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Link to="/projects/territories">
              <Card className="overflow-hidden border border-border hover:border-primary transition-all duration-300 bg-card/50 group cursor-pointer">
                <div className="aspect-video overflow-hidden bg-black">
                  <div className="w-full h-full flex items-center justify-center">
                    <span
                      className="font-serif text-6xl font-bold text-white tracking-tight"
                      style={{
                        fontFamily: "'Playfair Display', 'Georgia', serif",
                      }}
                    >
                      T
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    Territories
                  </h3>
                  <p className="text-sm text-primary mb-2">
                    Design System Explorer
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    A comprehensive design reference tool for AI-forward product
                    design. Explore 50+ design territories, compare
                    philosophies, and build custom design recipes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      HTML
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      CSS
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      Design Systems
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Public open-source builds - Static Cards */}
          {publicBuilds.map((build, index) => (
            <motion.div
              key={build.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
            >
              <a
                href={build.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${build.name} on GitHub`}
              >
                <Card className="overflow-hidden border border-border hover:border-primary transition-all duration-300 bg-card/50 group cursor-pointer">
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5">
                    {build.image ? (
                      <img
                        src={build.image}
                        alt={`${build.name} preview`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-mono text-4xl font-bold text-primary tracking-tight">
                          {build.glyph}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                      {build.name}
                    </h3>
                    <p className="text-sm text-primary mb-2">
                      {build.category} · {build.status}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {build.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {build.tech.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </a>
            </motion.div>
          ))}

          {/* Dynamic Projects from Supabase */}
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: (index + publicBuilds.length + 1) * 0.1,
              }}
            >
              <ProjectCardShell url={project.external_url}>
                {project.cover_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={project.cover_image}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    {project.name}
                  </h3>
                  {project.tagline && (
                    <p className="text-sm text-primary mb-2">
                      {project.tagline}
                    </p>
                  )}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}
                  {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tech_stack.slice(0, 3).map((t, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </ProjectCardShell>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Card wrapper that becomes an external link when the project has one. */
function ProjectCardShell({
  url,
  children,
}: {
  url: string | null;
  children: ReactNode;
}) {
  const card = (
    <Card
      className={`overflow-hidden border border-border hover:border-primary transition-all duration-300 bg-card/50 group ${
        url ? "cursor-pointer" : ""
      }`}
    >
      {children}
    </Card>
  );

  if (!url) return card;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {card}
    </a>
  );
}
