import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/markdown";

// Unified post type for display
interface UnifiedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  feature_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  tags: string[];
  source: "local";
}

interface BlogCardProps {
  post: UnifiedPost;
  index?: number;
  featured?: boolean;
}

const BlogCard = memo(function BlogCard({
  post,
  index = 0,
  featured = false,
}: BlogCardProps) {
  return (
    <motion.article
      aria-labelledby={`blog-title-${post.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/blog/${post.slug}`}
        className={`group block ${featured ? "md:flex gap-8" : ""}`}
      >
        {/* Cover Image */}
        {post.feature_image && (
          <div
            className={`relative overflow-hidden rounded-lg bg-muted ${
              featured ? "md:w-1/2 aspect-video" : "aspect-video mb-4"
            }`}
          >
            <img
              src={post.feature_image}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Content */}
        <div
          className={
            featured && post.feature_image
              ? "md:w-1/2 flex flex-col justify-center"
              : ""
          }
        >
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h2
            id={`blog-title-${post.id}`}
            className={`font-bold text-foreground group-hover:text-primary transition-colors ${
              featured ? "text-2xl md:text-3xl" : "text-xl"
            }`}
          >
            {post.title}
          </h2>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-muted-foreground mt-2 line-clamp-3">
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at)}</span>
              </div>
            )}
            {post.reading_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{post.reading_time} min read</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
});

export default BlogCard;
