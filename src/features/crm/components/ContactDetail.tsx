/**
 * ContactDetail Component
 *
 * Full detail view of a contact with all information
 */

import { Mail, Phone, Globe, Linkedin, Twitter, Github, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ContactWithDetails } from '../schemas';

interface ContactDetailProps {
  contact: ContactWithDetails;
}

export function ContactDetail({ contact }: ContactDetailProps) {
  const getDisplayName = () => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email || contact.company || 'Unnamed Contact';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-medium">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            getDisplayName().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground mb-2">{getDisplayName()}</h2>
          {contact.job_title && <p className="text-muted-foreground">{contact.job_title}</p>}
          {contact.company && <p className="text-muted-foreground">{contact.company}</p>}
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {contact.website}
            </a>
          </div>
        )}
        {contact.last_contacted_at && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last contacted: {new Date(contact.last_contacted_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Social Links */}
      {(contact.linkedin_url || contact.twitter_handle || contact.github_username) && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Social</h3>
          <div className="flex items-center gap-3">
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {contact.twitter_handle && (
              <a href={`https://twitter.com/${contact.twitter_handle}`} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600">
                <Twitter className="w-5 h-5" />
              </a>
            )}
            {contact.github_username && (
              <a href={`https://github.com/${contact.github_username}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary">
                <Github className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <p className="text-foreground whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}

      {/* Bio */}
      {contact.bio && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio</h3>
          <p className="text-foreground whitespace-pre-wrap">{contact.bio}</p>
        </div>
      )}
    </div>
  );
}
