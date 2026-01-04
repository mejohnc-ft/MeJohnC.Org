import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Linkedin, Github, Calendar, Twitter, ArrowUpRight, Edit2, Loader2, Save, X, type LucideIcon } from 'lucide-react';
import { ContentSkeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import PageTransition, { fadeInUp } from '@/components/PageTransition';
import { useAuth, SignedIn } from '@/lib/auth';
import { useSupabaseClient } from '@/lib/supabase';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import {
  getSiteContent,
  upsertSiteContent,
  getContactLinks,
  type SiteContent,
  type ContactLink,
  type ContactIcon,
} from '@/lib/supabase-queries';
import { renderMarkdown } from '@/lib/markdown';
import { useSEO, useJsonLd, personSchema } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import DOMPurify from 'dompurify';

// Icon mapping for contact links
const iconComponents: Record<ContactIcon, LucideIcon> = {
  email: Mail,
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  calendar: Calendar,
};

// Fallback contact links if database is empty
const defaultContactLinks = [
  {
    label: "Email",
    href: "mailto:mejohnwc@gmail.com",
    icon: 'email' as ContactIcon,
    value: "mejohnwc@gmail.com",
    description: "Best way to reach me"
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/mejohnc/",
    icon: 'linkedin' as ContactIcon,
    value: "/in/mejohnc",
    description: "Let's connect"
  },
  {
    label: "GitHub",
    href: "https://github.com/mejohnc-ft",
    icon: 'github' as ContactIcon,
    value: "@mejohnc-ft",
    description: "See my code"
  },
  {
    label: "Calendar",
    href: "https://calendly.com/jonathan-christensen",
    icon: 'calendar' as ContactIcon,
    value: "Book a call",
    description: "Schedule time to chat"
  }
];

const About = () => {
  useAuth();
  const supabase = useSupabaseClient();
  const { focusLevel, setFocusLevel } = useKeyboardFocus();

  useSEO({
    title: 'About',
    description: 'AI Automation Engineer obsessed with making AI agents actually useful. Building agentic systems, automation pipelines, and AI-powered workflows.',
    url: '/about',
    type: 'profile',
  });

  useJsonLd(personSchema);

  const [content, setContent] = useState<SiteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Contact links state
  const [contactLinks, setContactLinks] = useState<(ContactLink | typeof defaultContactLinks[0])[]>(defaultContactLinks);
  const [contactFocusedIndex, setContactFocusedIndex] = useState(-1);
  const contactLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Default content if nothing in Supabase
  const defaultTitle = "I build systems that work.";
  const defaultContent = `AI Automation Engineer obsessed with making AI agents actually useful. Not the "slap an LLM on it" kind of useful—the kind where you measure token costs, benchmark latency, and ship workflows that survive production.

Currently focused on **agentic systems**, **agent management planes**, and the infrastructure that makes autonomous AI reliable. I care about evals, cost tracking, and knowing when an agent is actually doing its job.

Background in enterprise IT—Azure, Intune, M365 at scale. Now applying that systems thinking to AI workflows.`;

  useEffect(() => {
    async function fetchData() {
      try {
        const [aboutData, linksData] = await Promise.all([
          getSiteContent('about', supabase),
          getContactLinks(supabase).catch(() => []),
        ]);

        setContent(aboutData);
        if (aboutData) {
          setEditTitle(aboutData.title);
          setEditContent(aboutData.content);
        }

        if (linksData && linksData.length > 0) {
          setContactLinks(linksData);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'About.fetchData' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
     
  }, [supabase]);

  // Keyboard navigation for contact cards
  const handleContactKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle if we're focused on contact cards
    if (focusLevel !== 'contactCards') return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const cols = 2;
    const total = contactLinks.length;

    // If no card is focused yet
    if (contactFocusedIndex === -1) {
      if (e.key === 'ArrowUp') {
        // Go back to nav
        e.preventDefault();
        setFocusLevel('nav');
        return;
      }
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown'].includes(e.key)) {
        // Focus the first card
        e.preventDefault();
        setContactFocusedIndex(0);
        contactLinksRef.current[0]?.focus();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextRight = (contactFocusedIndex + 1) % total;
        setContactFocusedIndex(nextRight);
        contactLinksRef.current[nextRight]?.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const nextLeft = (contactFocusedIndex - 1 + total) % total;
        setContactFocusedIndex(nextLeft);
        contactLinksRef.current[nextLeft]?.focus();
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const nextDown = Math.min(contactFocusedIndex + cols, total - 1);
        setContactFocusedIndex(nextDown);
        contactLinksRef.current[nextDown]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (contactFocusedIndex < cols) {
          setContactFocusedIndex(-1);
          setFocusLevel('nav');
        } else {
          const nextUp = Math.max(contactFocusedIndex - cols, 0);
          setContactFocusedIndex(nextUp);
          contactLinksRef.current[nextUp]?.focus();
        }
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (contactFocusedIndex >= 0) {
          window.open(contactLinks[contactFocusedIndex]?.href,
            contactLinks[contactFocusedIndex]?.href.startsWith('mailto') ? '_self' : '_blank');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setContactFocusedIndex(-1);
        setFocusLevel('nav');
        break;
    }
  }, [focusLevel, contactFocusedIndex, contactLinks, setFocusLevel]);

  useEffect(() => {
    window.addEventListener('keydown', handleContactKeyDown);
    return () => window.removeEventListener('keydown', handleContactKeyDown);
  }, [handleContactKeyDown]);

  // Auto-focus first card when entering contactCards level from nav
  useEffect(() => {
    if (focusLevel === 'contactCards' && contactFocusedIndex === -1) {
      setContactFocusedIndex(0);
      contactLinksRef.current[0]?.focus();
    }
  }, [focusLevel, contactFocusedIndex]);

  // Handle focus entering the contact cards section (via Tab)
  const handleContactCardFocus = (index: number) => {
    setContactFocusedIndex(index);
    setFocusLevel('contactCards');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await upsertSiteContent('about', {
        title: editTitle,
        content: editContent,
      }, supabase);
      setContent(saved);
      setIsEditing(false);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'About.save' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(content?.title || defaultTitle);
    setEditContent(content?.content || defaultContent);
    setIsEditing(false);
  };


  const displayTitle = content?.title || defaultTitle;
  const displayContent = content?.content || defaultContent;

  return (
    <PageTransition>
      <section className="py-8 px-6 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header with edit button */}
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm text-primary uppercase tracking-widest">
                About
              </span>
              <SignedIn>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </SignedIn>
            </div>

            {isLoading ? (
              <ContentSkeleton />
            ) : isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-4xl md:text-5xl font-black bg-transparent text-foreground border-b border-border focus:border-primary focus:outline-none pb-2"
                  placeholder="Title..."
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[200px] text-lg bg-background border border-border rounded-lg p-4 text-muted-foreground focus:border-primary focus:outline-none resize-y"
                  placeholder="Write your bio... (Markdown supported)"
                />
                <p className="text-xs text-muted-foreground">
                  Markdown supported: **bold**, *italic*, [links](url)
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-8">
                  {displayTitle}
                </h1>
                <div
                  className="prose prose-lg prose-invert max-w-none text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(displayContent)) }}
                />
              </>
            )}
          </motion.div>

          {/* Contact Section */}
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="border-t border-border pt-8 mt-8"
          >
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Contact
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2 mb-4">
              Get in touch
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              I respond within 24 hours. Let's talk about AI agents, automation,
              or whatever you're building.
            </p>
          </motion.div>

          {/* Contact Links with Keyboard Navigation */}
          <div className="grid md:grid-cols-2 gap-4">
            {contactLinks.map((link, index) => {
              const IconComponent = iconComponents[link.icon] || Mail;
              const isFocused = focusLevel === 'contactCards' && contactFocusedIndex === index;

              if (!link.href || !link.label) return null;

              return (
                <motion.a
                  key={'id' in link ? link.id : index}
                  ref={(el) => { contactLinksRef.current[index] = el; }}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onFocus={() => handleContactCardFocus(index)}
                  tabIndex={0}
                  className={`flex items-center gap-4 p-6 border-2 border-border group bg-card/50 backdrop-blur-sm rounded-lg outline-none transition-[border-color,box-shadow] duration-200 ${
                    isFocused ? 'contact-card-glow' : 'hover:border-primary/50'
                  }`}
                >
                  <motion.div
                    className={`p-3 rounded-lg transition-colors ${isFocused ? 'bg-primary/20' : 'bg-secondary group-hover:bg-primary/10'}`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <IconComponent className={`w-5 h-5 transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs uppercase tracking-wider transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground'}`}>
                        {link.label}
                      </span>
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="inline-block"
                      >
                        <ArrowUpRight className={`w-3 h-3 transition-all ${isFocused ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
                      </motion.span>
                    </div>
                    <div className={`font-medium transition-colors ${isFocused ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                      {link.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {link.description}
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>

        </div>
      </section>
    </PageTransition>
  );
};

export default About;
