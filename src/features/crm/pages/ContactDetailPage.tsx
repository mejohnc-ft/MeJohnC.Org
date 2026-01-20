/**
 * ContactDetailPage Component
 *
 * Detailed view of a single contact with interactions and follow-ups
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, MessageSquare, Calendar, Loader2, Plus } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { ContactDetail } from '../components/ContactDetail';
import { InteractionLog } from '../components/InteractionLog';
import { InteractionForm } from '../components/InteractionForm';
import { FollowUpList } from '../components/FollowUpList';
import { FollowUpForm } from '../components/FollowUpForm';
import type { ContactWithDetails, Interaction, FollowUp } from '../schemas';
import { getContactById, getInteractions, createInteraction, getFollowUps, createFollowUp, completeFollowUp } from '@/lib/crm-queries';

type TabType = 'interactions' | 'follow-ups';

const ContactDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useAuthenticatedSupabase();

  const [contact, setContact] = useState<ContactWithDetails | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('interactions');
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  useSEO({
    title: contact ? `${contact.first_name || ''} ${contact.last_name || ''} - CRM` : 'Contact Details',
    noIndex: true
  });

  useEffect(() => {
    loadContactData();
  }, [id]);

  const loadContactData = async () => {
    if (!supabase || !id) return;
    setIsLoading(true);

    try {
      const [contactData, interactionsData, followUpsData] = await Promise.all([
        getContactById(id, supabase),
        getInteractions(id, 50, supabase),
        getFollowUps({ contactId: id }, supabase),
      ]);

      setContact(contactData);
      setInteractions(interactionsData);
      setFollowUps(followUpsData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactDetailPage.loadContactData',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInteraction = async (data: any) => {
    if (!supabase) return;
    try {
      await createInteraction(data, supabase);
      setShowInteractionForm(false);
      loadContactData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactDetailPage.createInteraction',
      });
    }
  };

  const handleCreateFollowUp = async (data: any) => {
    if (!supabase) return;
    try {
      await createFollowUp(data, supabase);
      setShowFollowUpForm(false);
      loadContactData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactDetailPage.createFollowUp',
      });
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    if (!supabase) return;
    try {
      await completeFollowUp(followUpId, undefined, undefined, supabase);
      loadContactData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactDetailPage.completeFollowUp',
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!contact) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Contact not found</h3>
          <Button onClick={() => navigate('/admin/crm/contacts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin/crm/contacts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
          <Button onClick={() => navigate(`/admin/crm/contacts/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Contact
          </Button>
        </div>

        {/* Contact Details */}
        <ContactDetail contact={contact} />

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('interactions')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'interactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Interactions ({interactions.length})
            </button>
            <button
              onClick={() => setActiveTab('follow-ups')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'follow-ups'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Follow-ups ({followUps.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'interactions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowInteractionForm(!showInteractionForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Log Interaction
              </Button>
            </div>

            {showInteractionForm && (
              <div className="bg-card border border-border rounded-lg p-4">
                <InteractionForm
                  contactId={id!}
                  onSubmit={handleCreateInteraction}
                  onCancel={() => setShowInteractionForm(false)}
                />
              </div>
            )}

            <InteractionLog interactions={interactions} />
          </div>
        )}

        {activeTab === 'follow-ups' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowFollowUpForm(!showFollowUpForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Follow-up
              </Button>
            </div>

            {showFollowUpForm && (
              <div className="bg-card border border-border rounded-lg p-4">
                <FollowUpForm
                  contactId={id!}
                  onSubmit={handleCreateFollowUp}
                  onCancel={() => setShowFollowUpForm(false)}
                />
              </div>
            )}

            <FollowUpList
              followUps={followUps}
              onComplete={handleCompleteFollowUp}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ContactDetailPage;
