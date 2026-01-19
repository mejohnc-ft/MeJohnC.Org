import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, Mail } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getEmailCampaigns } from '@/lib/marketing-queries';
import type { EmailCampaign } from '@/lib/schemas';

const MarketingCampaigns = () => {
  useSEO({ title: 'Email Campaigns', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EmailCampaign['status'] | 'all'>('all');

  useEffect(() => {
    async function fetchCampaigns() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getEmailCampaigns(
          statusFilter === 'all' ? undefined : statusFilter,
          supabase
        );
        setCampaigns(data);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'MarketingCampaigns.fetchCampaigns',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaigns();
  }, [supabase, statusFilter]);

  const getStatusBadge = (status: EmailCampaign['status']) => {
    const styles = {
      draft: 'bg-gray-500/10 text-gray-500',
      scheduled: 'bg-blue-500/10 text-blue-500',
      sending: 'bg-yellow-500/10 text-yellow-500',
      sent: 'bg-green-500/10 text-green-500',
      paused: 'bg-orange-500/10 text-orange-500',
      cancelled: 'bg-red-500/10 text-red-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getOpenRate = (campaign: EmailCampaign) => {
    if (campaign.sent_count === 0) return '0.0';
    return ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1);
  };

  const getClickRate = (campaign: EmailCampaign) => {
    if (campaign.sent_count === 0) return '0.0';
    return ((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage email campaigns to your subscribers.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/marketing/campaigns/new">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Link>
          </Button>
        </div>

        {/* Filter */}
        <div className="flex justify-between items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmailCampaign['status'] | 'all')}
            className="px-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Campaigns</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
          </select>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email campaign to get started.
              </p>
              <Button asChild>
                <Link to="/admin/marketing/campaigns/new">Create Campaign</Link>
              </Button>
            </div>
          ) : (
            campaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Subject:</strong> {campaign.subject}
                    </p>
                    {campaign.preview_text && (
                      <p className="text-sm text-muted-foreground">
                        {campaign.preview_text}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/marketing/campaigns/${campaign.id}`}>View</Link>
                  </Button>
                </div>

                {campaign.status === 'scheduled' && campaign.scheduled_for && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Scheduled for {new Date(campaign.scheduled_for).toLocaleString()}</span>
                  </div>
                )}

                {campaign.status === 'sent' && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sent</p>
                      <p className="text-lg font-semibold">{campaign.sent_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                      <p className="text-lg font-semibold">{campaign.delivered_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Open Rate</p>
                      <p className="text-lg font-semibold">{getOpenRate(campaign)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Click Rate</p>
                      <p className="text-lg font-semibold">{getClickRate(campaign)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Bounced</p>
                      <p className="text-lg font-semibold">{campaign.bounced_count}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
                  {campaign.sent_at && (
                    <>
                      <span>•</span>
                      <span>Sent {new Date(campaign.sent_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketingCampaigns;
