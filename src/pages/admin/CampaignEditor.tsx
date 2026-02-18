import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Send, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getEmailCampaignById,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  scheduleCampaign,
  getEmailTemplates,
  getEmailLists,
  sendCampaign,
} from "@/lib/marketing-queries";
import type { EmailCampaign, EmailTemplate, EmailList } from "@/lib/schemas";

const CampaignEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  useSEO({ title: isNew ? "New Campaign" : "Edit Campaign", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    preview_text: "",
    template_id: "",
    html_content: "",
    text_content: "",
    list_ids: [] as string[],
    status: "draft" as EmailCampaign["status"],
    scheduled_for: "",
  });

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;

      try {
        // Fetch templates and lists
        const [templatesData, listsData] = await Promise.all([
          getEmailTemplates(undefined, supabase),
          getEmailLists(supabase),
        ]);
        setTemplates(templatesData);
        setLists(listsData);

        // Fetch campaign if editing
        if (!isNew && id) {
          const data = await getEmailCampaignById(id, supabase);
          setCampaign(data);
          setFormData({
            name: data.name,
            subject: data.subject,
            preview_text: data.preview_text || "",
            template_id: data.template_id || "",
            html_content: data.html_content || "",
            text_content: data.text_content || "",
            list_ids: data.list_ids || [],
            status: data.status,
            scheduled_for: data.scheduled_for || "",
          });
        }
      } catch (error) {
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            context: "CampaignEditor.fetchData",
          },
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase, id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsSaving(true);
    try {
      const campaignData = {
        name: formData.name,
        subject: formData.subject,
        preview_text: formData.preview_text || null,
        template_id: formData.template_id || null,
        html_content: formData.html_content || null,
        text_content: formData.text_content || null,
        list_ids: formData.list_ids.length > 0 ? formData.list_ids : null,
        segment_rules: null,
        exclude_tags: null,
        status: formData.status,
        scheduled_for: formData.scheduled_for || null,
        is_ab_test: false,
        ab_test_config: null,
        created_by: null,
        metadata: null,
      };

      if (isNew) {
        await createEmailCampaign(campaignData, supabase);
      } else if (id) {
        await updateEmailCampaign(id, campaignData, supabase);
      }
      navigate("/admin/marketing/campaigns");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignEditor.handleSubmit",
        },
      );
      toast.error("Failed to save campaign. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !id || isNew) return;
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      await deleteEmailCampaign(id, supabase);
      navigate("/admin/marketing/campaigns");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignEditor.handleDelete",
        },
      );
      toast.error("Failed to delete campaign.");
    }
  };

  const handleSchedule = async () => {
    if (!supabase || !id || !formData.scheduled_for) return;

    try {
      await scheduleCampaign(id, formData.scheduled_for, supabase);
      navigate("/admin/marketing/campaigns");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignEditor.handleSchedule",
        },
      );
      toast.error("Failed to schedule campaign.");
    }
  };

  const handleSendNow = async () => {
    if (!supabase || !id) return;

    if (
      !confirm(
        "Are you sure you want to send this campaign now? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsSending(true);
    try {
      const result = await sendCampaign(id, supabase);

      if (result.success) {
        toast.success(
          `Campaign sent successfully! Sent: ${result.sent_count}, Failed: ${result.failed_count}`,
        );
        navigate("/admin/marketing/campaigns");
      } else {
        toast.error(
          `Campaign sending had issues. Sent: ${result.sent_count}, Failed: ${result.failed_count}`,
        );
      }
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignEditor.handleSendNow",
        },
      );
      toast.error(
        "Failed to send campaign. Check your email provider configuration.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const toggleList = (listId: string) => {
    if (formData.list_ids.includes(listId)) {
      setFormData({
        ...formData,
        list_ids: formData.list_ids.filter((l) => l !== listId),
      });
    } else {
      setFormData({ ...formData, list_ids: [...formData.list_ids, listId] });
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject_template || formData.subject,
        preview_text: template.preview_text_template || formData.preview_text,
        html_content: template.html_content,
        text_content: template.text_content || "",
      });
    }
  };

  const getStatusBadge = (status: EmailCampaign["status"]) => {
    const styles = {
      draft: "bg-gray-500/10 text-gray-500",
      scheduled: "bg-blue-500/10 text-blue-500",
      sending: "bg-yellow-500/10 text-yellow-500",
      sent: "bg-green-500/10 text-green-500",
      paused: "bg-orange-500/10 text-orange-500",
      cancelled: "bg-red-500/10 text-red-500",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}
      >
        {status}
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/marketing/campaigns">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? "New Campaign" : "Edit Campaign"}
              </h1>
              {!isNew && campaign && (
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(campaign.status)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stats (for sent campaigns) */}
        {!isNew && campaign && campaign.status === "sent" && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold">{campaign.sent_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold">{campaign.delivered_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Open Rate</p>
              <p className="text-2xl font-bold">
                {campaign.sent_count > 0
                  ? (
                      (campaign.opened_count / campaign.sent_count) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Click Rate</p>
              <p className="text-2xl font-bold">
                {campaign.sent_count > 0
                  ? (
                      (campaign.clicked_count / campaign.sent_count) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Bounced</p>
              <p className="text-2xl font-bold text-red-500">
                {campaign.bounced_count}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Details */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Campaign Details</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Campaign Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Monthly Newsletter - January"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subject Line *
              </label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
                placeholder="Your January Updates are here!"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Preview Text
              </label>
              <Input
                value={formData.preview_text}
                onChange={(e) =>
                  setFormData({ ...formData, preview_text: e.target.value })
                }
                placeholder="A short preview shown in email clients..."
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Template</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Use Template
              </label>
              <select
                value={formData.template_id}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md"
              >
                <option value="">-- No template (custom) --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.template_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Content</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>

            {showPreview ? (
              <div className="border border-border rounded-lg p-4 bg-white">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formData.html_content || "<p>No content yet</p>",
                  }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    HTML Content
                  </label>
                  <textarea
                    value={formData.html_content}
                    onChange={(e) =>
                      setFormData({ ...formData, html_content: e.target.value })
                    }
                    rows={12}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-sm"
                    placeholder="<html>...</html>"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Plain Text Version
                  </label>
                  <textarea
                    value={formData.text_content}
                    onChange={(e) =>
                      setFormData({ ...formData, text_content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    placeholder="Plain text fallback..."
                  />
                </div>
              </>
            )}
          </div>

          {/* Recipients */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Recipients</h2>
            <p className="text-sm text-muted-foreground">
              Select the lists to send this campaign to.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {lists.map((list) => (
                <label
                  key={list.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.list_ids.includes(list.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.list_ids.includes(list.id)}
                    onChange={() => toggleList(list.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      formData.list_ids.includes(list.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.list_ids.includes(list.id) && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.subscriber_count} subscribers
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Scheduling</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Schedule For
              </label>
              <Input
                type="datetime-local"
                value={
                  formData.scheduled_for
                    ? formData.scheduled_for.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduled_for: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to send immediately when ready.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/marketing/campaigns">Cancel</Link>
            </Button>
            <div className="flex gap-3">
              {!isNew &&
                campaign?.status === "draft" &&
                formData.scheduled_for && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSchedule}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                )}
              {!isNew && campaign?.status === "draft" && (
                <Button
                  type="button"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSendNow}
                  disabled={isSending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? "Sending..." : "Send Now"}
                </Button>
              )}
              <Button type="submit" disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default CampaignEditor;
