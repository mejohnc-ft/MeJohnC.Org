import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit3 } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
  'aria-label'?: string;
}

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = 'Write your content in markdown...',
  minHeight = '400px',
  id,
  'aria-label': ariaLabel,
}: MarkdownEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-muted/50 border-b border-border px-4 py-2">
        <div className="text-sm text-muted-foreground">
          Markdown supported
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              !showPreview
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              showPreview
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 bg-background overflow-auto"
            style={{ minHeight }}
          >
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-muted-foreground italic">
                Nothing to preview yet...
              </p>
            )}
          </motion.div>
        ) : (
          <motion.textarea
            key="editor"
            id={id}
            aria-label={ariaLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-background text-foreground placeholder:text-muted-foreground p-4 resize-none focus:outline-none font-mono text-sm"
            style={{ minHeight }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarkdownEditor;
