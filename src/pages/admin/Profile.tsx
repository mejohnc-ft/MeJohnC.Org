import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Linkedin,
  Github,
  Twitter,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import RecoveryTracker from "@/pages/RecoveryTracker";
import AdminLayout from "@/components/AdminLayout";
import MarkdownEditor from "@/components/admin/MarkdownEditor";
import {
  Field,
  Input,
  Textarea,
  Select,
  TagInput,
} from "@/components/admin/EditorPanel";
import { Button } from "@/components/ui/button";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { useTheme } from "@/lib/theme";
import { captureException } from "@/lib/sentry";
import {
  getSiteContent,
  upsertSiteContent,
  getContactLinks,
  createContactLink,
  updateContactLink,
  deleteContactLink,
  reorderContactLinks,
  getWorkHistory,
  createWorkHistoryEntry,
  updateWorkHistoryEntry,
  deleteWorkHistoryEntry,
  reorderWorkHistory,
  getCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  reorderCaseStudies,
  getTimelines,
  getTimelineEntries,
  createTimeline,
  updateTimeline,
  deleteTimeline,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  reorderTimelineEntries,
  type SiteContent,
  type ContactLink,
  type ContactIcon,
  type WorkHistoryEntry,
  type CaseStudy,
  type Timeline,
  type TimelineEntry,
  type TimelineChartType,
} from "@/lib/supabase-queries";

type TabId =
  | "hero"
  | "about"
  | "contact"
  | "work-history"
  | "case-studies"
  | "timelines"
  | "recovery";

const tabs: { id: TabId; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "work-history", label: "Work History" },
  { id: "case-studies", label: "Case Studies" },
  { id: "timelines", label: "Timelines" },
  { id: "recovery", label: "Recovery" },
];

const iconOptions: { value: ContactIcon; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "twitter", label: "Twitter/X" },
  { value: "calendar", label: "Calendar" },
];

const iconComponents: Record<ContactIcon, LucideIcon> = {
  email: Mail,
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  calendar: Calendar,
};

// ============================================
// HERO TAB (Home page content)
// ============================================
const HeroTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [, setContent] = useState<SiteContent | null>(null);
  const [name, setName] = useState("Jonathan Christensen");
  const [title, setTitle] = useState("AI Automation Engineer");
  const [tagline, setTagline] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getSiteContent("hero", supabase);
        setContent(data);
        if (data) {
          // Parse the content - stored as JSON with name, title, tagline
          try {
            const parsed = JSON.parse(data.content);
            setName(parsed.name || "Jonathan Christensen");
            setTitle(parsed.title || "AI Automation Engineer");
            setTagline(parsed.tagline || "");
          } catch {
            // If not JSON, use as tagline
            setTagline(data.content);
          }
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchHero",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const heroContent = JSON.stringify({ name, title, tagline });
      const saved = await upsertSiteContent(
        "hero",
        {
          title: name,
          content: heroContent,
        },
        supabase,
      );
      setContent(saved);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveHero",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <p className="text-sm text-muted-foreground mb-4">
        This content appears on the home page hero section.
      </p>

      <Field label="Name" description="Your display name on the home page">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jonathan Christensen"
        />
      </Field>

      <Field label="Title" description="Your professional title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="AI Automation Engineer"
        />
      </Field>

      <Field label="Tagline" description="A brief description of what you do">
        <Textarea
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Building agentic systems, automation pipelines, and AI-powered workflows..."
          rows={3}
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Hero
        </Button>
      </div>

      {/* Preview */}
      <div className="mt-8 p-6 bg-background border border-border rounded-lg">
        <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
          Preview
        </p>
        <h2 className="text-4xl font-black text-foreground mb-2">
          {name || "Your Name"}
        </h2>
        <p className="font-mono text-lg text-primary mb-3">
          {title || "Your Title"}
        </p>
        <p className="text-muted-foreground">{tagline || "Your tagline..."}</p>
      </div>
    </motion.div>
  );
};

