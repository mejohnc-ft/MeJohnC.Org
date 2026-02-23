import { useState, useEffect, useCallback } from "react";

const SUPPLEMENTS = {
  morning: [
    {
      id: "electrolytes",
      name: "Electrolyte Powder",
      icon: "⚡",
      desc: "24-32oz water",
      color: "#4FC3F7",
    },
    {
      id: "d3k2",
      name: "D3 5000 IU + K2",
      icon: "☀️",
      desc: "With fatty meal",
      color: "#FFD54F",
    },
    {
      id: "omega3",
      name: "Omega-3 Fish Oil",
      icon: "🐟",
      desc: "With fatty meal",
      color: "#4DD0E1",
    },
    {
      id: "garlic_am",
      name: "Kyolic Garlic (2 caps)",
      icon: "🧄",
      desc: "With breakfast",
      color: "#AED581",
    },
    {
      id: "chicory_am",
      name: "Chicory Root",
      icon: "🌿",
      desc: "1-2 caps with meal",
      color: "#81C784",
    },
    {
      id: "biotin",
      name: "Biotin 5000mcg",
      icon: "💊",
      desc: "Any time AM",
      color: "#CE93D8",
    },
  ],
  evening: [
    {
      id: "zinc",
      name: "Zinc Picolinate 30mg",
      icon: "🔩",
      desc: "With dinner, away from Mg",
      color: "#FFB74D",
    },
    {
      id: "garlic_pm",
      name: "Kyolic Garlic (2 caps)",
      icon: "🧄",
      desc: "With dinner",
      color: "#AED581",
    },
    {
      id: "chicory_pm",
      name: "Chicory Root",
      icon: "🌿",
      desc: "1-2 caps with dinner",
      color: "#81C784",
    },
  ],
  bedtime: [
    {
      id: "magnesium",
      name: "Magnesium Glycinate 400mg",
      icon: "🌙",
      desc: "30 min before sleep",
      color: "#7986CB",
    },
  ],
};

const SKIN_ROUTINE = {
  shampoo: [
    {
      id: "nizoral",
      name: "Nizoral (Ketoconazole)",
      icon: "🧴",
      days: [1, 4],
      color: "#EF5350",
    },
    {
      id: "zinc_shampoo",
      name: "Zinc Pyrithione Shampoo",
      icon: "🧴",
      days: [0, 2, 3, 5],
      color: "#42A5F5",
    },
  ],
  face: [
    {
      id: "sa_cleanser",
      name: "CeraVe SA Cleanser",
      icon: "🫧",
      desc: "AM & PM",
      color: "#26C6DA",
    },
    {
      id: "cerave_cream",
      name: "CeraVe Moisturizer",
      icon: "💧",
      desc: "While skin damp",
      color: "#5C6BC0",
    },
  ],
};

const MILESTONES = [
  { week: 2, label: "Scalp & face flaking improves", icon: "✨" },
  { week: 4, label: "Energy & morning clarity", icon: "🌅" },
  { week: 8, label: "Acne reduction begins", icon: "🔬" },
  { week: 12, label: "BLOODWORK — Get labs done", icon: "🩸" },
  { week: 16, label: "Hair assessment checkpoint", icon: "📊" },
  { week: 24, label: "Full recovery evaluation", icon: "🏁" },
];

const QUOTES = [
  "The coping mechanism became its own trauma. You saw it. Now you're fixing it.",
  "Every axis is recalibrating. Your body just needs time to catch up to where your mind already is.",
  "You caught this at 26. That's early enough to change everything.",
  "Consistency is the only variable left.",
  "Fix the inputs. Give it time.",
  "The hair, the skin, the flaking — it's all the same endocrine story. One system recovering.",
  "This isn't about supplements. It's about rebuilding infrastructure.",
  "Your endocrine system is in active recovery. Support it.",
];

function getDateKey(date) {
  return date.toISOString().split("T")[0];
}

function getDayOfWeek(date) {
  return date.getDay();
}

