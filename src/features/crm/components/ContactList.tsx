/**
 * ContactList Component
 *
 * Displays a list of contacts with expandable details
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  Building2,
  Clock,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Linkedin,
  Twitter,
  Github,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Contact } from '../schemas';

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

const contactTypeColors: Record<string, string> = {
  lead: 'bg-blue-500/10 text-blue-500',
  prospect: 'bg-purple-500/10 text-purple-500',
  client: 'bg-green-500/10 text-green-500',
  partner: 'bg-orange-500/10 text-orange-500',
  vendor: 'bg-yellow-500/10 text-yellow-500',
  personal: 'bg-pink-500/10 text-pink-500',
  other: 'bg-gray-500/10 text-gray-500',
};

export function ContactList({ contacts, onEdit, onDelete }: ContactListProps) {
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

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
                    onEdit(contact);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contact.id);
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
  );
}
