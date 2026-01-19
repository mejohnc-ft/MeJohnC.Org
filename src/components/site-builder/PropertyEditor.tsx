import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SiteBuilderPageComponent } from '@/lib/schemas';

export interface PropertyEditorProps {
  component: SiteBuilderPageComponent | null;
  onUpdate: (componentId: string, props: Record<string, unknown>) => void;
}

export function PropertyEditor({ component, onUpdate }: PropertyEditorProps) {
  const [props, setProps] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (component) {
      setProps(component.props);
    }
  }, [component]);

  if (!component) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-muted-foreground">
            Select a component to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (key: string, value: unknown) => {
    const newProps = { ...props, [key]: value };
    setProps(newProps);
  };

  const handleSave = () => {
    onUpdate(component.id, props);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold">
          {component.component_type.charAt(0).toUpperCase() + component.component_type.slice(1)} Properties
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {Object.entries(props).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-2">
                {formatLabel(key)}
              </label>
              {renderInput(key, value, handleChange)}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function renderInput(
  key: string,
  value: unknown,
  onChange: (key: string, value: unknown) => void
) {
  // Handle boolean values
  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(key, e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm">Enabled</span>
      </label>
    );
  }

  // Handle number values
  if (typeof value === 'number') {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
      />
    );
  }

  // Handle select/enum values
  if (
    key.includes('layout') ||
    key.includes('style') ||
    key.includes('alignment') ||
    key.includes('color')
  ) {
    const options = getOptionsForKey(key);
    if (options.length > 0) {
      return (
        <select
          value={String(value)}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
  }

  // Handle textarea for long text
  if (
    key.includes('content') ||
    key.includes('description') ||
    key.includes('headline')
  ) {
    return (
      <textarea
        value={String(value || '')}
        onChange={(e) => onChange(key, e.target.value)}
        rows={key.includes('content') ? 6 : 3}
        className="w-full px-3 py-2 bg-background border border-border rounded-md resize-none"
      />
    );
  }

  // Default to text input
  return (
    <Input
      type="text"
      value={String(value || '')}
      onChange={(e) => onChange(key, e.target.value)}
    />
  );
}

function getOptionsForKey(key: string): string[] {
  const optionsMap: Record<string, string[]> = {
    layout: ['centered', 'left', 'right', 'split', 'banner', 'grid', 'list', 'cards'],
    alignment: ['left', 'center', 'right'],
    textColor: ['light', 'dark'],
    backgroundColor: ['primary', 'secondary', 'accent', 'muted'],
    style: ['solid', 'dashed', 'dotted', 'gradient'],
    width: ['full', 'contained', 'narrow', 'prose'],
    maxWidth: ['full', 'prose', 'narrow'],
    aspectRatio: ['16/9', '4/3', '1/1', 'auto'],
    objectFit: ['cover', 'contain'],
    height: ['small', 'medium', 'large', 'xlarge'],
  };

  for (const [optionKey, options] of Object.entries(optionsMap)) {
    if (key.toLowerCase().includes(optionKey.toLowerCase())) {
      return options;
    }
  }

  return [];
}
