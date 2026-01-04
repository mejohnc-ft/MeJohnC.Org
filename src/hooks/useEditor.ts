import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

interface UseEditorOptions<T> {
  initialData: T;
  entityName: string;
  basePath: string;
  slugField?: keyof T;
  nameField: keyof T;
  fetchById: (id: string, supabase: ReturnType<typeof useSupabaseClient>) => Promise<T>;
  create: (data: T, supabase: ReturnType<typeof useSupabaseClient>) => Promise<T & { id: string }>;
  update: (id: string, data: T, supabase: ReturnType<typeof useSupabaseClient>) => Promise<void>;
}

export function useEditor<T extends Record<string, unknown>>({
  initialData,
  entityName,
  basePath,
  slugField = 'slug' as keyof T,
  nameField,
  fetchById,
  create,
  update,
}: UseEditorOptions<T>) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const supabase = useSupabaseClient();

  const [formData, setFormData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  // Fetch existing entity
  const fetchData = useCallback(async (entityId: string) => {
    try {
      const data = await fetchById(entityId, supabase);
      setFormData(data);
      setAutoSlug(false);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: `useEditor.fetch${entityName}`,
      });
      setError(`${entityName} not found`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, entityName, fetchById]);

  useEffect(() => {
    if (id) {
      fetchData(id);
    }
  }, [id, fetchData]);

  // Auto-generate slug from name field
  const nameValue = formData[nameField];
  useEffect(() => {
    if (autoSlug && nameValue) {
      setFormData((prev) => ({
        ...prev,
        [slugField]: generateSlug(String(nameValue)),
      }));
    }
  }, [nameValue, autoSlug, nameField, slugField]);

  // Update a field
  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === slugField) {
      setAutoSlug(false);
    }
  }, [slugField]);

  // Save handler
  const handleSave = useCallback(async (additionalData?: Partial<T>) => {
    const nameValue = formData[nameField];
    if (!nameValue || (typeof nameValue === 'string' && !nameValue.trim())) {
      setError(`${String(nameField)} is required`);
      return false;
    }

    setError(null);
    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        ...additionalData,
      } as T;

      if (isEditing && id) {
        await update(id, dataToSave, supabase);
      } else {
        const created = await create(dataToSave, supabase);
        navigate(`${basePath}/${created.id}/edit`, { replace: true });
      }

      if (additionalData) {
        setFormData((prev) => ({ ...prev, ...additionalData }));
      }

      return true;
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: `useEditor.save${entityName}`,
      });
      setError(`Failed to save ${entityName}. Make sure you have permission.`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData, nameField, isEditing, id, supabase, entityName, basePath, update, create, navigate]);

  // Refetch for version restore
  const refetch = useCallback(() => {
    if (id) {
      fetchData(id);
    }
  }, [id, fetchData]);

  return {
    id,
    isEditing,
    supabase,
    formData,
    setFormData,
    isLoading,
    isSaving,
    error,
    setError,
    autoSlug,
    setAutoSlug,
    updateField,
    handleSave,
    refetch,
    navigate,
  };
}