// ============================================
// ABOUT TAB
// ============================================
const AboutTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [, setContent] = useState<SiteContent | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getSiteContent("about", supabase);
        setContent(data);
        if (data) {
          setTitle(data.title);
          setBody(data.content);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchAbout",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await upsertSiteContent(
        "about",
        { title, content: body },
        supabase,
      );
      setContent(saved);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveAbout",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="I build systems that work."
        />
      </Field>

      <Field label="Content" description="Markdown supported">
        <MarkdownEditor
          value={body}
          onChange={setBody}
          placeholder="Write about yourself..."
          minHeight="300px"
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save About
        </Button>
      </div>
    </motion.div>
  );
};

// ============================================
// CONTACT TAB
// ============================================
const ContactTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    href: "",
    value: "",
    description: "",
    icon: "email" as ContactIcon,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getContactLinks(supabase);
        setLinks(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchContacts",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const resetForm = () => {
    setFormData({
      label: "",
      href: "",
      value: "",
      description: "",
      icon: "email",
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await updateContactLink(editingId, formData, supabase);
        setLinks(links.map((l) => (l.id === editingId ? updated : l)));
      } else {
        const created = await createContactLink(
          { ...formData, order_index: links.length },
          supabase,
        );
        setLinks([...links, created]);
      }
      resetForm();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveContact",
      });
    }
  };

  const handleEdit = (link: ContactLink) => {
    setFormData({
      label: link.label,
      href: link.href,
      value: link.value || "",
      description: link.description || "",
      icon: link.icon,
    });
    setEditingId(link.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContactLink(id, supabase);
      setLinks(links.filter((l) => l.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.deleteContact",
      });
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const newLinks = [...links];
    [newLinks[index], newLinks[newIndex]] = [
      newLinks[newIndex],
      newLinks[index],
    ];
    setLinks(newLinks);

    await reorderContactLinks(
      newLinks.map((l) => l.id),
      supabase,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* List */}
      <div className="space-y-2">
        {links.map((link, index) => {
          const Icon = iconComponents[link.icon];
          return (
            <div
              key={link.id}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Icon className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{link.label}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {link.href}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleReorder(index, "up")}
                  disabled={index === 0}
                  className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReorder(index, "down")}
                  disabled={index === links.length - 1}
                  className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(link)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form */}
      {isAdding ? (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Label">
              <Input
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="Email"
              />
            </Field>
            <Field label="Icon">
              <Select
                value={formData.icon}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    icon: e.target.value as ContactIcon,
                  })
                }
                options={iconOptions}
              />
            </Field>
          </div>
          <Field label="URL/Link">
            <Input
              value={formData.href}
              onChange={(e) =>
                setFormData({ ...formData, href: e.target.value })
              }
              placeholder="mailto:you@example.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display Value" description="What shows on the card">
              <Input
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Description">
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Best way to reach me"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Update" : "Add"} Link
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact Link
        </Button>
      )}
    </motion.div>
  );
};

