import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Search } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

const STORAGE_KEY = "desktop-notes";

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => notes[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist on change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const filteredNotes = search
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()),
      )
    : notes;

  const createNote = useCallback(() => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: "Untitled Note",
      content: "",
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setSearch("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        setSelectedId(notes.find((n) => n.id !== id)?.id ?? null);
      }
    },
    [selectedId, notes],
  );

  const updateNote = useCallback(
    (field: "title" | "content", value: string) => {
      if (!selectedId) return;
      setNotes((prev) =>
        prev
          .map((n) =>
            n.id === selectedId
              ? { ...n, [field]: value, updatedAt: Date.now() }
              : n,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    },
    [selectedId],
  );

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r border-border flex flex-col bg-card/50">
        <div className="p-2 border-b border-border flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted rounded border-none outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={createNote}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="New note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {search ? "No matching notes" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                  note.id === selectedId ? "bg-muted" : ""
                }`}
              >
                <div className="text-xs font-medium text-foreground truncate">
                  {note.title || "Untitled Note"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                  <span className="truncate max-w-[120px]">
                    {note.content.slice(0, 40) || "No content"}
                  </span>
                  <span className="shrink-0 ml-2">
                    {formatDate(note.updatedAt)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <input
                value={selectedNote.title}
                onChange={(e) => updateNote("title", e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-foreground"
                placeholder="Note title..."
              />
              <button
                onClick={() => deleteNote(selectedNote.id)}
                className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                aria-label="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={selectedNote.content}
              onChange={(e) => updateNote("content", e.target.value)}
              className="flex-1 p-4 text-sm bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground"
              placeholder="Start writing..."
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No note selected</p>
              <button
                onClick={createNote}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Create a new note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
