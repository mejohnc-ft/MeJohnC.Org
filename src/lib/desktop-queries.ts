import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, supabase } from "./supabase";
import { parseResponse, parseArrayResponse } from "./schemas";
import {
  FileSystemNodeSchema,
  DesktopWorkspaceSchema,
  ROOT_FOLDERS,
  type FileSystemNode,
  type DesktopWorkspace,
} from "./desktop-schemas";

// ============================================
// FILESYSTEM QUERIES
// ============================================

/** Get children of a folder (excluding trashed items unless viewing Trash) */
export async function getFileSystemChildren(
  parentId: string | null,
  client: SupabaseClient = getSupabase(),
): Promise<FileSystemNode[]> {
  let query = client
    .from("desktop_filesystem")
    .select("*")
    .order("type") // folders first
    .order("name");

  if (parentId === ROOT_FOLDERS.TRASH) {
    // When viewing Trash, show all trashed items regardless of parent
    query = query.eq("is_trashed", true);
  } else if (parentId) {
    query = query.eq("parent_id", parentId).eq("is_trashed", false);
  } else {
    query = query.is("parent_id", null).eq("is_trashed", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return parseArrayResponse(
    FileSystemNodeSchema,
    data,
    "getFileSystemChildren",
  );
}

/** Get a single filesystem node by ID */
export async function getFileSystemNode(
  id: string,
  client: SupabaseClient = getSupabase(),
): Promise<FileSystemNode> {
  const { data, error } = await client
    .from("desktop_filesystem")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return parseResponse(FileSystemNodeSchema, data, "getFileSystemNode");
}

/** Create a new filesystem node */
export async function createFileSystemNode(
  node: {
    parent_id: string | null;
    name: string;
    type: string;
    target_type?: string | null;
    target_id?: string | null;
    icon?: string | null;
    color?: string | null;
    metadata?: Record<string, unknown> | null;
    position?: {
      x: number;
      y: number;
      gridCol?: number;
      gridRow?: number;
    } | null;
    owner_id?: string | null;
  },
  client: SupabaseClient | null = supabase,
): Promise<FileSystemNode> {
  const c = client ?? getSupabase();
  const { data, error } = await c
    .from("desktop_filesystem")
    .insert(node)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(FileSystemNodeSchema, data, "createFileSystemNode");
}

/** Move a node to a new parent folder */
export async function moveNode(
  id: string,
  newParentId: string | null,
  client: SupabaseClient | null = supabase,
): Promise<FileSystemNode> {
  const c = client ?? getSupabase();
  const { data, error } = await c
    .from("desktop_filesystem")
    .update({ parent_id: newParentId })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(FileSystemNodeSchema, data, "moveNode");
}

/** Rename a filesystem node */
export async function renameNode(
  id: string,
  newName: string,
  client: SupabaseClient | null = supabase,
): Promise<FileSystemNode> {
  const c = client ?? getSupabase();
  const { data, error } = await c
    .from("desktop_filesystem")
    .update({ name: newName })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(FileSystemNodeSchema, data, "renameNode");
}

/** Soft-delete: move to trash (recursive — cascades to all descendants) */
export async function moveToTrash(
  id: string,
  client: SupabaseClient | null = supabase,
): Promise<void> {
  const c = client ?? getSupabase();
  const { error } = await c.rpc("trash_node_recursive", { p_node_id: id });

  if (error) throw error;
}

/** Restore from trash (recursive — cascades to all descendants) */
export async function restoreFromTrash(
  id: string,
  client: SupabaseClient | null = supabase,
): Promise<void> {
  const c = client ?? getSupabase();
  const { error } = await c.rpc("restore_node_recursive", { p_node_id: id });

  if (error) throw error;
}

/** Permanently delete a node */
export async function permanentlyDelete(
  id: string,
  client: SupabaseClient | null = supabase,
): Promise<void> {
  const c = client ?? getSupabase();
  const { error } = await c.from("desktop_filesystem").delete().eq("id", id);

  if (error) throw error;
}

/** Empty trash: permanently delete all trashed items for a specific owner */
export async function emptyTrash(
  ownerId: string,
  client: SupabaseClient | null = supabase,
): Promise<void> {
  const c = client ?? getSupabase();
  const { error } = await c.rpc("empty_trash_for_owner", {
    p_owner_id: ownerId,
  });

  if (error) throw error;
}

/** Search filesystem by name (scoped to owner) */
export async function searchFileSystem(
  query: string,
  ownerId?: string,
  client: SupabaseClient = getSupabase(),
): Promise<FileSystemNode[]> {
  let q = client
    .from("desktop_filesystem")
    .select("*")
    .eq("is_trashed", false)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(50);

  if (ownerId) {
    q = q.eq("owner_id", ownerId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return parseArrayResponse(FileSystemNodeSchema, data, "searchFileSystem");
}

/** Build breadcrumb path by walking parent_id chain */
export async function getNodePath(
  nodeId: string,
  client: SupabaseClient = getSupabase(),
): Promise<FileSystemNode[]> {
  const path: FileSystemNode[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = await getFileSystemNode(currentId, client);
    path.unshift(node);
    currentId = node.parent_id;
  }

  return path;
}

/** Update a node's position (for desktop icon dragging) */
export async function updateNodePosition(
  id: string,
  position: { x: number; y: number; gridCol?: number; gridRow?: number },
  client: SupabaseClient | null = supabase,
): Promise<void> {
  const c = client ?? getSupabase();
  const { error } = await c
    .from("desktop_filesystem")
    .update({ position })
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// WORKSPACE QUERIES
// ============================================

/** Get the active workspace for the current user */
export async function getActiveWorkspace(
  ownerId: string,
  client: SupabaseClient = getSupabase(),
): Promise<DesktopWorkspace | null> {
  const { data, error } = await client
    .from("desktop_workspaces")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return parseResponse(DesktopWorkspaceSchema, data, "getActiveWorkspace");
}

/** Save/update a workspace */
export async function saveWorkspace(
  id: string,
  updates: Partial<
    Pick<
      DesktopWorkspace,
      | "wallpaper"
      | "dock_items"
      | "desktop_layout"
      | "window_states"
      | "preferences"
    >
  >,
  client: SupabaseClient | null = supabase,
): Promise<DesktopWorkspace> {
  const c = client ?? getSupabase();
  const { data, error } = await c
    .from("desktop_workspaces")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(DesktopWorkspaceSchema, data, "saveWorkspace");
}

/** Create a default workspace for a user */
export async function createDefaultWorkspace(
  ownerId: string,
  client: SupabaseClient | null = supabase,
): Promise<DesktopWorkspace> {
  const c = client ?? getSupabase();
  const { data, error } = await c
    .from("desktop_workspaces")
    .insert({
      name: "Default",
      owner_id: ownerId,
      is_active: true,
      is_default: true,
    })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(DesktopWorkspaceSchema, data, "createDefaultWorkspace");
}
