import { useState, useEffect, useCallback, type CSSProperties } from "react";
import {
  DEFAULT_SECTIONS,
  MILESTONES,
  QUOTES,
  type TrackerItem,
  type TrackerSection,
} from "../lib/recovery-tracker-defaults";

// --- Storage keys ---
const STORAGE_KEYS = {
  logs: "recovery-tracker-logs",
  notes: "recovery-tracker-notes",
  start: "recovery-tracker-start",
  sections: "recovery-tracker-sections",
} as const;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

// --- Pure helpers ---
function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDayOfWeek(date: Date): number {
  return date.getDay();
}

function getWeekNumber(startDate: Date, currentDate: Date): number {
  const diffTime = currentDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function getStreakCount(logs: Record<string, Record<string, boolean>>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = getDateKey(checkDate);
    const dayLog = logs[key];
    if (dayLog && Object.values(dayLog).some((v) => v === true)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function getCompletionPct(
  dayLog: Record<string, boolean> | undefined,
  date: Date,
  sections: TrackerSection[],
): number {
  if (!dayLog) return 0;
  const dow = getDayOfWeek(date);
  const allItems: TrackerItem[] = [];
  for (const sec of sections) {
    if (sec.id === "shampoo") {
      const forDay = sec.items.filter((s) => s.days?.includes(dow));
      allItems.push(...forDay);
    } else {
      allItems.push(...sec.items);
    }
  }
  const total = allItems.length;
  if (total === 0) return 0;
  const done = allItems.filter((item) => dayLog[item.id] === true).length;
  return Math.round((done / total) * 100);
}

function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// --- Inline edit form ---
interface EditFormProps {
  item: TrackerItem;
  onSave: (item: TrackerItem) => void;
  onCancel: () => void;
}

function InlineEditForm({ item, onSave, onCancel }: EditFormProps) {
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.desc);
  const [icon, setIcon] = useState(item.icon);
  const [color, setColor] = useState(item.color);
  const [daysStr, setDaysStr] = useState(item.days ? item.days.join(",") : "");

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: TrackerItem = {
      ...item,
      name: name.trim(),
      desc: desc.trim(),
      icon: icon || "💊",
      color: color || "#999",
    };
    if (item.days !== undefined || daysStr.trim()) {
      const parsed = daysStr
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
      if (parsed.length > 0) updated.days = parsed;
    }
    onSave(updated);
  };

  return (
    <div style={styles.editForm}>
      <div style={styles.editRow}>
        <input
          style={styles.editInput}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Icon"
          maxLength={4}
        />
        <input
          style={{ ...styles.editInput, flex: 1 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
      </div>
      <input
        style={styles.editInput}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
      />
      <div style={styles.editRow}>
        <input
          style={styles.editInput}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#hex color"
        />
        {item.days !== undefined && (
          <input
            style={styles.editInput}
            value={daysStr}
            onChange={(e) => setDaysStr(e.target.value)}
            placeholder="Days (0=Sun..6=Sat)"
          />
        )}
      </div>
      <div style={styles.editActions}>
        <button style={styles.editSaveBtn} onClick={handleSave}>
          Save
        </button>
        <button style={styles.editCancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Main component ---
export default function RecoveryTracker() {
  const [sections, setSections] = useState<TrackerSection[]>(() =>
    readStorage(STORAGE_KEYS.sections, DEFAULT_SECTIONS),
  );
  const [logs, setLogs] = useState<Record<string, Record<string, boolean>>>(
    () => readStorage(STORAGE_KEYS.logs, {}),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    readStorage(STORAGE_KEYS.notes, {}),
  );
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.start);
    return raw ? new Date(JSON.parse(raw)) : null;
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"today" | "timeline" | "journal">("today");
  const [animateIn, setAnimateIn] = useState(false);
  const [note, setNote] = useState("");
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Sync note text when date changes
  useEffect(() => {
    const key = getDateKey(selectedDate);
    setNote(notes[key] || "");
  }, [selectedDate, notes]);

  // Persist sections
  const updateSections = useCallback((next: TrackerSection[]) => {
    setSections(next);
    writeStorage(STORAGE_KEYS.sections, next);
  }, []);

  // Toggle check
  const toggleItem = useCallback(
    (itemId: string) => {
      const key = getDateKey(selectedDate);
      const dayLog = logs[key] || {};
      const updated = {
        ...logs,
        [key]: { ...dayLog, [itemId]: !dayLog[itemId] },
      };
      setLogs(updated);
      writeStorage(STORAGE_KEYS.logs, updated);
    },
    [logs, selectedDate],
  );

  // Start protocol
  const handleStart = () => {
    const now = new Date();
    setStartDate(now);
    writeStorage(STORAGE_KEYS.start, now.toISOString());
  };

  // Save journal note
  const saveNote = useCallback(() => {
    const key = getDateKey(selectedDate);
    const updated = { ...notes, [key]: note };
    setNotes(updated);
    writeStorage(STORAGE_KEYS.notes, updated);
  }, [note, notes, selectedDate]);

  // --- Section CRUD ---
  const moveItem = (sectionId: string, itemIdx: number, direction: -1 | 1) => {
    const next = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const items = [...sec.items];
      const targetIdx = itemIdx + direction;
      if (targetIdx < 0 || targetIdx >= items.length) return sec;
      [items[itemIdx], items[targetIdx]] = [items[targetIdx], items[itemIdx]];
      return { ...sec, items };
    });
    updateSections(next);
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    if (!confirm("Delete this item?")) return;
    const next = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return { ...sec, items: sec.items.filter((i) => i.id !== itemId) };
    });
    updateSections(next);
  };

  const saveEditedItem = (sectionId: string, updated: TrackerItem) => {
    const next = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.map((i) => (i.id === updated.id ? updated : i)),
      };
    });
    updateSections(next);
    setEditingItemId(null);
  };

  const addItem = (sectionId: string, newItem: TrackerItem) => {
    const next = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return { ...sec, items: [...sec.items, newItem] };
    });
    updateSections(next);
    setAddingSectionId(null);
  };

  // --- Onboarding screen ---
  if (!startDate) {
    return (
      <div style={styles.onboard}>
        <div
          style={{
            ...styles.onboardCard,
            opacity: animateIn ? 1 : 0,
            transform: animateIn ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={styles.onboardIcon}>◉</div>
          <h1 style={styles.onboardTitle}>RECOVERY PROTOCOL</h1>
          <div style={styles.onboardDivider} />
          <p style={styles.onboardSub}>
            Endocrine Recovery &bull; Hair &amp; Skin Restoration &bull; Daily
            Tracking
          </p>
          <p style={styles.onboardQuote}>&ldquo;{QUOTES[quoteIdx]}&rdquo;</p>
          <button
            style={styles.startBtn}
            onClick={handleStart}
            onMouseEnter={(e) => {
              const t = e.currentTarget;
              t.style.background = "#F9A825";
              t.style.color = "#1a1a2e";
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.background = "transparent";
              t.style.color = "#F9A825";
            }}
          >
            BEGIN PROTOCOL →
          </button>
        </div>
      </div>
    );
  }

  // --- Main tracker view ---
  const todayKey = getDateKey(selectedDate);
  const dayLog = logs[todayKey] || {};
  const dow = getDayOfWeek(selectedDate);
  const streak = getStreakCount(logs);
  const weekNum = getWeekNumber(startDate, new Date());
  const completionPct = getCompletionPct(dayLog, selectedDate, sections);
  const currentMilestone =
    MILESTONES.find((m) => m.week > weekNum) ||
    MILESTONES[MILESTONES.length - 1];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCheckItem = (
    item: TrackerItem,
    sectionId: string,
    idx: number,
    total: number,
  ) => {
    const checked = dayLog[item.id] === true;

    if (editingItemId === item.id) {
      return (
        <InlineEditForm
          key={item.id}
          item={item}
          onSave={(updated) => saveEditedItem(sectionId, updated)}
          onCancel={() => setEditingItemId(null)}
        />
      );
    }

    return (
      <div
        key={item.id}
        style={{
          ...styles.checkItem,
          background: checked ? `${item.color}15` : "rgba(255,255,255,0.02)",
          borderColor: checked ? `${item.color}60` : "rgba(255,255,255,0.06)",
          cursor: editMode ? "default" : "pointer",
          transition: "all 0.25s ease",
        }}
        onClick={editMode ? undefined : () => toggleItem(item.id)}
      >
        <div
          style={{
            ...styles.checkBox,
            background: checked ? item.color : "transparent",
            borderColor: checked ? item.color : "rgba(255,255,255,0.2)",
          }}
        >
          {checked && <span style={{ fontSize: 14, color: "#1a1a2e" }}>✓</span>}
        </div>
        <div style={styles.checkContent}>
          <div style={styles.checkName}>
            <span style={{ marginRight: 8 }}>{item.icon}</span>
            <span
              style={{
                textDecoration: checked ? "line-through" : "none",
                opacity: checked ? 0.6 : 1,
              }}
            >
              {item.name}
            </span>
          </div>
          <div style={styles.checkDesc}>{item.desc}</div>
        </div>

        {editMode && (
          <div style={styles.itemActions}>
            <button
              style={styles.itemActionBtn}
              onClick={() => moveItem(sectionId, idx, -1)}
              disabled={idx === 0}
              title="Move up"
            >
              ↑
            </button>
            <button
              style={styles.itemActionBtn}
              onClick={() => moveItem(sectionId, idx, 1)}
              disabled={idx === total - 1}
              title="Move down"
            >
              ↓
            </button>
            <button
              style={styles.itemActionBtn}
              onClick={() => setEditingItemId(item.id)}
              title="Edit"
            >
              ✏️
            </button>
            <button
              style={{ ...styles.itemActionBtn, color: "#EF5350" }}
              onClick={() => deleteItem(sectionId, item.id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderProgressRing = () => {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ - (completionPct / 100) * circ;
    return (
      <svg
        width="140"
        height="140"
        style={{ filter: "drop-shadow(0 0 20px rgba(249,168,37,0.15))" }}
      >
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={completionPct === 100 ? "#66BB6A" : "#F9A825"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <text
          x="70"
          y="62"
          textAnchor="middle"
          fill={completionPct === 100 ? "#66BB6A" : "#F9A825"}
          fontSize="28"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
        >
          {completionPct}%
        </text>
        <text
          x="70"
          y="82"
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="10"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="2"
        >
          COMPLETE
        </text>
      </svg>
    );
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    if (d <= new Date()) setSelectedDate(d);
  };

  const isToday = getDateKey(selectedDate) === getDateKey(new Date());

  const renderSection = (sec: TrackerSection) => {
    const isShampoo = sec.id === "shampoo";
    const visibleItems = isShampoo
      ? sec.items.filter((s) => editMode || s.days?.includes(dow))
      : sec.items;
    const sectionLabel = isShampoo
      ? `${sec.label} — ${dayNames[dow].toUpperCase()}`
      : sec.label;

    return (
      <div key={sec.id} style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={sectionDot(sec.dotColor)} />
          <h2 style={styles.sectionTitle}>{sectionLabel}</h2>
          <span style={styles.sectionTime}>{sec.time}</span>
        </div>
        {visibleItems.map((item, idx) =>
          renderCheckItem(item, sec.id, idx, visibleItems.length),
        )}
        {isShampoo && visibleItems.length === 0 && !editMode && (
          <div style={styles.restDay}>
            🚿 Water rinse only — rest day for scalp
          </div>
        )}
        {editMode && addingSectionId === sec.id && (
          <InlineEditForm
            item={{
              id: generateId(),
              name: "",
              desc: "",
              icon: "💊",
              color: sec.dotColor,
              ...(isShampoo ? { days: [] } : {}),
            }}
            onSave={(newItem) => addItem(sec.id, newItem)}
            onCancel={() => setAddingSectionId(null)}
          />
        )}
        {editMode && addingSectionId !== sec.id && (
          <button
            style={styles.addItemBtn}
            onClick={() => {
              setAddingSectionId(sec.id);
              setEditingItemId(null);
            }}
          >
            + Add Item
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <div style={styles.grain} />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>◉</div>
          <div>
            <h1 style={styles.headerTitle}>RECOVERY PROTOCOL</h1>
            <p style={styles.headerWeek}>
              Week {weekNum + 1} &bull; Day{" "}
              {Math.floor(
                (new Date().getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ) + 1}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view === "today" && (
            <button
              style={{
                ...styles.editToggleBtn,
                ...(editMode ? styles.editToggleBtnActive : {}),
              }}
              onClick={() => {
                setEditMode(!editMode);
                setEditingItemId(null);
                setAddingSectionId(null);
              }}
            >
              {editMode ? "Done" : "Edit"}
            </button>
          )}
          <div style={styles.streakBadge}>
            <span style={styles.streakFire}>🔥</span>
            <span style={styles.streakNum}>{streak}</span>
            <span style={styles.streakLabel}>day streak</span>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        {(
          [
            { id: "today", label: "Daily Log" },
            { id: "timeline", label: "Timeline" },
            { id: "journal", label: "Journal" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              ...styles.navBtn,
              ...(view === tab.id ? styles.navBtnActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {view === "today" && (
        <div style={styles.content}>
          <div style={styles.dateNav}>
            <button style={styles.dateArrow} onClick={() => navigateDate(-1)}>
              ←
            </button>
            <div style={styles.dateCenter}>
              <span style={styles.dateLabel}>
                {isToday
                  ? "Today"
                  : selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
              </span>
              <span style={styles.dateValue}>
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <button
              style={{ ...styles.dateArrow, opacity: isToday ? 0.2 : 1 }}
              onClick={() => !isToday && navigateDate(1)}
              disabled={isToday}
            >
              →
            </button>
          </div>

          <div style={styles.ringRow}>
            {renderProgressRing()}
            <div style={styles.ringStats}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{streak}</span>
                <span style={styles.statLabel}>Streak</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>Wk {weekNum + 1}</span>
                <span style={styles.statLabel}>Progress</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{currentMilestone.icon}</span>
                <span style={styles.statLabel}>
                  Next: Wk {currentMilestone.week}
                </span>
              </div>
            </div>
          </div>

          {sections.map((sec) => renderSection(sec))}

          {completionPct === 100 && (
            <div style={styles.completeBanner}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <span style={styles.completeText}>
                Protocol complete for{" "}
                {isToday ? "today" : selectedDate.toLocaleDateString()}. Every
                axis thanks you.
              </span>
            </div>
          )}
        </div>
      )}

      {view === "timeline" && (
        <div style={styles.content}>
          <h2 style={styles.timelineTitle}>RECOVERY MILESTONES</h2>
          <p style={styles.timelineSub}>Currently in Week {weekNum + 1}</p>

          <div style={styles.milestoneTrack}>
            {MILESTONES.map((m, i) => {
              const reached = weekNum >= m.week;
              const current =
                weekNum >= (MILESTONES[i - 1]?.week || 0) && weekNum < m.week;
              return (
                <div key={m.week} style={styles.milestoneItem}>
                  <div style={styles.milestoneLine}>
                    <div
                      style={{
                        ...styles.milestoneDot,
                        background: reached
                          ? "#66BB6A"
                          : current
                            ? "#F9A825"
                            : "rgba(255,255,255,0.1)",
                        boxShadow: current
                          ? "0 0 15px rgba(249,168,37,0.4)"
                          : reached
                            ? "0 0 10px rgba(102,187,106,0.3)"
                            : "none",
                      }}
                    >
                      {reached ? "✓" : m.icon}
                    </div>
                    {i < MILESTONES.length - 1 && (
                      <div
                        style={{
                          ...styles.milestoneConnector,
                          background: reached
                            ? "rgba(102,187,106,0.3)"
                            : "rgba(255,255,255,0.06)",
                        }}
                      />
                    )}
                  </div>
                  <div style={styles.milestoneContent}>
                    <span
                      style={{
                        ...styles.milestoneWeek,
                        color: current
                          ? "#F9A825"
                          : reached
                            ? "#66BB6A"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      WEEK {m.week}
                    </span>
                    <span
                      style={{
                        ...styles.milestoneLabel,
                        color:
                          reached || current
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {m.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.calGrid}>
            <h3 style={styles.calTitle}>LAST 28 DAYS</h3>
            <div style={styles.calRow}>
              {Array.from({ length: 28 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (27 - i));
                const key = getDateKey(d);
                const pct = getCompletionPct(logs[key], d, sections);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedDate(d);
                      setView("today");
                    }}
                    title={`${d.toLocaleDateString()} — ${pct}%`}
                    style={{
                      ...styles.calCell,
                      background:
                        pct === 0
                          ? "rgba(255,255,255,0.03)"
                          : pct === 100
                            ? "rgba(102,187,106,0.6)"
                            : pct >= 50
                              ? "rgba(249,168,37,0.4)"
                              : "rgba(249,168,37,0.15)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={styles.calLegend}>
              <span style={styles.calLegItem}>
                <span
                  style={{
                    ...styles.calLegDot,
                    background: "rgba(255,255,255,0.03)",
                  }}
                />
                0%
              </span>
              <span style={styles.calLegItem}>
                <span
                  style={{
                    ...styles.calLegDot,
                    background: "rgba(249,168,37,0.15)",
                  }}
                />
                &lt;50%
              </span>
              <span style={styles.calLegItem}>
                <span
                  style={{
                    ...styles.calLegDot,
                    background: "rgba(249,168,37,0.4)",
                  }}
                />
                50%+
              </span>
              <span style={styles.calLegItem}>
                <span
                  style={{
                    ...styles.calLegDot,
                    background: "rgba(102,187,106,0.6)",
                  }}
                />
                100%
              </span>
            </div>
          </div>
        </div>
      )}

      {view === "journal" && (
        <div style={styles.content}>
          <h2 style={styles.timelineTitle}>RECOVERY JOURNAL</h2>
          <p style={styles.timelineSub}>
            Track symptoms, energy, mood, and observations
          </p>

          <div style={styles.journalDate}>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder={
              "How are you feeling today?\n\nTrack: energy levels, sleep quality, skin changes, hair observations, mood, cravings, acne status, scalp condition..."
            }
            style={styles.journalInput}
          />

          <button onClick={saveNote} style={styles.saveNoteBtn}>
            Save Entry
          </button>

          <div style={styles.journalHistory}>
            <h3 style={styles.journalHistTitle}>RECENT ENTRIES</h3>
            {Object.entries(notes)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 10)
              .map(
                ([dateKey, text]) =>
                  text && (
                    <div key={dateKey} style={styles.journalEntry}>
                      <div style={styles.journalEntryDate}>
                        {new Date(dateKey + "T12:00:00").toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </div>
                      <div style={styles.journalEntryText}>{text}</div>
                    </div>
                  ),
              )}
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <p style={styles.footerQuote}>&ldquo;{QUOTES[quoteIdx]}&rdquo;</p>
      </footer>
    </div>
  );
}

// --- Styles ---

function sectionDot(color: string): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  };
}

const styles: Record<string, CSSProperties> = {
  app: {
    minHeight: "100vh",
    background:
      "linear-gradient(170deg, #0d0d1a 0%, #1a1a2e 40%, #16213e 100%)",
    color: "#e0e0e0",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    position: "relative",
    maxWidth: 520,
    margin: "0 auto",
    paddingBottom: 80,
  },
  grain: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
    zIndex: 0,
  },
  onboard: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(170deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)",
    padding: 20,
  },
  onboardCard: {
    textAlign: "center",
    maxWidth: 400,
    padding: 40,
  },
  onboardIcon: {
    fontSize: 56,
    color: "#F9A825",
    marginBottom: 24,
    textShadow: "0 0 40px rgba(249,168,37,0.3)",
  },
  onboardTitle: {
    fontSize: 28,
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700,
    letterSpacing: 6,
    color: "#fff",
    margin: 0,
  },
  onboardDivider: {
    width: 60,
    height: 1,
    background: "linear-gradient(90deg, transparent, #F9A825, transparent)",
    margin: "20px auto",
  },
  onboardSub: {
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    marginBottom: 30,
  },
  onboardQuote: {
    fontSize: 14,
    fontStyle: "italic",
    color: "rgba(249,168,37,0.7)",
    lineHeight: 1.6,
    marginBottom: 40,
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  startBtn: {
    background: "transparent",
    border: "1px solid #F9A825",
    color: "#F9A825",
    padding: "14px 36px",
    fontSize: 13,
    letterSpacing: 4,
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.3s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 20px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    fontSize: 24,
    color: "#F9A825",
    textShadow: "0 0 20px rgba(249,168,37,0.3)",
  },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 4,
    margin: 0,
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
  },
  headerWeek: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
    margin: 0,
    marginTop: 2,
  },
  streakBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(249,168,37,0.08)",
    border: "1px solid rgba(249,168,37,0.15)",
    borderRadius: 20,
    padding: "6px 14px",
  },
  streakFire: { fontSize: 14 },
  streakNum: {
    fontSize: 18,
    fontWeight: 700,
    color: "#F9A825",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  streakLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 1,
    marginLeft: 2,
  },
  nav: {
    display: "flex",
    gap: 0,
    padding: "0 20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 1,
  },
  navBtn: {
    flex: 1,
    padding: "14px 0",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    textTransform: "uppercase",
    transition: "all 0.2s",
  },
  navBtnActive: {
    color: "#F9A825",
    borderBottomColor: "#F9A825",
  },
  content: {
    padding: "0 20px",
    position: "relative",
    zIndex: 1,
  },
  dateNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 0 10px",
  },
  dateArrow: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
    width: 36,
    height: 36,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  dateCenter: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  dateLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#F9A825",
  },
  dateValue: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  ringRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    padding: "20px 0 10px",
  },
  ringStats: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 3,
    margin: 0,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
  },
  sectionTime: {
    fontSize: 9,
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1,
    marginLeft: "auto",
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    marginBottom: 6,
    userSelect: "none",
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: "2px solid rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },
  checkContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  checkName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  checkDesc: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },
  restDay: {
    padding: 16,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    border: "1px dashed rgba(255,255,255,0.06)",
  },
  completeBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    background: "rgba(102,187,106,0.08)",
    border: "1px solid rgba(102,187,106,0.2)",
    borderRadius: 12,
    marginTop: 24,
  },
  completeText: {
    fontSize: 12,
    color: "#66BB6A",
    lineHeight: 1.5,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 700,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.85)",
    marginTop: 28,
    marginBottom: 4,
  },
  timelineSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 0,
    marginBottom: 28,
  },
  milestoneTrack: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  milestoneItem: {
    display: "flex",
    gap: 16,
  },
  milestoneLine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 40,
  },
  milestoneDot: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
    color: "#fff",
    transition: "all 0.3s",
  },
  milestoneConnector: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  milestoneContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingBottom: 20,
    paddingTop: 6,
  },
  milestoneWeek: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: 700,
  },
  milestoneLabel: {
    fontSize: 13,
  },
  calGrid: {
    marginTop: 36,
    padding: 20,
    background: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.05)",
  },
  calTitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
    margin: "0 0 12px 0",
  },
  calRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4,
  },
  calCell: {
    aspectRatio: "1",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  calLegend: {
    display: "flex",
    gap: 12,
    marginTop: 12,
    justifyContent: "center",
  },
  calLegItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
  },
  calLegDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    display: "inline-block",
  },
  journalDate: {
    fontSize: 13,
    color: "#F9A825",
    letterSpacing: 1,
    marginBottom: 16,
  },
  journalInput: {
    width: "100%",
    minHeight: 180,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.7,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  saveNoteBtn: {
    marginTop: 12,
    padding: "10px 24px",
    background: "rgba(249,168,37,0.1)",
    border: "1px solid rgba(249,168,37,0.25)",
    color: "#F9A825",
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', monospace",
  },
  journalHistory: {
    marginTop: 32,
  },
  journalHistTitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.3)",
    margin: "0 0 16px 0",
  },
  journalEntry: {
    display: "flex",
    gap: 14,
    padding: "14px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  journalEntryDate: {
    fontSize: 11,
    color: "#F9A825",
    fontWeight: 600,
    minWidth: 50,
    flexShrink: 0,
  },
  journalEntryText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  footer: {
    padding: "30px 20px 40px",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  footerQuote: {
    fontSize: 11,
    fontStyle: "italic",
    color: "rgba(249,168,37,0.3)",
    fontFamily: "'Playfair Display', Georgia, serif",
    lineHeight: 1.6,
  },

  // Edit mode styles
  editToggleBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.5)",
    padding: "6px 14px",
    fontSize: 10,
    letterSpacing: 1,
    cursor: "pointer",
    borderRadius: 16,
    fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.2s",
  },
  editToggleBtnActive: {
    background: "rgba(249,168,37,0.15)",
    borderColor: "rgba(249,168,37,0.3)",
    color: "#F9A825",
  },
  itemActions: {
    display: "flex",
    gap: 4,
    marginLeft: "auto",
    flexShrink: 0,
  },
  itemActionBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.5)",
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  addItemBtn: {
    width: "100%",
    padding: "10px 0",
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    letterSpacing: 1,
    cursor: "pointer",
    borderRadius: 8,
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 4,
    transition: "all 0.2s",
  },
  editForm: {
    padding: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(249,168,37,0.2)",
    borderRadius: 10,
    marginBottom: 6,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  editRow: {
    display: "flex",
    gap: 8,
  },
  editInput: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: "8px 10px",
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  editActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  editSaveBtn: {
    background: "rgba(102,187,106,0.15)",
    border: "1px solid rgba(102,187,106,0.3)",
    color: "#66BB6A",
    padding: "6px 16px",
    fontSize: 11,
    cursor: "pointer",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1,
  },
  editCancelBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.4)",
    padding: "6px 16px",
    fontSize: 11,
    cursor: "pointer",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1,
  },
};
