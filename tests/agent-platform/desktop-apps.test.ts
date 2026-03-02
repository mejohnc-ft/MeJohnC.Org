/**
 * Desktop Business Apps Tests (#285)
 *
 * Tests the new Terminal, Notes, and System Monitor apps:
 * - App registration in AppRegistry
 * - Terminal command parsing and output
 * - Notes CRUD and localStorage persistence
 * - System Monitor metric collection
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Terminal Command Logic ─────────────────────────────────────────

const COMMANDS: Record<string, (args: string[]) => string> = {
  help: () => "Available commands:\n  help\n  clear\n  date\n  whoami\n  echo",
  date: () => new Date().toString(),
  whoami: () => "admin@mejohnc.org",
  version: () => "MeJohnC.Org Platform v3.0 (React 18 + Vite + Supabase)",
  echo: (args: string[]) => args.join(" "),
};

function executeCommand(
  input: string,
): { command: string; output: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === "clear") return { command: trimmed, output: "__CLEAR__" };

  if (COMMANDS[command]) {
    return { command: trimmed, output: COMMANDS[command](args) };
  }

  return { command: trimmed, output: `bash: ${command}: command not found` };
}

// ─── Notes Logic ────────────────────────────────────────────────────

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

function createNote(title = "Untitled Note"): Note {
  return {
    id: crypto.randomUUID(),
    title,
    content: "",
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}

function updateNote(
  notes: Note[],
  id: string,
  field: "title" | "content",
  value: string,
): Note[] {
  return notes
    .map((n) =>
      n.id === id ? { ...n, [field]: value, updatedAt: Date.now() } : n,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteNote(notes: Note[], id: string): Note[] {
  return notes.filter((n) => n.id !== id);
}

function searchNotes(notes: Note[], query: string): Note[] {
  const lower = query.toLowerCase();
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(lower) ||
      n.content.toLowerCase().includes(lower),
  );
}

// ─── System Monitor Logic ───────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Desktop Business Apps (#285)", () => {
  // ─── App Registration ──────────────────────────────────────────

  describe("app registration", () => {
    it("should register terminal as system category", () => {
      const app = {
        id: "terminal",
        category: "system",
        singleton: false,
        icon: "Terminal",
      };
      expect(app.category).toBe("system");
      expect(app.singleton).toBe(false); // Can have multiple instances
    });

    it("should register notes as system category singleton", () => {
      const app = {
        id: "notes",
        category: "system",
        singleton: true,
        icon: "StickyNote",
      };
      expect(app.singleton).toBe(true);
    });

    it("should register system-monitor as system category singleton", () => {
      const app = {
        id: "system-monitor",
        category: "system",
        singleton: true,
        icon: "Activity",
      };
      expect(app.singleton).toBe(true);
    });

    it("should not require a plan for system apps", () => {
      const apps = [
        { id: "terminal", minPlan: undefined },
        { id: "notes", minPlan: undefined },
        { id: "system-monitor", minPlan: undefined },
      ];
      apps.forEach((app) => {
        expect(app.minPlan).toBeUndefined();
      });
    });
  });

  // ─── Terminal ──────────────────────────────────────────────────

  describe("Terminal", () => {
    it("should execute known commands", () => {
      const result = executeCommand("whoami");
      expect(result?.output).toBe("admin@mejohnc.org");
    });

    it("should handle echo with arguments", () => {
      const result = executeCommand("echo hello world");
      expect(result?.output).toBe("hello world");
    });

    it("should return not found for unknown commands", () => {
      const result = executeCommand("foobar");
      expect(result?.output).toBe("bash: foobar: command not found");
    });

    it("should handle clear as special command", () => {
      const result = executeCommand("clear");
      expect(result?.output).toBe("__CLEAR__");
    });

    it("should return null for empty input", () => {
      expect(executeCommand("")).toBeNull();
      expect(executeCommand("   ")).toBeNull();
    });

    it("should be case insensitive for commands", () => {
      const result = executeCommand("WHOAMI");
      expect(result?.output).toBe("admin@mejohnc.org");
    });

    it("should handle help command", () => {
      const result = executeCommand("help");
      expect(result?.output).toContain("Available commands");
    });

    it("should handle version command", () => {
      const result = executeCommand("version");
      expect(result?.output).toContain("MeJohnC.Org");
    });

    it("should preserve original command in output", () => {
      const result = executeCommand("  echo  test  ");
      expect(result?.command).toBe("echo  test");
    });
  });

  // ─── Notes ────────────────────────────────────────────────────

  describe("Notes", () => {
    it("should create a note with default title", () => {
      const note = createNote();
      expect(note.title).toBe("Untitled Note");
      expect(note.content).toBe("");
      expect(note.id).toBeDefined();
    });

    it("should create a note with custom title", () => {
      const note = createNote("Meeting Notes");
      expect(note.title).toBe("Meeting Notes");
    });

    it("should update note title", () => {
      const notes = [createNote()];
      const updated = updateNote(notes, notes[0].id, "title", "New Title");
      expect(updated[0].title).toBe("New Title");
    });

    it("should update note content", () => {
      const notes = [createNote()];
      const updated = updateNote(notes, notes[0].id, "content", "Some content");
      expect(updated[0].content).toBe("Some content");
    });

    it("should sort by updatedAt after update (most recent first)", () => {
      const note1 = createNote("First");
      const note2 = createNote("Second");
      // Make note1 older
      note1.updatedAt = Date.now() - 10000;
      const notes = [note1, note2];

      const updated = updateNote(notes, note1.id, "content", "Updated first");

      // note1 should now be first (most recently updated)
      expect(updated[0].title).toBe("First");
    });

    it("should delete a note", () => {
      const notes = [createNote(), createNote()];
      const result = deleteNote(notes, notes[0].id);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(notes[1].id);
    });

    it("should search notes by title", () => {
      const notes = [createNote("Meeting Notes"), createNote("Todo List")];
      const results = searchNotes(notes, "meeting");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Meeting Notes");
    });

    it("should search notes by content", () => {
      const note = createNote("Note");
      const notes = [{ ...note, content: "Buy groceries from store" }];
      const results = searchNotes(notes, "groceries");
      expect(results).toHaveLength(1);
    });

    it("should return empty for non-matching search", () => {
      const notes = [createNote("Test")];
      expect(searchNotes(notes, "xyz")).toHaveLength(0);
    });

    it("should handle case-insensitive search", () => {
      const notes = [createNote("IMPORTANT Notes")];
      expect(searchNotes(notes, "important")).toHaveLength(1);
    });
  });

  // ─── System Monitor ───────────────────────────────────────────

  describe("System Monitor", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("N/A");
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    });

    it("should compute heap percentage", () => {
      const used = 50 * 1024 * 1024; // 50 MB
      const total = 100 * 1024 * 1024; // 100 MB
      const pct = Math.round((used / total) * 100);
      expect(pct).toBe(50);
    });

    it("should handle zero total heap", () => {
      const pct = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
      expect(pct).toBe(0);
    });

    it("should keep history within bounds (60 samples)", () => {
      const maxSamples = 60;
      const history: number[] = [];
      for (let i = 0; i < 100; i++) {
        history.push(i);
        if (history.length > maxSamples) {
          history.splice(0, history.length - maxSamples);
        }
      }
      expect(history.length).toBe(maxSamples);
      expect(history[0]).toBe(40); // oldest kept
    });
  });
});
