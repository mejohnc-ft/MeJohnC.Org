import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { getIntegrations, getIntegrationActions } from '@/lib/agent-platform-queries';
import type { Integration, IntegrationAction } from '@/lib/schemas';

interface IntegrationActionFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function IntegrationActionForm({
  config,
  onChange,
  disabled,
}: IntegrationActionFormProps) {
  const { supabase } = useAuthenticatedSupabase();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [actions, setActions] = useState<IntegrationAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<IntegrationAction | null>(null);

  useEffect(() => {
    if (!supabase) return;
    getIntegrations(supabase).then(setIntegrations);
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !config.integration_id) return;
    getIntegrationActions(config.integration_id as string, supabase).then((data) => {
      setActions(data);
      const current = data.find((a) => a.action_name === config.action_name);
      setSelectedAction(current || null);
    });
  }, [supabase, config.integration_id]);

  const handleIntegrationChange = (integrationId: string) => {
    onChange({
      ...config,
      integration_id: integrationId,
      action_name: '',
      parameters: {},
    });
    setSelectedAction(null);
  };

  const handleActionChange = (actionName: string) => {
    const action = actions.find((a) => a.action_name === actionName);
    setSelectedAction(action || null);
    onChange({
      ...config,
      action_name: actionName,
      parameters: action?.default_config || {},
    });
  };

  const handleParamChange = (key: string, value: unknown) => {
    const params = (config.parameters || {}) as Record<string, unknown>;
    onChange({
      ...config,
      parameters: { ...params, [key]: value },
    });
  };

  const params = (config.parameters || {}) as Record<string, unknown>;
  const schema = selectedAction?.parameter_schema as Record<string, unknown> | undefined;
  const properties = (schema?.properties || {}) as Record<
    string,
    { type?: string; enum?: string[]; description?: string }
  >;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Integration</label>
        <select
          value={(config.integration_id as string) || ''}
          onChange={(e) => handleIntegrationChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
        >
          <option value="">Select integration...</option>
          {integrations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.display_name}
            </option>
          ))}
        </select>
      </div>

      {config.integration_id && (
        <div>
          <label className="block text-xs font-medium mb-1">Action</label>
          <select
            value={(config.action_name as string) || ''}
            onChange={(e) => handleActionChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          >
            <option value="">Select action...</option>
            {actions.map((a) => (
              <option key={a.action_name} value={a.action_name}>
                {a.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedAction && Object.keys(properties).length > 0 && (
        <div className="space-y-2 border border-border rounded-md p-3 bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground">Parameters</span>
          {Object.entries(properties).map(([key, prop]) => {
            if (prop.enum) {
              return (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1">{key}</label>
                  <select
                    value={String(params[key] ?? '')}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="">Select...</option>
                    {prop.enum.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (prop.type === 'boolean') {
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(params[key])}
                    onChange={(e) => handleParamChange(key, e.target.checked)}
                    disabled={disabled}
                    className="rounded border-border"
                  />
                  <label className="text-xs font-medium">{key}</label>
                </div>
              );
            }

            if (prop.type === 'number') {
              return (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1">{key}</label>
                  <Input
                    type="number"
                    value={String(params[key] ?? '')}
                    onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                    disabled={disabled}
                    placeholder={prop.description}
                    className="text-sm"
                  />
                </div>
              );
            }

            // Default: string input
            return (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">{key}</label>
                <Input
                  value={String(params[key] ?? '')}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  disabled={disabled}
                  placeholder={prop.description || key}
                  className="text-sm"
                />
              </div>
            );
          })}
        </div>
      )}

      {selectedAction && Object.keys(properties).length === 0 && (
        <div>
          <label className="block text-xs font-medium mb-1">Parameters (JSON)</label>
          <textarea
            value={JSON.stringify(params, null, 2)}
            onChange={(e) => {
              try {
                onChange({ ...config, parameters: JSON.parse(e.target.value) });
              } catch {
                // Allow invalid JSON while typing
              }
            }}
            disabled={disabled}
            rows={4}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono resize-none"
          />
        </div>
      )}
    </div>
  );
}
