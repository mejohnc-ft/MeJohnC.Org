export interface TrackerItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
  days?: number[];
}

export interface TrackerSection {
  id: string;
  label: string;
  time: string;
  dotColor: string;
  items: TrackerItem[];
}

export const MILESTONES = [
  { week: 2, label: "Scalp & face flaking improves", icon: "✨" },
  { week: 4, label: "Energy & morning clarity", icon: "🌅" },
  { week: 8, label: "Acne reduction begins", icon: "🔬" },
  { week: 12, label: "BLOODWORK — Get labs done", icon: "🩸" },
  { week: 16, label: "Hair assessment checkpoint", icon: "📊" },
  { week: 24, label: "Full recovery evaluation", icon: "🏁" },
];

export const QUOTES = [
  "The coping mechanism became its own trauma. You saw it. Now you're fixing it.",
  "Every axis is recalibrating. Your body just needs time to catch up to where your mind already is.",
  "You caught this at 26. That's early enough to change everything.",
  "Consistency is the only variable left.",
  "Fix the inputs. Give it time.",
  "The hair, the skin, the flaking — it's all the same endocrine story. One system recovering.",
  "This isn't about supplements. It's about rebuilding infrastructure.",
  "Your endocrine system is in active recovery. Support it.",
];

export const DEFAULT_SECTIONS: TrackerSection[] = [
  {
    id: "morning",
    label: "MORNING",
    time: "with breakfast",
    dotColor: "#FFD54F",
    items: [
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
  },
  {
    id: "evening",
    label: "EVENING",
    time: "with dinner",
    dotColor: "#FFB74D",
    items: [
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
  },
  {
    id: "bedtime",
    label: "BEDTIME",
    time: "30 min before sleep",
    dotColor: "#7986CB",
    items: [
      {
        id: "magnesium",
        name: "Magnesium Glycinate 400mg",
        icon: "🌙",
        desc: "30 min before sleep",
        color: "#7986CB",
      },
    ],
  },
  {
    id: "shampoo",
    label: "SCALP",
    time: "shower routine",
    dotColor: "#EF5350",
    items: [
      {
        id: "nizoral",
        name: "Nizoral (Ketoconazole)",
        icon: "🧴",
        desc: "Shampoo",
        color: "#EF5350",
        days: [1, 4],
      },
      {
        id: "zinc_shampoo",
        name: "Zinc Pyrithione Shampoo",
        icon: "🧴",
        desc: "Shampoo",
        color: "#42A5F5",
        days: [0, 2, 3, 5],
      },
    ],
  },
  {
    id: "face",
    label: "FACE",
    time: "AM & PM",
    dotColor: "#26C6DA",
    items: [
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
  },
];
