import { z } from "zod";

// ============================================
// DEFAULT IDS (root folder UUIDs from migration seed)
// ============================================

export const ROOT_FOLDERS = {
  DESKTOP: "10000000-0000-0000-0000-000000000001",
  APPLICATIONS: "10000000-0000-0000-0000-000000000002",
  DOCUMENTS: "10000000-0000-0000-0000-000000000003",
  DOWNLOADS: "10000000-0000-0000-0000-000000000004",
  TRASH: "10000000-0000-0000-0000-000000000005",
} as const;

// ============================================
// FILESYSTEM NODE SCHEMAS
// ============================================

export const FileSystemNodeTypeSchema = z.enum([
  "folder",
  "file",
  "shortcut",
  "alias",
]);
export type FileSystemNodeType = z.infer<typeof FileSystemNodeTypeSchema>;

export const TargetTypeSchema = z.enum([
  "blog_post",
  "project",
  "agent",
  "workflow",
  "integration",
  "config",
  "storage_file",
  "app",
  "url",
  "contact",
  "task",
  "bookmark",
]);
export type TargetType = z.infer<typeof TargetTypeSchema>;

export const DesktopPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  gridCol: z.number().optional(),
  gridRow: z.number().optional(),
});
export type DesktopPosition = z.infer<typeof DesktopPositionSchema>;

export const FileSystemNodeSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  name: z.string(),
  type: FileSystemNodeTypeSchema,
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  position: DesktopPositionSchema.nullable(),
  owner_id: z.string().nullable(),
  tenant_id: z.string().uuid(),
  is_trashed: z.boolean(),
  trashed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type FileSystemNode = z.infer<typeof FileSystemNodeSchema>;

export type FileSystemNodeCreate = Omit<
  FileSystemNode,
  "id" | "created_at" | "updated_at" | "tenant_id" | "is_trashed" | "trashed_at"
>;

// ============================================
// WORKSPACE SCHEMAS
// ============================================

export const DesktopWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  owner_id: z.string().nullable(),
  tenant_id: z.string().uuid(),
  wallpaper: z.string().nullable(),
  dock_items: z
    .array(z.record(z.unknown()))
    .nullable()
    .transform((v) => v ?? []),
  desktop_layout: z
    .array(z.record(z.unknown()))
    .nullable()
    .transform((v) => v ?? []),
  window_states: z
    .union([z.array(z.record(z.unknown())), z.record(z.unknown())])
    .nullable()
    .transform((v) => v ?? []),
  preferences: z.record(z.unknown()).nullable(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DesktopWorkspace = z.infer<typeof DesktopWorkspaceSchema>;

// ============================================
// VIEW MODE
// ============================================

export type FileExplorerViewMode = "icons" | "list" | "columns";
