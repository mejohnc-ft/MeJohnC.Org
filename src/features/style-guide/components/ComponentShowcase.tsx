/**
 * ComponentShowcase Component
 *
 * Displays component guidelines and examples.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { Guideline } from '../schemas';

interface ComponentShowcaseProps {
  guidelines: Guideline[];
}

export function ComponentShowcase({ guidelines }: ComponentShowcaseProps) {
  if (guidelines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No component guidelines defined yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guidelines.map((guideline, index) => (
        <motion.div
          key={guideline.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{guideline.title}</h3>
                <Badge variant="outline" className="mt-2">
                  {guideline.category}
                </Badge>
              </div>
            </div>

            <div className="prose prose-sm max-w-none mb-6">
              <p className="text-muted-foreground">{guideline.content}</p>
            </div>

            {guideline.examples.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Examples</h4>
                <div className="grid grid-cols-2 gap-4">
                  {guideline.examples.map((example, i) => (
                    <img
                      key={i}
                      src={example}
                      alt={`Example ${i + 1}`}
                      className="rounded-lg border border-border"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guideline.do_examples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <h4 className="text-sm font-medium text-foreground">Do</h4>
                  </div>
                  <ul className="space-y-1">
                    {guideline.do_examples.map((example, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-6">
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guideline.dont_examples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    <h4 className="text-sm font-medium text-foreground">Don't</h4>
                  </div>
                  <ul className="space-y-1">
                    {guideline.dont_examples.map((example, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-6">
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
