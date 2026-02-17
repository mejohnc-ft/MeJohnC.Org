import { useState, useCallback } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  menuItems: ContextMenuItem[];
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    menuItems: [],
  });

  const openMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      menuItems: items,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    openMenu,
    closeMenu,
  };
}
