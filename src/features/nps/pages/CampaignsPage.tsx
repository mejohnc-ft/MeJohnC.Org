/**
 * NPS Campaigns Page
 *
 * Campaign management for distributing NPS surveys.
 * Supports creating campaigns, selecting contacts, and tracking delivery.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/255
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Send,
  Link as LinkIcon,
  Copy,
  Users,
  BarChart3,
  Mail,
  MessageSquare,
  Globe,
} from "lucide-react";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { captureException } from "@/lib/sentry";
import { useSEO } from "@/lib/seo";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NpsServiceSupabase } from "@/services/nps";
import { getContacts } from "@/lib/crm-queries";
import type { NPSSurvey, NPSCampaign } from "../schemas";
import type { Contact } from "@/lib/schemas";

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  in_app: Globe,
  link: LinkIcon,
};

const statusColors = {
  draft: "bg-gray-500/10 text-gray-500",
  scheduled: "bg-blue-500/10 text-blue-500",
  active: "bg-green-500/10 text-green-500",
  paused: "bg-yellow-500/10 text-yellow-500",
  completed: "bg-purple-500/10 text-purple-500",
};

const CampaignsPage = () => {
  useSEO({ title: "NPS Campaigns", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [campaigns, setCampaigns] = useState<NPSCampaign[]>([]);
  const [surveys, setSurveys] = useState<NPSSurvey[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    survey_id: "",
    channel: "link" as "email" | "sms" | "in_app" | "link",
    target_segment: "",
    status: "draft" as const,
    scheduled_for: "",
  });

  useEffect(() => {
    if (supabase) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadData() {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const service = new NpsServiceSupabase(supabase);
      const [campaignsResult, surveysResult, contactsResult] =
        await Promise.all([
          service.getCampaigns({ client: supabase }),
          service.getSurveys({ client: supabase }),
          getContacts({ limit: 100 }, supabase),
        ]);
      setCampaigns(campaignsResult.data);
      setSurveys(surveysResult.data);
      setContacts(contactsResult);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignsPage.loadData",
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !formData.survey_id) return;

    try {
      const service = new NpsServiceSupabase(supabase);
      await service.createCampaign(
        { client: supabase },
        {
          name: formData.name,
          description: formData.description || null,
          survey_id: formData.survey_id,
          channel: formData.channel,
          target_segment:
            selectedContacts.length > 0
              ? JSON.stringify(selectedContacts)
              : null,
          status: formData.channel === "link" ? "active" : "draft",
          scheduled_for: formData.scheduled_for || null,
        },
      );
      toast.success("Campaign created");
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        survey_id: "",
        channel: "link",
        target_segment: "",
        status: "draft",
        scheduled_for: "",
      });
      setSelectedContacts([]);
      loadData();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "CampaignsPage.handleCreateCampaign",
        },
      );
      toast.error("Failed to create campaign");
    }
  }

  function getSurveyLink(surveyId: string) {
    return `${window.location.origin}/survey/${surveyId}`;
  }

  function copyLink(surveyId: string) {
    navigator.clipboard.writeText(getSurveyLink(surveyId));
    toast.success("Survey link copied to clipboard");
  }

  function toggleContact(contactId: string) {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  }

  const responseRate = (c: NPSCampaign) =>
    c.sent_count > 0 ? Math.round((c.response_count / c.sent_count) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              NPS Campaigns
            </h1>
            <p className="text-muted-foreground mt-1">
              Distribute surveys and track response rates.
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Create Campaign
            </h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Q1 Customer Survey"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Survey <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.survey_id}
                    onChange={(e) =>
                      setFormData({ ...formData, survey_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  >
                    <option value="">Select a survey...</option>
                    {surveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Campaign description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        channel: e.target.value as typeof formData.channel,
                      })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="link">Public Link</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="in_app">In-App</option>
                  </select>
                </div>
                {formData.channel !== "link" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Schedule For
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_for}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduled_for: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Contact Selection */}
              {formData.channel !== "link" && contacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Select Recipients ({selectedContacts.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                    {contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-muted rounded text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                          className="rounded border-input"
                        />
                        <span className="text-foreground">
                          {contact.first_name} {contact.last_name}
                        </span>
                        {contact.email && (
                          <span className="text-muted-foreground text-xs">
                            {contact.email}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Link Preview */}
              {formData.channel === "link" && formData.survey_id && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <LinkIcon className="w-4 h-4 inline mr-1" />
                    Public Survey Link
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background px-3 py-2 rounded border border-border text-muted-foreground truncate">
                      {getSurveyLink(formData.survey_id)}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(formData.survey_id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.name || !formData.survey_id}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Create Campaign
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Campaigns List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No campaigns yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Create a campaign to start distributing your NPS surveys.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign, index) => {
              const ChannelIcon = channelIcons[campaign.channel] || LinkIcon;
              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ChannelIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {campaign.name}
                        </h3>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${statusColors[campaign.status]}`}
                      >
                        {campaign.status}
                      </span>
                      {campaign.channel === "link" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const survey = surveys.find(
                              (s) => s.id === campaign.survey_id,
                            );
                            if (survey) copyLink(survey.id);
                          }}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy Link
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Channel
                      </p>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {campaign.channel.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sent</p>
                      <p className="text-sm font-medium text-foreground">
                        {campaign.sent_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Responses
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {campaign.response_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Response Rate
                      </p>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          {responseRate(campaign)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CampaignsPage;
