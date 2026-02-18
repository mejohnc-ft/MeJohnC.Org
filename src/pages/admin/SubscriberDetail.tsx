import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Trash2,
  Mail,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getEmailSubscriberById,
  createEmailSubscriber,
  updateEmailSubscriber,
  deleteEmailSubscriber,
  getEmailLists,
} from "@/lib/marketing-queries";
import type { EmailSubscriber, EmailList } from "@/lib/schemas";

const SubscriberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  useSEO({
    title: isNew ? "Add Subscriber" : "Edit Subscriber",
    noIndex: true,
  });
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    status: "active" as EmailSubscriber["status"],
    lists: [] as string[],
    tags: [] as string[],
    source: "",
  });
  const [subscriber, setSubscriber] = useState<EmailSubscriber | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;

      try {
        // Fetch available lists
        const listsData = await getEmailLists(supabase);
        setLists(listsData);

        // Fetch subscriber if editing
        if (!isNew && id) {
          const data = await getEmailSubscriberById(id, supabase);
          setSubscriber(data);
          setFormData({
            email: data.email,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            status: data.status,
            lists: data.lists,
            tags: data.tags,
            source: data.source || "",
          });
        }
      } catch (error) {
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            context: "SubscriberDetail.fetchData",
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
      if (isNew) {
        await createEmailSubscriber(
          {
            email: formData.email,
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            status: formData.status,
            lists: formData.lists,
            tags: formData.tags,
            source: formData.source || null,
            source_detail: null,
            ip_address: null,
            user_agent: null,
            referrer: null,
            custom_fields: null,
            metadata: null,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            last_email_sent_at: null,
            last_email_opened_at: null,
            last_email_clicked_at: null,
          },
          supabase,
        );
      } else if (id) {
        await updateEmailSubscriber(
          id,
          {
            email: formData.email,
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            status: formData.status,
            lists: formData.lists,
            tags: formData.tags,
            source: formData.source || null,
          },
          supabase,
        );
      }
      navigate("/admin/marketing/subscribers");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "SubscriberDetail.handleSubmit",
        },
      );
      toast.error("Failed to save subscriber. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !id || isNew) return;
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    try {
      await deleteEmailSubscriber(id, supabase);
      navigate("/admin/marketing/subscribers");
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "SubscriberDetail.handleDelete",
        },
      );
      toast.error("Failed to delete subscriber.");
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const toggleList = (listId: string) => {
    if (formData.lists.includes(listId)) {
      setFormData({
        ...formData,
        lists: formData.lists.filter((l) => l !== listId),
      });
    } else {
      setFormData({ ...formData, lists: [...formData.lists, listId] });
    }
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/marketing/subscribers">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? "Add Subscriber" : "Edit Subscriber"}
            </h1>
          </div>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        {/* Engagement Stats (only for existing subscribers) */}
        {!isNew && subscriber && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-2xl font-bold">
                    {subscriber.total_emails_sent}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Eye className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opened</p>
                  <p className="text-2xl font-bold">
                    {subscriber.total_emails_opened}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <MousePointerClick className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clicked</p>
                  <p className="text-2xl font-bold">
                    {subscriber.total_emails_clicked}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-lg p-6 space-y-6"
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="subscriber@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First Name
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Name
                </label>
                <Input
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as EmailSubscriber["status"],
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                  <option value="complained">Complained</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <Input
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="website, import, api..."
                />
              </div>
            </div>
          </div>

          {/* Lists */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Lists</h2>
            <div className="grid grid-cols-2 gap-2">
              {lists.map((list) => (
                <label
                  key={list.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.lists.includes(list.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.lists.includes(list.id)}
                    onChange={() => toggleList(list.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      formData.lists.includes(list.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {formData.lists.includes(list.id) && (
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
                    {list.description && (
                      <p className="text-xs text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {lists.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No lists available. Create lists first.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tags</h2>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Add a tag..."
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/marketing/subscribers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Subscriber"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default SubscriberDetail;
