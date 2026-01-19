import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Star,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Tag,
  Linkedin,
  Twitter,
  Github,
  Globe,
  X,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getContacts,
  getContactLists,
  getCRMStats,
  createContact,
  updateContact,
  deleteContact,
  getFollowUps,
  completeFollowUp,
  type Contact,
  type ContactList,
  type CRMStats,
  type FollowUp,
  type ContactQueryOptions,
} from '@/lib/crm-queries';

type MainTab = 'contacts' | 'follow-ups' | 'lists';

const contactTypeColors: Record<string, string> = {
  lead: 'bg-blue-500/10 text-blue-500',
  prospect: 'bg-purple-500/10 text-purple-500',
  client: 'bg-green-500/10 text-green-500',
  partner: 'bg-orange-500/10 text-orange-500',
  vendor: 'bg-yellow-500/10 text-yellow-500',
  personal: 'bg-pink-500/10 text-pink-500',
  other: 'bg-gray-500/10 text-gray-500',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  normal: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
};

interface ContactFormData {
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
}

const emptyFormData: ContactFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: '',
  job_title: '',
  contact_type: 'lead',
  source: '',
  notes: '',
  tags: [],
  website: '',
  linkedin_url: '',
  twitter_handle: '',
  github_username: '',
};

const AdminContacts = () => {
  useSEO({ title: 'CRM - Contacts', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  // Main state
  const [mainTab, setMainTab] = useState<MainTab>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // UI state
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const queryOptions: ContactQueryOptions = {
        search: searchQuery || undefined,
        contactType: selectedType as Contact['contact_type'] || undefined,
        status: selectedStatus as Contact['status'] || undefined,
        limit: 100,
      };

      const [contactsData, listsData, statsData, upcomingFollowUps, overdueData] = await Promise.all([
        getContacts(queryOptions, supabase),
        getContactLists(supabase),
        getCRMStats(supabase),
        getFollowUps({ upcoming: true, limit: 20 }, supabase),
        getFollowUps({ overdue: true }, supabase),
      ]);

      setContacts(contactsData);
      setLists(listsData);
      setStats(statsData);
      setFollowUps(upcomingFollowUps);
      setOverdueFollowUps(overdueData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminContacts.loadData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, searchQuery, selectedType, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form handlers
  const handleCreateContact = () => {
    setEditingContact(null);
    setFormData(emptyFormData);
    setShowContactForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      job_title: contact.job_title || '',
      contact_type: contact.contact_type,
      source: contact.source || '',
      notes: contact.notes || '',
      tags: contact.tags || [],
      website: contact.website || '',
      linkedin_url: contact.linkedin_url || '',
      twitter_handle: contact.twitter_handle || '',
      github_username: contact.github_username || '',
    });
    setShowContactForm(true);
  };

  const handleSaveContact = async () => {
    if (!supabase) return;
    setIsSaving(true);

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
        }, supabase);
      }
      setShowContactForm(false);
      loadData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminContacts.saveContact',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!supabase || !confirm('Delete this contact?')) return;

    try {
      await deleteContact(id, supabase);
      loadData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminContacts.deleteContact',
      });
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    if (!supabase) return;

    try {
      await completeFollowUp(id, undefined, undefined, supabase);
      loadData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminContacts.completeFollowUp',
      });
    }
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email || contact.company || 'Unnamed Contact';
  };

  const getInitials = (contact: Contact) => {
    const name = getContactDisplayName(contact);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
            <p className="text-sm text-muted-foreground">
              Manage contacts, track interactions, and follow up on leads
            </p>
          </div>
          <Button onClick={handleCreateContact}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Total Contacts</span>
              </div>
              <p className="text-2xl font-bold">{stats.total_contacts}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Star className="w-4 h-4" />
                <span className="text-sm">Leads</span>
              </div>
              <p className="text-2xl font-bold">{stats.leads}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Pending Follow-ups</span>
              </div>
              <p className="text-2xl font-bold">{stats.pending_follow_ups}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{stats.overdue_follow_ups}</p>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {[
              { id: 'contacts', label: 'Contacts', icon: Users },
              { id: 'follow-ups', label: 'Follow-ups', icon: Calendar, badge: overdueFollowUps.length },
              { id: 'lists', label: 'Lists', icon: Tag },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as MainTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  mainTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge ? (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {tab.badge}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts Tab */}
        {mainTab === 'contacts' && (
          <div className="space-y-4">
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
              <div className="space-y-2">
                {contacts.map(contact => (
                  <motion.div
                    key={contact.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                          {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(contact)
                          )}
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {getContactDisplayName(contact)}
                            </span>
                            <Badge variant="outline" className={contactTypeColors[contact.contact_type]}>
                              {contact.contact_type}
                            </Badge>
                            {contact.next_follow_up_at && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Follow-up
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {contact.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {contact.company}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContact(contact);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(contact.id);
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedContactId === contact.id ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedContactId === contact.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {contact.phone && (
                              <div>
                                <p className="text-muted-foreground mb-1">Phone</p>
                                <p className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </p>
                              </div>
                            )}
                            {contact.job_title && (
                              <div>
                                <p className="text-muted-foreground mb-1">Job Title</p>
                                <p>{contact.job_title}</p>
                              </div>
                            )}
                            {contact.source && (
                              <div>
                                <p className="text-muted-foreground mb-1">Source</p>
                                <p>{contact.source}</p>
                              </div>
                            )}
                            {contact.last_contacted_at && (
                              <div>
                                <p className="text-muted-foreground mb-1">Last Contacted</p>
                                <p>{new Date(contact.last_contacted_at).toLocaleDateString()}</p>
                              </div>
                            )}
                            {(contact.linkedin_url || contact.twitter_handle || contact.github_username || contact.website) && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-muted-foreground mb-2">Links</p>
                                <div className="flex items-center gap-3">
                                  {contact.linkedin_url && (
                                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                                      <Linkedin className="w-4 h-4" />
                                    </a>
                                  )}
                                  {contact.twitter_handle && (
                                    <a href={`https://twitter.com/${contact.twitter_handle}`} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600">
                                      <Twitter className="w-4 h-4" />
                                    </a>
                                  )}
                                  {contact.github_username && (
                                    <a href={`https://github.com/${contact.github_username}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary">
                                      <Github className="w-4 h-4" />
                                    </a>
                                  )}
                                  {contact.website && (
                                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary">
                                      <Globe className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                            {contact.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-muted-foreground mb-1">Notes</p>
                                <p className="whitespace-pre-wrap">{contact.notes}</p>
                              </div>
                            )}
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-muted-foreground mb-1">Tags</p>
                                <div className="flex flex-wrap gap-1">
                                  {contact.tags.map(tag => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Follow-ups Tab */}
        {mainTab === 'follow-ups' && (
          <div className="space-y-6">
            {/* Overdue */}
            {overdueFollowUps.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-red-500 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Overdue ({overdueFollowUps.length})
                </h3>
                <div className="space-y-2">
                  {overdueFollowUps.map(followUp => (
                    <div
                      key={followUp.id}
                      className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{followUp.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(followUp.due_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteFollowUp(followUp.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming ({followUps.length})
              </h3>
              {followUps.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No upcoming follow-ups</p>
              ) : (
                <div className="space-y-2">
                  {followUps.map(followUp => (
                    <div
                      key={followUp.id}
                      className={`flex items-center justify-between p-4 bg-card border rounded-lg ${priorityColors[followUp.priority]}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{followUp.title}</p>
                          <Badge variant="outline">{followUp.follow_up_type}</Badge>
                          <Badge variant="outline">{followUp.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(followUp.due_at).toLocaleDateString()}
                          {followUp.description && ` - ${followUp.description}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteFollowUp(followUp.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lists Tab */}
        {mainTab === 'lists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map(list => (
              <div
                key={list.id}
                className="p-4 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{list.name}</h3>
                  <Badge variant="outline">{list.contact_count}</Badge>
                </div>
                {list.description && (
                  <p className="text-sm text-muted-foreground">{list.description}</p>
                )}
              </div>
            ))}
            {lists.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No contact lists yet
              </p>
            )}
          </div>
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

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">First Name</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Last Name</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Job Title</label>
                      <input
                        type="text"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Contact Type</label>
                      <select
                        value={formData.contact_type}
                        onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as Contact['contact_type'] })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      >
                        <option value="lead">Lead</option>
                        <option value="prospect">Prospect</option>
                        <option value="client">Client</option>
                        <option value="partner">Partner</option>
                        <option value="vendor">Vendor</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Source</label>
                      <input
                        type="text"
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        placeholder="e.g., Website, Referral, LinkedIn"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">LinkedIn URL</label>
                      <input
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Twitter Handle</label>
                      <input
                        type="text"
                        value={formData.twitter_handle}
                        onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                        placeholder="username"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">GitHub Username</label>
                      <input
                        type="text"
                        value={formData.github_username}
                        onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveContact} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {editingContact ? 'Update' : 'Create'}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminContacts;
