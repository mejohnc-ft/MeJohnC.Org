/**
 * ContactsPage Component
 *
 * Main CRM contacts page with list view and filters
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, Loader2, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { ContactList } from '../components/ContactList';
import { ContactForm } from '../components/ContactForm';
import type { Contact } from '../schemas';
import { getContacts, createContact, updateContact, deleteContact, type ContactQueryOptions } from '@/lib/crm-queries';

const ContactsPage = () => {
  useSEO({ title: 'CRM - Contacts', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const queryOptions: ContactQueryOptions = {
        search: searchQuery || undefined,
        contactType: selectedType as Contact['contact_type'] || undefined,
        status: selectedStatus as Contact['status'] || undefined,
        limit: 100,
      };

      const data = await getContacts(queryOptions, supabase);
      setContacts(data);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactsPage.loadContacts',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, searchQuery, selectedType, selectedStatus]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleCreateContact = () => {
    setEditingContact(null);
    setShowContactForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const handleSaveContact = async (formData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    job_title: string;
    contact_type: Contact['contact_type'];
    source: string;
    notes: string;
    tags: string[];
    website: string;
    linkedin_url: string;
    twitter_handle: string;
    github_username: string;
  }) => {
    if (!supabase) return;

    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData, supabase);
      } else {
        await createContact({
          ...formData,
          status: 'active',
          lead_score: 0,
          source_detail: null,
          referrer_id: null,
          city: null,
          state: null,
          country: null,
          timezone: null,
          avatar_url: null,
          bio: null,
          custom_fields: null,
          next_follow_up_at: null,
          last_contacted_at: null,
        }, supabase);
      }
      setShowContactForm(false);
      loadContacts();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactsPage.saveContact',
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!supabase || !confirm('Delete this contact?')) return;

    try {
      await deleteContact(id, supabase);
      loadContacts();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ContactsPage.deleteContact',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Manage your contacts and relationships
            </p>
          </div>
          <Button onClick={handleCreateContact}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="lead">Leads</option>
            <option value="prospect">Prospects</option>
            <option value="client">Clients</option>
            <option value="partner">Partners</option>
            <option value="vendor">Vendors</option>
            <option value="personal">Personal</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="">All</option>
          </select>
        </div>

        {/* Contact List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
            <p className="text-muted-foreground mb-4">Add your first contact to get started</p>
            <Button onClick={handleCreateContact}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        ) : (
          <ContactList
            contacts={contacts}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
          />
        )}

        {/* Contact Form Modal */}
        <AnimatePresence>
          {showContactForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowContactForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="text-lg font-medium">
                    {editingContact ? 'Edit Contact' : 'Add Contact'}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowContactForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-4">
                  <ContactForm
                    initialData={editingContact ? {
                      first_name: editingContact.first_name || '',
                      last_name: editingContact.last_name || '',
                      email: editingContact.email || '',
                      phone: editingContact.phone || '',
                      company: editingContact.company || '',
                      job_title: editingContact.job_title || '',
                      contact_type: editingContact.contact_type,
                      source: editingContact.source || '',
                      notes: editingContact.notes || '',
                      tags: editingContact.tags || [],
                      website: editingContact.website || '',
                      linkedin_url: editingContact.linkedin_url || '',
                      twitter_handle: editingContact.twitter_handle || '',
                      github_username: editingContact.github_username || '',
                    } : undefined}
                    onSubmit={handleSaveContact}
                    onCancel={() => setShowContactForm(false)}
                    isEditing={!!editingContact}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default ContactsPage;
