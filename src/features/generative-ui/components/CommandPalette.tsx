/**
 * CommandPalette Component
 *
 * CentrexStyle grouped command interface.
 * Interactive command palette with hover effects.
 */

'use client';

import { cn } from '@/lib/utils';
import type { CommandPaletteProps } from '../schemas';

// Map icon names to FontAwesome classes
function getIconClass(iconName: string): string {
  // Handle common icon mappings
  const iconMap: Record<string, string> = {
    rocket: 'fa-solid fa-rocket',
    gear: 'fa-solid fa-gear',
    settings: 'fa-solid fa-gear',
    code: 'fa-solid fa-code',
    terminal: 'fa-solid fa-terminal',
    database: 'fa-solid fa-database',
    chart: 'fa-solid fa-chart-line',
    users: 'fa-solid fa-users',
    shield: 'fa-solid fa-shield',
    cloud: 'fa-solid fa-cloud',
    file: 'fa-solid fa-file',
    folder: 'fa-solid fa-folder',
    search: 'fa-solid fa-search',
    plus: 'fa-solid fa-plus',
    trash: 'fa-solid fa-trash',
    edit: 'fa-solid fa-pen',
    save: 'fa-solid fa-floppy-disk',
    download: 'fa-solid fa-download',
    upload: 'fa-solid fa-upload',
    refresh: 'fa-solid fa-rotate',
    link: 'fa-solid fa-link',
    eye: 'fa-solid fa-eye',
    lock: 'fa-solid fa-lock',
    unlock: 'fa-solid fa-unlock',
    bell: 'fa-solid fa-bell',
    star: 'fa-solid fa-star',
    heart: 'fa-solid fa-heart',
    check: 'fa-solid fa-check',
    times: 'fa-solid fa-times',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info',
    home: 'fa-solid fa-house',
    cog: 'fa-solid fa-cog',
  };

  return iconMap[iconName.toLowerCase()] || `fa-solid fa-${iconName}`;
}

export function CommandPalette({ groups }: CommandPaletteProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl mx-auto">
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="bg-[#121212] border border-[#262626] rounded-xl p-6"
        >
          {/* Group Header */}
          <div className="flex items-center gap-2 mb-4 text-[#e5e5e5] font-bold">
            <i className={cn(getIconClass(group.icon), 'text-[#3dae2b]')} />
            <span>{group.title}</span>
          </div>

          {/* Commands */}
          <div className="flex flex-col gap-2">
            {group.commands.map((cmd, cmdIndex) => (
              <div
                key={cmdIndex}
                className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#262626] rounded-lg cursor-pointer transition-all hover:border-[#3dae2b] hover:bg-[#262626] hover:translate-x-1"
              >
                <code className="text-[#3dae2b] font-mono text-sm font-semibold">
                  {cmd.code}
                </code>
                <span className="text-[#a3a3a3] text-sm">{cmd.description}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommandPalette;
