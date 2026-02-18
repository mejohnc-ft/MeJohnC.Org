/**
 * DealForm Component
 *
 * Form for creating and editing deals
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantSupabase } from "@/lib/supabase";
import { getContacts } from "@/lib/crm-queries";
import { getPipelines, getPipelineStages } from "@/lib/crm-queries";
import type { Contact, Pipeline, PipelineStage, Deal } from "../schemas";

interface DealFormData {
  name: string;
  value: string;
  currency: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  close_date: string;
  probability: string;
  notes: string;
}

interface DealFormProps {
  initialData?: Partial<Deal>;
  onSubmit: (
    data: Omit<
      Deal,
      "id" | "created_at" | "updated_at" | "closed_at" | "expected_revenue"
    >,
  ) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function DealForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: DealFormProps) {
  const { supabase, tenantId } = useTenantSupabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<DealFormData>({
    name: initialData?.name ?? "",
    value: initialData?.value?.toString() ?? "",
    currency: initialData?.currency ?? "USD",
    contact_id: initialData?.contact_id ?? "",
    pipeline_id: initialData?.pipeline_id ?? "",
    stage_id: initialData?.stage_id ?? "",
    close_date: initialData?.close_date
      ? new Date(initialData.close_date).toISOString().split("T")[0]
      : "",
    probability: initialData?.probability?.toString() ?? "",
    notes: initialData?.notes ?? "",
  });

  const loadOptions = useCallback(async () => {
    if (!supabase) return;
    const [contactsData, pipelinesData] = await Promise.all([
      getContacts({ limit: 200 }, supabase),
      getPipelines(supabase),
    ]);
    setContacts(contactsData);
    setPipelines(pipelinesData);

    // Select default pipeline
    const defaultPipeline =
      pipelinesData.find((p) => p.is_default) ?? pipelinesData[0];
    if (defaultPipeline && !formData.pipeline_id) {
      setFormData((prev) => ({ ...prev, pipeline_id: defaultPipeline.id }));
      const stagesData = await getPipelineStages(defaultPipeline.id, supabase);
      setStages(stagesData);
      if (stagesData.length > 0 && !formData.stage_id) {
        setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
      }
    } else if (formData.pipeline_id) {
      const stagesData = await getPipelineStages(
        formData.pipeline_id,
        supabase,
      );
      setStages(stagesData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handlePipelineChange = useCallback(
    async (pipelineId: string) => {
      if (!supabase) return;
      setFormData((prev) => ({
        ...prev,
        pipeline_id: pipelineId,
        stage_id: "",
      }));
      const stagesData = await getPipelineStages(pipelineId, supabase);
      setStages(stagesData);
      if (stagesData.length > 0) {
        setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
      }
    },
    [supabase],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        name: formData.name,
        value: formData.value ? parseFloat(formData.value) : null,
        currency: formData.currency,
        contact_id: formData.contact_id || null,
        pipeline_id: formData.pipeline_id,
        stage_id: formData.stage_id,
        status: initialData?.status ?? "open",
        close_date: formData.close_date
          ? new Date(formData.close_date).toISOString()
          : null,
        probability: formData.probability
          ? parseInt(formData.probability, 10)
          : null,
        notes: formData.notes || null,
        lost_reason: initialData?.lost_reason ?? null,
        tenant_id: initialData?.tenant_id ?? tenantId!,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-background border border-border rounded-lg text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Deal Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Enterprise License — Acme Corp"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Value</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
            className={inputCls}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Contact</label>
        <select
          value={formData.contact_id}
          onChange={(e) =>
            setFormData({ ...formData, contact_id: e.target.value })
          }
          className={inputCls}
        >
          <option value="">No contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                c.email ||
                c.id}
              {c.company ? ` (${c.company})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Pipeline *</label>
          <select
            required
            value={formData.pipeline_id}
            onChange={(e) => handlePipelineChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Select pipeline</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Stage *</label>
          <select
            required
            value={formData.stage_id}
            onChange={(e) =>
              setFormData({ ...formData, stage_id: e.target.value })
            }
            className={inputCls}
          >
            <option value="">Select stage</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">
            Expected Close Date
          </label>
          <input
            type="date"
            value={formData.close_date}
            onChange={(e) =>
              setFormData({ ...formData, close_date: e.target.value })
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">
            Probability (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={(e) =>
              setFormData({ ...formData, probability: e.target.value })
            }
            placeholder="0-100"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className={inputCls}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isEditing ? "Update Deal" : "Create Deal"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
