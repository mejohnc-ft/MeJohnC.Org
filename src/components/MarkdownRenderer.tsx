import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  return (
    <article
      className={`prose prose-invert prose-primary max-w-none
        prose-headings:font-bold prose-headings:text-foreground
        prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:overflow-x-auto
        prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r
        prose-ul:text-muted-foreground prose-ol:text-muted-foreground
        prose-li:marker:text-primary
        prose-img:rounded-lg prose-img:shadow-lg
        prose-hr:border-border
        prose-table:border-collapse
        prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-border
        prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-border
        ${className}
      `}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom heading with anchor links
          h1: ({ children, ...props }) => (
            <h1 {...props} className="scroll-mt-20 group">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => {
            const id = children?.toString().toLowerCase().replace(/\s+/g, '-');
            return (
              <h2 {...props} id={id} className="scroll-mt-20 group">
                <a href={`#${id}`} className="no-underline">
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = children?.toString().toLowerCase().replace(/\s+/g, '-');
            return (
              <h3 {...props} id={id} className="scroll-mt-20 group">
                <a href={`#${id}`} className="no-underline">
                  {children}
                </a>
              </h3>
            );
          },
          // External links open in new tab
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                {...props}
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
          // Responsive images
          img: ({ src, alt, ...props }) => (
            <img
              {...props}
              src={src}
              alt={alt || ''}
              loading="lazy"
              className="rounded-lg shadow-lg max-w-full h-auto"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
};

export default MarkdownRenderer;
