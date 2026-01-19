import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, Eye } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getEmailTemplates } from '@/lib/marketing-queries';
import type { EmailTemplate } from '@/lib/schemas';

const MarketingTemplates = () => {
  useSEO({ title: 'Email Templates', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getEmailTemplates(undefined, supabase);
        setTemplates(data);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'MarketingTemplates.fetchTemplates',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplates();
  }, [supabase]);

  const getTypeBadge = (type: EmailTemplate['template_type']) => {
    const styles = {
      newsletter: 'bg-blue-500/10 text-blue-500',
      transactional: 'bg-green-500/10 text-green-500',
      promotional: 'bg-purple-500/10 text-purple-500',
      custom: 'bg-gray-500/10 text-gray-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage reusable email templates for campaigns.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/marketing/templates/new">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email template.
              </p>
              <Button asChild>
                <Link to="/admin/marketing/templates/new">Create Template</Link>
              </Button>
            </div>
          ) : (
            templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-40 object-cover bg-muted"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    {getTypeBadge(template.template_type)}
                  </div>

                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>Used {template.usage_count} times</span>
                    {template.last_used_at && (
                      <span>Last: {new Date(template.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={`/admin/marketing/templates/${template.id}/preview`}>
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link to={`/admin/marketing/templates/${template.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketingTemplates;
