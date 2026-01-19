import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, UserCheck, UserX, Download, Upload } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getEmailSubscribers, type SubscriberQueryOptions } from '@/lib/marketing-queries';
import type { EmailSubscriber } from '@/lib/schemas';

const MarketingSubscribers = () => {
  useSEO({ title: 'Email Subscribers', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailSubscriber['status'] | 'all'>('all');

  useEffect(() => {
    async function fetchSubscribers() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const options: SubscriberQueryOptions = {};

        if (statusFilter !== 'all') {
          options.status = statusFilter;
        }

        if (searchQuery) {
          options.search = searchQuery;
        }

        const data = await getEmailSubscribers(options, supabase);
        setSubscribers(data);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'MarketingSubscribers.fetchSubscribers',
        });
      } finally {
        setIsLoading(false);
      }
    }

    const debounceTimer = setTimeout(() => {
      fetchSubscribers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [supabase, searchQuery, statusFilter]);

  const getStatusBadge = (status: EmailSubscriber['status']) => {
    const styles = {
      active: 'bg-green-500/10 text-green-500',
      unsubscribed: 'bg-gray-500/10 text-gray-500',
      bounced: 'bg-red-500/10 text-red-500',
      complained: 'bg-orange-500/10 text-orange-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getEngagementRate = (subscriber: EmailSubscriber) => {
    if (subscriber.total_emails_sent === 0) return 0;
    return ((subscriber.total_emails_opened / subscriber.total_emails_sent) * 100).toFixed(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Subscribers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your newsletter subscribers and email lists.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/marketing/subscribers/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Subscriber
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmailSubscriber['status'] | 'all')}
              className="px-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
              <option value="complained">Complained</option>
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {subscribers.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <UserX className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unsubscribed</p>
                <p className="text-2xl font-bold">
                  {subscribers.filter(s => s.status === 'unsubscribed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                <p className="text-2xl font-bold">
                  {subscribers.length > 0
                    ? (subscribers.reduce((acc, s) => acc + parseFloat(getEngagementRate(s)), 0) / subscribers.length).toFixed(1)
                    : '0'}%
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">
                  {subscribers.reduce((acc, s) => acc + s.total_emails_sent, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Subscriber
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Lists
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Engagement
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Subscribed
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading subscribers...
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No subscribers found.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber, index) => (
                    <motion.tr
                      key={subscriber.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {subscriber.first_name || subscriber.last_name
                              ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
                              : 'Anonymous'}
                          </p>
                          <p className="text-sm text-muted-foreground">{subscriber.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(subscriber.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {subscriber.lists.slice(0, 2).map((list) => (
                            <span
                              key={list}
                              className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs"
                            >
                              {list}
                            </span>
                          ))}
                          {subscriber.lists.length > 2 && (
                            <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded text-xs">
                              +{subscriber.lists.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{getEngagementRate(subscriber)}%</p>
                          <p className="text-xs text-muted-foreground">
                            {subscriber.total_emails_opened}/{subscriber.total_emails_sent} opened
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          {new Date(subscriber.subscribed_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/admin/marketing/subscribers/${subscriber.id}`}>
                            View
                          </Link>
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketingSubscribers;