function getWeekNumber(startDate, currentDate) {
  const diffTime = currentDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function getStreakCount(logs) {
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

function getCompletionPct(dayLog, date) {
  if (!dayLog) return 0;
  const dow = getDayOfWeek(date);
  const allItems = [
    ...SUPPLEMENTS.morning,
    ...SUPPLEMENTS.evening,
    ...SUPPLEMENTS.bedtime,
    ...SKIN_ROUTINE.face,
  ];
  const shampooForDay = SKIN_ROUTINE.shampoo.find((s) => s.days.includes(dow));
  if (shampooForDay) allItems.push(shampooForDay);
  const total = allItems.length;
  if (total === 0) return 0;
  const done = allItems.filter((item) => dayLog[item.id] === true).length;
  return Math.round((done / total) * 100);
}

export default function RecoveryTracker() {
  const [logs, setLogs] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState({});
  const [quoteIdx] = useState(Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    async function load() {
      try {
        const logsRes = await window.storage.get("recovery_logs");
        if (logsRes) setLogs(JSON.parse(logsRes.value));
      } catch (e) {}
      try {
        const startRes = await window.storage.get("recovery_start");
        if (startRes) setStartDate(new Date(startRes.value));
      } catch (e) {}
      try {
        const notesRes = await window.storage.get("recovery_notes");
        if (notesRes) setNotes(JSON.parse(notesRes.value));
      } catch (e) {}
      setLoaded(true);
      setTimeout(() => setAnimateIn(true), 100);
    }
    load();
  }, []);

  useEffect(() => {
    const key = getDateKey(selectedDate);
    setNote(notes[key] || "");
  }, [selectedDate, notes]);

  const save = useCallback(
    async (newLogs, newNotes) => {
      try {
        await window.storage.set(
          "recovery_logs",
          JSON.stringify(newLogs || logs),
        );
        if (newNotes)
          await window.storage.set("recovery_notes", JSON.stringify(newNotes));
      } catch (e) {}
    },
    [logs],
  );

  const handleStart = async () => {
    const now = new Date();
    setStartDate(now);
    try {
      await window.storage.set("recovery_start", now.toISOString());
    } catch (e) {}
  };

  const toggleItem = async (itemId) => {
    const key = getDateKey(selectedDate);
    const dayLog = logs[key] || {};
    const updated = {
      ...logs,
      [key]: { ...dayLog, [itemId]: !dayLog[itemId] },
    };
    setLogs(updated);
    await save(updated);
  };

  const saveNote = async () => {
    const key = getDateKey(selectedDate);
    const updated = { ...notes, [key]: note };
    setNotes(updated);
    try {
      await window.storage.set("recovery_notes", JSON.stringify(updated));
    } catch (e) {}
  };

  if (!loaded) {
    return (
      <div style={styles.loadScreen}>
        <div style={styles.loadPulse}>◉</div>
        <p style={styles.loadText}>Initializing recovery protocol...</p>
      </div>
    );
  }

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
            Endocrine Recovery • Hair & Skin Restoration • Daily Tracking
          </p>
          <p style={styles.onboardQuote}>"{QUOTES[quoteIdx]}"</p>
          <button
            style={styles.startBtn}
            onClick={handleStart}
            onMouseEnter={(e) => {
              e.target.style.background = "#F9A825";
              e.target.style.color = "#1a1a2e";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#F9A825";
            }}
          >
            BEGIN PROTOCOL →
          </button>
        </div>
      </div>
    );
  }

  const todayKey = getDateKey(selectedDate);
  const dayLog = logs[todayKey] || {};
  const dow = getDayOfWeek(selectedDate);
  const streak = getStreakCount(logs);
  const weekNum = getWeekNumber(startDate, new Date());
  const completionPct = getCompletionPct(dayLog, selectedDate);
  const currentMilestone =
    MILESTONES.find((m) => m.week > weekNum) ||
    MILESTONES[MILESTONES.length - 1];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCheckItem = (item, section) => {
    const checked = dayLog[item.id] === true;
    return (
      <div
        key={item.id}
        onClick={() => toggleItem(item.id)}
        style={{
          ...styles.checkItem,
          background: checked ? `${item.color}15` : "rgba(255,255,255,0.02)",
          borderColor: checked ? `${item.color}60` : "rgba(255,255,255,0.06)",
          cursor: "pointer",
          transition: "all 0.25s ease",
        }}
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

  const navigateDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    if (d <= new Date()) setSelectedDate(d);
  };

  const isToday = getDateKey(selectedDate) === getDateKey(new Date());

  return (
    <div style={styles.app}>
      <div style={styles.grain} />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>◉</div>
          <div>
            <h1 style={styles.headerTitle}>RECOVERY PROTOCOL</h1>
            <p style={styles.headerWeek}>
              Week {weekNum + 1} • Day{" "}
              {Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1}
            </p>
          </div>
        </div>
        <div style={styles.streakBadge}>
          <span style={styles.streakFire}>🔥</span>
          <span style={styles.streakNum}>{streak}</span>
          <span style={styles.streakLabel}>day streak</span>
        </div>
      </header>

      <nav style={styles.nav}>
        {[
          { id: "today", label: "Daily Log" },
          { id: "timeline", label: "Timeline" },
          { id: "journal", label: "Journal" },
        ].map((tab) => (
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

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionDot("#FFD54F)")} />
              <h2 style={styles.sectionTitle}>MORNING</h2>
              <span style={styles.sectionTime}>with breakfast</span>
            </div>
            {SUPPLEMENTS.morning.map((s) => renderCheckItem(s, "morning"))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionDot("#FFB74D)")} />
              <h2 style={styles.sectionTitle}>EVENING</h2>
              <span style={styles.sectionTime}>with dinner</span>
            </div>
            {SUPPLEMENTS.evening.map((s) => renderCheckItem(s, "evening"))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionDot("#7986CB)")} />
              <h2 style={styles.sectionTitle}>BEDTIME</h2>
              <span style={styles.sectionTime}>30 min before sleep</span>
            </div>
            {SUPPLEMENTS.bedtime.map((s) => renderCheckItem(s, "bedtime"))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionDot("#EF5350)")} />
              <h2 style={styles.sectionTitle}>
                SCALP — {dayNames[dow].toUpperCase()}
              </h2>
              <span style={styles.sectionTime}>shower routine</span>
            </div>
            {SKIN_ROUTINE.shampoo
              .filter((s) => s.days.includes(dow))
              .map((s) => renderCheckItem(s, "shampoo"))}
            {SKIN_ROUTINE.shampoo.filter((s) => s.days.includes(dow)).length ===
              0 && (
              <div style={styles.restDay}>
                🚿 Water rinse only — rest day for scalp
              </div>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionDot("#26C6DA)")} />
              <h2 style={styles.sectionTitle}>FACE</h2>
              <span style={styles.sectionTime}>AM & PM</span>
            </div>
            {SKIN_ROUTINE.face.map((s) => renderCheckItem(s, "face"))}
          </div>

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
                const pct = getCompletionPct(logs[key], d);
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
                          { month: "short", day: "numeric" },
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
        <p style={styles.footerQuote}>"{QUOTES[quoteIdx]}"</p>
      </footer>
    </div>
  );
}

const styles = {
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
  loadScreen: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d0d1a",
    color: "#F9A825",
  },
  loadPulse: {
    fontSize: 48,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  loadText: {
    marginTop: 20,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
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
  sectionDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
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
    padding: "16px",
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
    padding: "20px",
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
};
