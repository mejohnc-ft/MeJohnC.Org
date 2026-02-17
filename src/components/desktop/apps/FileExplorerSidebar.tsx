import {
  Monitor, FileText, Download, AppWindow, HardDrive, Trash2,
} from 'lucide-react';
import { ROOT_FOLDERS } from '@/lib/desktop-schemas';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FAVORITES: SidebarItem[] = [
  { id: ROOT_FOLDERS.DESKTOP, label: 'Desktop', icon: Monitor },
  { id: ROOT_FOLDERS.DOCUMENTS, label: 'Documents', icon: FileText },
  { id: ROOT_FOLDERS.DOWNLOADS, label: 'Downloads', icon: Download },
];

const LOCATIONS: SidebarItem[] = [
  { id: '__root__', label: 'Root', icon: HardDrive },
  { id: ROOT_FOLDERS.APPLICATIONS, label: 'Applications', icon: AppWindow },
];

interface FileExplorerSidebarProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  trashCount?: number;
}

export default function FileExplorerSidebar({
  currentFolderId,
  onNavigate,
  trashCount = 0,
}: FileExplorerSidebarProps) {
  const renderSection = (title: string, items: SidebarItem[]) => (
    <div className="mb-4">
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {title}
      </div>
      {items.map(item => {
        const isActive = item.id === '__root__'
          ? currentFolderId === null
          : currentFolderId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id === '__root__' ? null : item.id)}
            className={`
              w-full flex items-center gap-2 px-3 py-1 text-xs transition-colors
              ${isActive
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-foreground/80 hover:bg-muted'
              }
            `}
          >
            <item.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const isTrashActive = currentFolderId === ROOT_FOLDERS.TRASH;

  return (
    <div className="w-[180px] shrink-0 border-r border-border bg-card/30 overflow-y-auto py-2">
      {renderSection('Favorites', FAVORITES)}
      {renderSection('Locations', LOCATIONS)}

      {/* Trash */}
      <div className="mb-4">
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Trash
        </div>
        <button
          onClick={() => onNavigate(ROOT_FOLDERS.TRASH)}
          className={`
            w-full flex items-center gap-2 px-3 py-1 text-xs transition-colors
            ${isTrashActive
              ? 'bg-primary/15 text-primary font-medium'
              : 'text-foreground/80 hover:bg-muted'
            }
          `}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Trash</span>
          {trashCount > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">
              {trashCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
