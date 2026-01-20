/**
 * ContactCard Component
 *
 * Compact card view of a contact
 */

import { Mail, Phone, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Contact } from '../schemas';

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
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

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const getDisplayName = () => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.email || contact.company || 'Unnamed Contact';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium flex-shrink-0">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground truncate">{getDisplayName()}</h3>
            <Badge variant="outline" className={contactTypeColors[contact.contact_type]}>
              {contact.contact_type}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {contact.company && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