// ============================================
// WORK HISTORY TAB
// ============================================
const WorkHistoryTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [entries, setEntries] = useState<WorkHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    period: "",
    highlights: [] as string[],
    tech: [] as string[],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getWorkHistory(supabase);
        setEntries(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchWorkHistory",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const resetForm = () => {
    setFormData({
      title: "",
      company: "",
      period: "",
      highlights: [],
      tech: [],
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    setError(null);
    try {
      if (editingId) {
        const updated = await updateWorkHistoryEntry(
          editingId,
          formData,
          supabase,
        );
        setEntries(entries.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const created = await createWorkHistoryEntry(
          { ...formData, order_index: entries.length },
          supabase,
        );
        setEntries([...entries, created]);
      }
      resetForm();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveWorkHistory",
      });
      setError(
        "Failed to save work history entry. Make sure you have permission.",
      );
    }
  };

  const handleEdit = (entry: WorkHistoryEntry) => {
    setFormData({
      title: entry.title,
      company: entry.company,
      period: entry.period,
      highlights: entry.highlights || [],
      tech: entry.tech || [],
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteWorkHistoryEntry(id, supabase);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.deleteWorkHistory",
      });
      setError(
        "Failed to delete work history entry. Make sure you have permission.",
      );
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= entries.length) return;

    const newEntries = [...entries];
    [newEntries[index], newEntries[newIndex]] = [
      newEntries[newIndex],
      newEntries[index],
    ];
    setEntries(newEntries);

    await reorderWorkHistory(
      newEntries.map((e) => e.id),
      supabase,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
        >
          {error}
        </motion.div>
      )}

      {/* List */}
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="p-4 bg-card border border-border rounded-lg"
          >
            <div className="flex items-start gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      {entry.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.company} | {entry.period}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorder(index, "up")}
                      disabled={index === 0}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(index, "down")}
                      disabled={index === entries.length - 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {entry.highlights.length > 0 && (
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                    {entry.highlights.slice(0, 2).map((h, i) => (
                      <li key={i} className="truncate">
                        {h}
                      </li>
                    ))}
                    {entry.highlights.length > 2 && (
                      <li className="text-primary">
                        +{entry.highlights.length - 2} more
                      </li>
                    )}
                  </ul>
                )}
                {entry.tech.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tech.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {isAdding ? (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title">
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="AI Automation Engineer"
              />
            </Field>
            <Field label="Company">
              <Input
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="centrexIT"
              />
            </Field>
          </div>
          <Field label="Period">
            <Input
              value={formData.period}
              onChange={(e) =>
                setFormData({ ...formData, period: e.target.value })
              }
              placeholder="2023 - Present"
            />
          </Field>
          <Field
            label="Highlights"
            description="Press Enter to add each highlight"
          >
            <TagInput
              value={formData.highlights}
              onChange={(highlights) =>
                setFormData({ ...formData, highlights })
              }
              placeholder="Add highlight..."
            />
          </Field>
          <Field
            label="Tech Stack"
            description="Press Enter to add each technology"
          >
            <TagInput
              value={formData.tech}
              onChange={(tech) => setFormData({ ...formData, tech })}
              placeholder="Add technology..."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Update" : "Add"} Entry
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Work History
        </Button>
      )}
    </motion.div>
  );
};

