import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

export interface TextBlockProps {
  content?: string;
  alignment?: 'left' | 'center' | 'right';
  maxWidth?: 'full' | 'prose' | 'narrow';
}

export function TextBlock({
  content = '<p>Add your rich text content here. Supports <strong>bold</strong>, <em>italic</em>, and more.</p>',
  alignment = 'left',
  maxWidth = 'prose',
}: TextBlockProps) {
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  const maxWidthClass = {
    full: 'max-w-full',
    prose: 'max-w-prose',
    narrow: 'max-w-2xl',
  }[maxWidth];

  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  });

  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className={cn('mx-auto prose dark:prose-invert', alignmentClass, maxWidthClass)}>
          <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        </div>
      </div>
    </section>
  );
}
