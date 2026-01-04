import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Types
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ContentVersion {
  id: string;
  table_name: string;
  record_id: string;
  version_number: number;
  data: Record<string, unknown>;
  change_summary: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

// Get audit logs for a specific record
export async function getAuditLogs(
  tableName: string,
  recordId: string,
  limit = 50,
  client: SupabaseClient = supabase
): Promise<AuditLog[]> {
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AuditLog[];
}

// Get all recent audit logs (for admin dashboard)
export async function getRecentAuditLogs(
  limit = 50,
  offset = 0,
  client: SupabaseClient = supabase
): Promise<AuditLog[]> {
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as AuditLog[];
}

// Get all versions of a specific record
export async function getContentVersions(
  tableName: string,
  recordId: string,
  client: SupabaseClient = supabase
): Promise<ContentVersion[]> {
  const { data, error } = await client
    .from('content_versions')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data as ContentVersion[];
}

// Get a specific version of a record
export async function getContentVersion(
  tableName: string,
  recordId: string,
  versionNumber: number,
  client: SupabaseClient = supabase
): Promise<ContentVersion | null> {
  const { data, error } = await client
    .from('content_versions')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .eq('version_number', versionNumber)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as ContentVersion | null;
}

// Compare two versions and get the differences
export function compareVersions(
  oldVersion: ContentVersion,
  newVersion: ContentVersion
): Record<string, { old: unknown; new: unknown }> {
  const differences: Record<string, { old: unknown; new: unknown }> = {};
  const oldData = oldVersion.data;
  const newData = newVersion.data;

  // Get all unique keys from both versions
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // Skip metadata fields
    if (['id', 'created_at', 'updated_at'].includes(key)) continue;

    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      differences[key] = { old: oldValue, new: newValue };
    }
  }

  return differences;
}

// Restore a previous version
export async function restoreVersion(
  tableName: string,
  recordId: string,
  versionNumber: number,
  client: SupabaseClient = supabase
): Promise<void> {
  // Get the version to restore
  const version = await getContentVersion(tableName, recordId, versionNumber, client);
  if (!version) {
    throw new Error(`Version ${versionNumber} not found`);
  }

  // Remove metadata that shouldn't be restored
  const dataToRestore = { ...version.data };
  delete dataToRestore.id;
  delete dataToRestore.created_at;
  delete dataToRestore.updated_at;

  // Update the record with the old version's data
  const { error } = await client
    .from(tableName)
    .update(dataToRestore)
    .eq('id', recordId);

  if (error) throw error;
}

// Format audit action for display
export function formatAuditAction(action: string): string {
  switch (action) {
    case 'create':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'delete':
      return 'Deleted';
    default:
      return action;
  }
}

// Format table name for display
export function formatTableName(tableName: string): string {
  switch (tableName) {
    case 'blog_posts':
      return 'Blog Post';
    case 'apps':
      return 'App';
    case 'projects':
      return 'Project';
    case 'app_suites':
      return 'App Suite';
    case 'site_content':
      return 'Site Content';
    default:
      return tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

// Get a human-readable summary of changes
export function getChangeSummary(auditLog: AuditLog): string {
  if (auditLog.action === 'create') {
    const title = auditLog.new_data?.title || auditLog.new_data?.name || 'item';
    return `Created "${title}"`;
  }

  if (auditLog.action === 'delete') {
    const title = auditLog.old_data?.title || auditLog.old_data?.name || 'item';
    return `Deleted "${title}"`;
  }

  // For updates, list changed fields
  if (auditLog.old_data && auditLog.new_data) {
    const changedFields: string[] = [];
    const skipFields = ['id', 'created_at', 'updated_at'];

    for (const key of Object.keys(auditLog.new_data)) {
      if (skipFields.includes(key)) continue;
      if (JSON.stringify(auditLog.old_data[key]) !== JSON.stringify(auditLog.new_data[key])) {
        changedFields.push(key.replace(/_/g, ' '));
      }
    }

    if (changedFields.length === 0) return 'No visible changes';
    if (changedFields.length === 1) return `Updated ${changedFields[0]}`;
    if (changedFields.length <= 3) return `Updated ${changedFields.join(', ')}`;
    return `Updated ${changedFields.length} fields`;
  }

  return 'Updated';
}