// ============================================
// CASE STUDIES TAB
// ============================================
const CaseStudiesTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    metric: "",
    title: "",
    before_content: "",
    after_content: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCaseStudies(supabase);
        setStudies(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchCaseStudies",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const resetForm = () => {
    setFormData({
      metric: "",
      title: "",
      before_content: "",
      after_content: "",
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    setError(null);
    try {
      if (editingId) {
        const updated = await updateCaseStudy(editingId, formData, supabase);
        setStudies(studies.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const created = await createCaseStudy(
          { ...formData, order_index: studies.length },
          supabase,
        );
        setStudies([...studies, created]);
      }
      resetForm();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveCaseStudy",
      });
      setError("Failed to save case study. Make sure you have permission.");
    }
  };

  const handleEdit = (study: CaseStudy) => {
    setFormData({
      metric: study.metric,
      title: study.title,
      before_content: study.before_content,
      after_content: study.after_content,
    });
    setEditingId(study.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteCaseStudy(id, supabase);
      setStudies(studies.filter((s) => s.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.deleteCaseStudy",
      });
      setError("Failed to delete case study. Make sure you have permission.");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= studies.length) return;

    const newStudies = [...studies];
    [newStudies[index], newStudies[newIndex]] = [
      newStudies[newIndex],
      newStudies[index],
    ];
    setStudies(newStudies);

    await reorderCaseStudies(
      newStudies.map((s) => s.id),
      supabase,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
        >
          {error}
        </motion.div>
      )}

      {/* List */}
      <div className="space-y-2">
        {studies.map((study, index) => (
          <div
            key={study.id}
            className="p-4 bg-card border border-border rounded-lg"
          >
            <div className="flex items-start gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">
                      {study.metric}
                    </span>
                    <span className="font-medium text-foreground">
                      {study.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorder(index, "up")}
                      disabled={index === 0}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(index, "down")}
                      disabled={index === studies.length - 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(study)}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(study.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Before: </span>
                    <span className="text-foreground">
                      {study.before_content}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">After: </span>
                    <span className="text-foreground">
                      {study.after_content}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {isAdding ? (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Metric" description="e.g., 70%, 2->0, 10x">
              <Input
                value={formData.metric}
                onChange={(e) =>
                  setFormData({ ...formData, metric: e.target.value })
                }
                placeholder="70%"
              />
            </Field>
            <Field label="Title">
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Provisioning Automation"
              />
            </Field>
          </div>
          <Field label="Before" description="The problem/state before">
            <Textarea
              value={formData.before_content}
              onChange={(e) =>
                setFormData({ ...formData, before_content: e.target.value })
              }
              placeholder="Manual parsing of intake forms across 20+ client domains"
              rows={2}
            />
          </Field>
          <Field label="After" description="The solution/result after">
            <Textarea
              value={formData.after_content}
              onChange={(e) =>
                setFormData({ ...formData, after_content: e.target.value })
              }
              placeholder="End-to-end OCR + Graph API pipeline with zero manual parsing"
              rows={2}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Update" : "Add"} Case Study
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Case Study
        </Button>
      )}
    </motion.div>
  );
};

// ============================================
// TIMELINES TAB
// ============================================
const chartTypeOptions: { value: TimelineChartType; label: string }[] = [
  { value: "growth", label: "Growth (upward curve)" },
  { value: "linear", label: "Linear (straight line)" },
  { value: "decline", label: "Decline (downward curve)" },
];

// Theme color definitions for timeline
const timelineThemes = {
  warm: {
    primary: "hsl(25, 95%, 53%)",
    segments: [
      "hsl(25, 15%, 30%)",
      "hsl(25, 40%, 40%)",
      "hsl(25, 70%, 48%)",
      "hsl(25, 95%, 53%)",
    ],
    segmentText: [
      "hsl(30, 10%, 95%)",
      "hsl(30, 10%, 95%)",
      "hsl(20, 20%, 5%)",
      "hsl(20, 20%, 5%)",
    ],
    glow: "hsla(25, 95%, 53%, 0.15)",
    gridLine: "hsl(25, 8%, 25%)",
    progressInactive: "hsl(25, 8%, 30%)",
  },
  crisp: {
    primary: "hsl(177, 94%, 21%)",
    segments: [
      "hsl(177, 23%, 53%)",
      "hsl(177, 50%, 35%)",
      "hsl(177, 94%, 21%)",
      "hsl(176, 62%, 18%)",
    ],
    segmentText: [
      "hsl(169, 52%, 4%)",
      "hsl(60, 10%, 97%)",
      "hsl(60, 10%, 97%)",
      "hsl(60, 10%, 97%)",
    ],
    glow: "hsla(177, 94%, 21%, 0.15)",
    gridLine: "hsl(177, 15%, 80%)",
    progressInactive: "hsl(177, 10%, 75%)",
  },
};

// Inline Timeline Preview Component (WYSIWYG)
const TimelinePreview = ({ entries }: { entries: TimelineEntry[] }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    entries[0]?.id || null,
  );
  const { theme: currentTheme } = useTheme();
  const theme = timelineThemes[currentTheme];

  // Calculate dot positions
  const getDotPosition = (
    dotPosition: number,
    entryCount: number,
    index: number,
  ) => {
    const segmentWidth = 100 / entryCount;
    const left = `${segmentWidth * index + segmentWidth / 2}%`;
    const top = `${92 - (dotPosition / 100) * 77}%`;
    return { left, top };
  };

  // Generate curve path
  const generateCurvePath = () => {
    if (entries.length === 0) return "";
    const count = entries.length;
    const segmentWidth = 100 / count;
    const points = entries.map((entry, i) => {
      const x = segmentWidth * i + segmentWidth / 2;
      const y = 92 - (entry.dot_position / 100) * 77;
      return { x, y };
    });
    let path = `M 0,${92 - (entries[0].dot_position / 100) * 77 + 5}`;
    points.forEach((point, i) => {
      if (i === 0) {
        path += ` C ${point.x / 2},${point.y + 2} ${point.x - 2},${point.y} ${point.x},${point.y}`;
      } else {
        const prev = points[i - 1];
        const cpX1 = prev.x + (point.x - prev.x) * 0.4;
        const cpX2 = prev.x + (point.x - prev.x) * 0.6;
        path += ` C ${cpX1},${prev.y - 2} ${cpX2},${point.y + 2} ${point.x},${point.y}`;
      }
    });
    const lastPoint = points[points.length - 1];
    path += ` C ${lastPoint.x + 5},${lastPoint.y - 3} ${98},${lastPoint.y - 8} 100,${lastPoint.y - 10}`;
    return path;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No entries to preview
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border p-6">
      {/* Growth Curve Graph */}
      <div className="relative h-32 mb-6">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="74"
            x2="100"
            y2="74"
            stroke={theme.gridLine}
            strokeWidth="0.1"
            opacity="0.3"
          />
          <line
            x1="0"
            y1="53"
            x2="100"
            y2="53"
            stroke={theme.gridLine}
            strokeWidth="0.1"
            opacity="0.3"
          />
          <motion.path
            d={generateCurvePath()}
            fill="none"
            stroke={theme.primary}
            strokeWidth="0.5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 2px ${theme.primary})` }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {entries.map((entry, i) => {
          const pos = getDotPosition(entry.dot_position, entries.length, i);
          return (
            <motion.button
              key={entry.id}
              className="absolute w-[18px] h-[18px] rounded-full"
              style={{
                left: pos.left,
                top: pos.top,
                marginLeft: -9,
                marginTop: -9,
                background:
                  expandedId === entry.id
                    ? theme.primary
                    : theme.progressInactive,
              }}
              animate={{ scale: expandedId === entry.id ? 1 : 0.667 }}
              onClick={() => setExpandedId(entry.id)}
            />
          );
        })}
      </div>

      {/* Timeline Bar */}
      <div className="flex h-12 rounded overflow-hidden mb-4">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            onClick={() => setExpandedId(entry.id)}
            className="flex-1 flex items-center justify-center font-mono text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
            style={{
              background: theme.segments[index % theme.segments.length],
              color: theme.segmentText[index % theme.segmentText.length],
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Phase Labels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setExpandedId(entry.id)}
            className={`text-center font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
              expandedId === entry.id
                ? ""
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{
              color: expandedId === entry.id ? theme.primary : undefined,
            }}
          >
            {entry.phase}
          </button>
        ))}
      </div>

      {/* Expanded Content */}
      <AnimatePresence mode="wait">
        {expandedId &&
          entries
            .filter((e) => e.id === expandedId)
            .map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 rounded border bg-card/50"
                style={{
                  borderColor: theme.primary,
                  boxShadow: `0 0 20px ${theme.glow}`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="font-mono text-lg font-bold"
                    style={{ color: theme.primary }}
                  >
                    {entry.label}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-foreground font-semibold">
                    {entry.phase}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {entry.content}
                </p>
              </motion.div>
            ))}
      </AnimatePresence>
    </div>
  );
};

const TimelinesTab = () => {
  const { supabase } = useAuthenticatedSupabase();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(
    null,
  );
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);

  // Timeline form state
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(
    null,
  );
  const [timelineForm, setTimelineForm] = useState({
    name: "",
    slug: "",
    description: "",
    chart_type: "growth" as TimelineChartType,
  });

  // Entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({
    label: "",
    phase: "",
    summary: "",
    content: "",
    dot_position: 50,
  });

  useEffect(() => {
    async function fetchTimelines() {
      try {
        const data = await getTimelines(supabase);
        setTimelines(data);
        if (data.length > 0) {
          setSelectedTimeline(data[0]);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchTimelines",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTimelines();
  }, [supabase]);

  useEffect(() => {
    async function fetchEntries() {
      if (!selectedTimeline) return;
      setIsLoadingEntries(true);
      try {
        const data = await getTimelineEntries(selectedTimeline.id, supabase);
        setEntries(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Profile.fetchTimelineEntries",
        });
      } finally {
        setIsLoadingEntries(false);
      }
    }
    fetchEntries();
  }, [selectedTimeline, supabase]);

  const resetTimelineForm = () => {
    setTimelineForm({
      name: "",
      slug: "",
      description: "",
      chart_type: "growth",
    });
    setEditingTimelineId(null);
    setIsAddingTimeline(false);
  };

  const resetEntryForm = () => {
    setEntryForm({
      label: "",
      phase: "",
      summary: "",
      content: "",
      dot_position: 50,
    });
    setEditingEntryId(null);
    setIsAddingEntry(false);
  };

  const handleSaveTimeline = async () => {
    setError(null);
    try {
      if (editingTimelineId) {
        const updated = await updateTimeline(
          editingTimelineId,
          timelineForm,
          supabase,
        );
        setTimelines(
          timelines.map((t) => (t.id === editingTimelineId ? updated : t)),
        );
        if (selectedTimeline?.id === editingTimelineId) {
          setSelectedTimeline(updated);
        }
      } else {
        const created = await createTimeline(
          { ...timelineForm, is_active: true, order_index: timelines.length },
          supabase,
        );
        setTimelines([...timelines, created]);
        setSelectedTimeline(created);
      }
      resetTimelineForm();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveTimeline",
      });
      setError("Failed to save timeline. Make sure you have permission.");
    }
  };

  const handleEditTimeline = (timeline: Timeline) => {
    setTimelineForm({
      name: timeline.name,
      slug: timeline.slug,
      description: timeline.description || "",
      chart_type: timeline.chart_type,
    });
    setEditingTimelineId(timeline.id);
    setIsAddingTimeline(true);
  };

  const handleDeleteTimeline = async (id: string) => {
    if (!confirm("Delete this timeline and all its entries?")) return;
    setError(null);
    try {
      await deleteTimeline(id, supabase);
      const remaining = timelines.filter((t) => t.id !== id);
      setTimelines(remaining);
      if (selectedTimeline?.id === id) {
        setSelectedTimeline(remaining[0] || null);
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.deleteTimeline",
      });
      setError("Failed to delete timeline. Make sure you have permission.");
    }
  };

  const handleSaveEntry = async () => {
    if (!selectedTimeline) return;
    setError(null);
    try {
      if (editingEntryId) {
        const updated = await updateTimelineEntry(
          editingEntryId,
          entryForm,
          supabase,
        );
        setEntries(entries.map((e) => (e.id === editingEntryId ? updated : e)));
      } else {
        const created = await createTimelineEntry(
          {
            ...entryForm,
            timeline_id: selectedTimeline.id,
            order_index: entries.length,
          },
          supabase,
        );
        setEntries([...entries, created]);
      }
      resetEntryForm();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.saveEntry",
      });
      setError("Failed to save entry. Make sure you have permission.");
    }
  };

  const handleEditEntry = (entry: TimelineEntry) => {
    setEntryForm({
      label: entry.label,
      phase: entry.phase,
      summary: entry.summary || "",
      content: entry.content || "",
      dot_position: entry.dot_position,
    });
    setEditingEntryId(entry.id);
    setIsAddingEntry(true);
  };

  const handleDeleteEntry = async (id: string) => {
    setError(null);
    try {
      await deleteTimelineEntry(id, supabase);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "Profile.deleteEntry",
      });
      setError("Failed to delete entry. Make sure you have permission.");
    }
  };

  const handleReorderEntry = async (
    index: number,
    direction: "up" | "down",
  ) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= entries.length) return;

    const newEntries = [...entries];
    [newEntries[index], newEntries[newIndex]] = [
      newEntries[newIndex],
      newEntries[index],
    ];
    setEntries(newEntries);

    await reorderTimelineEntries(
      newEntries.map((e) => e.id),
      supabase,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
        >
          {error}
        </motion.div>
      )}

      {/* Timeline Selector */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
        <span className="text-sm font-medium text-muted-foreground">
          Timeline:
        </span>
        <select
          value={selectedTimeline?.id || ""}
          onChange={(e) => {
            const t = timelines.find((t) => t.id === e.target.value);
            setSelectedTimeline(t || null);
          }}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground"
        >
          {timelines.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selectedTimeline && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditTimeline(selectedTimeline)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteTimeline(selectedTimeline.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingTimeline(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
        <div className="border-l border-border h-6 mx-2" />
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("edit")}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "edit" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === "preview" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Add/Edit Timeline Form */}
      {isAddingTimeline && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <Input
                value={timelineForm.name}
                onChange={(e) =>
                  setTimelineForm({ ...timelineForm, name: e.target.value })
                }
                placeholder="Provisioning Roadmap"
              />
            </Field>
            <Field label="Slug" description="URL-friendly identifier">
              <Input
                value={timelineForm.slug}
                onChange={(e) =>
                  setTimelineForm({ ...timelineForm, slug: e.target.value })
                }
                placeholder="provisioning-roadmap"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Description">
              <Input
                value={timelineForm.description}
                onChange={(e) =>
                  setTimelineForm({
                    ...timelineForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description..."
              />
            </Field>
            <Field label="Chart Type">
              <Select
                value={timelineForm.chart_type}
                onChange={(e) =>
                  setTimelineForm({
                    ...timelineForm,
                    chart_type: e.target.value as TimelineChartType,
                  })
                }
                options={chartTypeOptions}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetTimelineForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveTimeline}>
              {editingTimelineId ? "Update" : "Create"} Timeline
            </Button>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {viewMode === "preview" && selectedTimeline && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Live Preview
            </h3>
            <span className="text-sm text-muted-foreground">
              Exactly as it appears on the site
            </span>
          </div>
          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <TimelinePreview entries={entries} />
          )}
        </div>
      )}

      {/* Entries List (Edit Mode) */}
      {viewMode === "edit" && selectedTimeline && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Entries</h3>
            <span className="text-sm text-muted-foreground">
              {entries.length} entries
            </span>
          </div>

          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-4 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-primary font-bold">
                              {entry.label}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span className="font-medium text-foreground">
                              {entry.phase}
                            </span>
                          </div>
                          {entry.summary && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Position: {entry.dot_position}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReorderEntry(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReorderEntry(index, "down")}
                            disabled={index === entries.length - 1}
                            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="p-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Entry Form */}
          {isAddingEntry ? (
            <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Label" description="e.g., 2024, Q1, Phase 1">
                  <Input
                    value={entryForm.label}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, label: e.target.value })
                    }
                    placeholder="2024"
                  />
                </Field>
                <Field label="Phase" description="Short title">
                  <Input
                    value={entryForm.phase}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, phase: e.target.value })
                    }
                    placeholder="Automation & Knowledge"
                  />
                </Field>
              </div>
              <Field
                label="Summary"
                description="Brief description (shown under phase)"
              >
                <Input
                  value={entryForm.summary}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, summary: e.target.value })
                  }
                  placeholder="Key achievements or focus areas"
                />
              </Field>
              <Field
                label="Content"
                description="Full description (shown in expanded view)"
              >
                <Textarea
                  value={entryForm.content}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, content: e.target.value })
                  }
                  placeholder="Detailed description..."
                  rows={4}
                />
              </Field>
              <Field
                label={`Dot Position: ${entryForm.dot_position}%`}
                description="0 = bottom, 100 = top of chart"
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={entryForm.dot_position}
                  onChange={(e) =>
                    setEntryForm({
                      ...entryForm,
                      dot_position: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetEntryForm}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEntry}>
                  {editingEntryId ? "Update" : "Add"} Entry
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingEntry(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          )}
        </>
      )}

      {!selectedTimeline && timelines.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No timelines yet. Create one to get started.
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// RECOVERY TAB
// ============================================
const RecoveryTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
  >
    <RecoveryTracker embedded />
  </motion.div>
);

// ============================================
// MAIN PROFILE PAGE
// ============================================
const AdminProfile = () => {
  useSEO({
    title: "Profile | Admin",
    noIndex: true,
  });

  const [activeTab, setActiveTab] = useState<TabId>("hero");

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profile</h1>
              <p className="text-muted-foreground">
                Manage your personal information and content
              </p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-card border border-b-0 border-border text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "hero" && <HeroTab key="hero" />}
          {activeTab === "about" && <AboutTab key="about" />}
          {activeTab === "contact" && <ContactTab key="contact" />}
          {activeTab === "work-history" && (
            <WorkHistoryTab key="work-history" />
          )}
          {activeTab === "case-studies" && (
            <CaseStudiesTab key="case-studies" />
          )}
          {activeTab === "timelines" && <TimelinesTab key="timelines" />}
          {activeTab === "recovery" && <RecoveryTab key="recovery" />}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
