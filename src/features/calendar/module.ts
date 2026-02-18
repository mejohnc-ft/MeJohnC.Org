import type { FeatureModule } from "@/features/types";

export const calendarModule: FeatureModule = {
  name: "calendar",
  version: "1.0.0",
  prefix: "calendar",

  frontendRoutes: [
    {
      path: "/admin/calendar",
      component: () => import("./pages/CalendarPage"),
      title: "Calendar",
      icon: "calendar",
      showInNav: true,
      permissions: ["calendar:read"],
    },
  ],

  migrations: {
    prefix: "calendar",
    tables: ["calendar_events"],
    directory: "./migrations",
  },

  services: {},

  async initialize() {
    console.log("[CalendarModule] Initializing calendar feature");
  },

  async shutdown() {
    console.log("[CalendarModule] Shutting down calendar feature");
  },
};
