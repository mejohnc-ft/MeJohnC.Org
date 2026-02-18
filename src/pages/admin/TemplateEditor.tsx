import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/lib/marketing-queries";
import type { EmailTemplate } from "@/lib/schemas";

const TemplateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  useSEO({ title: isNew ? "New Template" : "Edit Template", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    template_type: "newsletter" as EmailTemplate["template_type"],
    subject_template: "",
    preview_text_template: "",
    html_content: "",
    text_content: "",
    thumbnail_url: "",
    is_active: true,
  });

  useEffect(() => {
    async function fetchTemplate() {
      if (!supabase || isNew) {
        setIsLoading(false);
        return;
      }

      try {
        if (id) {
          const data = await getEmailTemplateById(id, supabase);
          setTemplate(data);
          setFormData({
            name: data.name,
            slug: data.slug,
            description: data.description || "",
            template_type: data.template_type,
            subject_template: data.subject_template || "",
            preview_text_template: data.preview_text_template || "",
            html_content: data.html_content,
            text_content: data.text_content || "",
            thumbnail_url: data.thumbnail_url || "",
            is_active: data.is_active,
          });
        }
      } catch (error) {
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            context: "TemplateEditor.fetchTemplate",
          },
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplate();
  }, [supabase, id, isNew]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: isNew ? generateSlug(name) : formData.slug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsSaving(true);
    try {
      const templateData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        template_type: formData.template_type,
        subject_template: formData.subject_template || null,
        preview_text_template: formData.preview_text_template || null,
        html_content: formData.html_content,
        text_content: formData.text_content || null,
        variables: null,
        thumbnail_url: formData.thumbnail_url || null,
        is_active: formData.is_active,
        created_by: null,
      };

      if (isNew) {
        await createEmailTemplate(templateData, supabase);
      } else if (id) {
        await updateEmailTemplate(id, templateData, supabase);
      }
      navigate("/admin/marketing/templates");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "TemplateEditor.handleSubmit",
        },
      );
      toast.error("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !id || isNew) return;
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteEmailTemplate(id, supabase);
      navigate("/admin/marketing/templates");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "TemplateEditor.handleDelete",
        },
      );
      toast.error("Failed to delete template.");
    }
  };

  const getTypeBadge = (type: EmailTemplate["template_type"]) => {
    const styles = {
      newsletter: "bg-blue-500/10 text-blue-500",
      transactional: "bg-green-500/10 text-green-500",
      promotional: "bg-purple-500/10 text-purple-500",
      custom: "bg-gray-500/10 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/marketing/templates">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? "New Template" : "Edit Template"}
              </h1>
              {!isNew && template && (
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(template.template_type)}
                  <span className="text-sm text-muted-foreground">
                    Used {template.usage_count} times
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <Code className="w-4 h-4 mr-2" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Details */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Template Details</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="Monthly Newsletter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Slug *
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                    placeholder="monthly-newsletter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="A brief description of this template..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={formData.template_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        template_type: e.target
                          .value as EmailTemplate["template_type"],
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  >
                    <option value="newsletter">Newsletter</option>
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Thumbnail URL
                  </label>
                  <Input
                    value={formData.thumbnail_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thumbnail_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <label htmlFor="is_active" className="text-sm">
                    Active
                  </label>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Default Values</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject Template
                  </label>
                  <Input
                    value={formData.subject_template}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subject_template: e.target.value,
                      })
                    }
                    placeholder="{{subject}}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {"{{variable}}"} for dynamic content
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preview Text
                  </label>
                  <Input
                    value={formData.preview_text_template}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preview_text_template: e.target.value,
                      })
                    }
                    placeholder="Preview text shown in email clients..."
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                  {showPreview ? "Preview" : "HTML Content"}
                </h2>

                {showPreview ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-2 text-xs text-gray-600 border-b">
                      Preview Mode
                    </div>
                    <div className="p-4 bg-white min-h-[400px]">
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            formData.html_content ||
                            '<p style="color: #999;">No HTML content yet</p>',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={formData.html_content}
                    onChange={(e) =>
                      setFormData({ ...formData, html_content: e.target.value })
                    }
                    rows={20}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-sm"
                    placeholder="<!DOCTYPE html>
<html>
<head>...</head>
<body>...</body>
</html>"
                    required
                  />
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Plain Text Content</h2>
                <textarea
                  value={formData.text_content}
                  onChange={(e) =>
                    setFormData({ ...formData, text_content: e.target.value })
                  }
                  rows={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  placeholder="Plain text version for email clients that don't support HTML..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/marketing/templates">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default TemplateEditor;
