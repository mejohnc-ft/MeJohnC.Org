import { useMemo, useCallback, useRef, useEffect } from "react";
import { useWindowManagerContext, useWorkspaceContext } from "./WindowManager";
import { getApp, appRegistry, getAppsForTenant } from "./apps/AppRegistry";
import DockItem from "./DockItem";
import ContextMenu from "./ContextMenu";
import { useContextMenu, type ContextMenuItem } from "@/hooks/useContextMenu";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useBilling } from "@/hooks/useBilling";
import {
  registerDockIconPosition,
  unregisterDockIconPosition,
} from "@/lib/dock-icon-positions";
import { useTenant } from "@/lib/tenant";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MAGNIFICATION_RANGE = 120; // px
const MAX_SCALE = 1.545; // 44px * 1.545 ≈ 68px

export default function Dock() {
  const { state, launchApp, focusWindow, closeWindow } =
    useWindowManagerContext();
  const workspace = useWorkspaceContext();
  const contextMenu = useContextMenu();
  const prefersReducedMotion = useReducedMotion();
  const { plan } = useBilling();
  const { tenant } = useTenant();
  const enabledAppIds = (tenant?.settings as Record<string, unknown>)
    ?.enabled_apps as string[] | undefined;
  const planApps = useMemo(
    () => getAppsForTenant(plan, enabledAppIds),
    [plan, enabledAppIds],
  );
  const planAppIds = useMemo(
    () => new Set(planApps.map((a) => a.id)),
    [planApps],
  );
  const dockRef = useRef<HTMLDivElement>(null);
  const iconRefsMap = useRef(new Map<string, HTMLButtonElement>());
  const rafId = useRef(0);

  // Pinned apps from workspace (filtered by plan)
  const pinnedApps = useMemo(
    () =>
      workspace.dockItems
        .map((id) => getApp(id))
        .filter((a): a is NonNullable<typeof a> => !!a && planAppIds.has(a.id)),
    [workspace.dockItems, planAppIds],
  );
  const pinnedIds = useMemo(
    () => new Set(pinnedApps.map((a) => a.id)),
    [pinnedApps],
  );

  // Running apps that aren't pinned (running windows always show regardless of plan)
  const runningUnpinned = useMemo(() => {
    const runningIds = new Set(state.windows.map((w) => w.appId));
    return appRegistry.filter(
      (a) => runningIds.has(a.id) && !pinnedIds.has(a.id),
    );
  }, [state.windows, pinnedIds]);

  const runningAppIds = useMemo(
    () => new Set(state.windows.map((w) => w.appId)),
    [state.windows],
  );

  // All dock items in render order (for magnification)
  const allDockItems = useMemo(
    () => [...pinnedApps, ...runningUnpinned],
    [pinnedApps, runningUnpinned],
  );

  // Register icon refs for dock-icon-positions (used by minimize animation)
  const setIconRef = useCallback(
    (appId: string, el: HTMLButtonElement | null) => {
      if (el) {
        iconRefsMap.current.set(appId, el);
      } else {
        iconRefsMap.current.delete(appId);
      }
    },
    [],
  );

  // Update dock icon positions for minimize animation
  useEffect(() => {
    const refs = iconRefsMap.current;
    const updatePositions = () => {
      refs.forEach((el, appId) => {
        registerDockIconPosition(appId, el.getBoundingClientRect());
      });
    };
    updatePositions();
    window.addEventListener("resize", updatePositions);
    return () => {
      window.removeEventListener("resize", updatePositions);
      refs.forEach((_, appId) => unregisterDockIconPosition(appId));
    };
  }, [allDockItems]);

  // Magnification: rAF-driven, no React state
  const applyMagnification = useCallback(
    (mouseX: number) => {
      if (prefersReducedMotion) return;
      iconRefsMap.current.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const iconCenter = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - iconCenter);
        const iconInner = el.querySelector(
          ".dock-icon-inner",
        ) as HTMLElement | null;
        if (!iconInner) return;
        if (distance >= MAGNIFICATION_RANGE) {
          iconInner.style.transform = "scale(1)";
        } else {
          const normalized = distance / MAGNIFICATION_RANGE;
          const scale =
            1 + Math.exp(-2 * normalized * normalized) * (MAX_SCALE - 1);
          iconInner.style.transform = `scale(${scale})`;
        }
      });
    },
    [prefersReducedMotion],
  );

  const resetMagnification = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    iconRefsMap.current.forEach((el) => {
      const iconInner = el.querySelector(
        ".dock-icon-inner",
      ) as HTMLElement | null;
      if (iconInner) {
        iconInner.style.transform = "scale(1)";
      }
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() =>
        applyMagnification(e.clientX),
      );
    },
    [applyMagnification],
  );

  const handleMouseLeave = useCallback(() => {
    resetMagnification();
  }, [resetMagnification]);

  // App click
  const handleAppClick = useCallback(
    (appId: string) => {
      const existing = state.windows.find((w) => w.appId === appId);
      if (existing) {
        focusWindow(existing.id);
      } else {
        launchApp(appId);
      }
    },
    [state.windows, focusWindow, launchApp],
  );

  // Context menu
  const handleDockItemContextMenu = useCallback(
    (e: React.MouseEvent, appId: string) => {
      const isPinned = pinnedIds.has(appId);
      const isRunning = runningAppIds.has(appId);
      const items: ContextMenuItem[] = [
        { id: "open", label: "Open", onClick: () => handleAppClick(appId) },
      ];

      items.push({ id: "sep0", label: "", separator: true });

      if (isPinned) {
        items.push({
          id: "unpin",
          label: "Remove from Dock",
          onClick: () => workspace.unpinApp(appId),
        });
      } else {
        items.push({
          id: "pin",
          label: "Keep in Dock",
          onClick: () => workspace.pinApp(appId),
        });
      }

      if (isRunning) {
        items.push({ id: "sep1", label: "", separator: true });
        items.push({
          id: "quit",
          label: "Quit",
          danger: true,
          onClick: () => {
            // Close ALL windows with this appId
            state.windows
              .filter((w) => w.appId === appId)
              .forEach((w) => closeWindow(w.id));
          },
        });
      }

      contextMenu.openMenu(e, items);
    },
    [
      pinnedIds,
      runningAppIds,
      workspace,
      state.windows,
      contextMenu,
      handleAppClick,
      closeWindow,
    ],
  );

  // Drag-to-reorder pinned items
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = workspace.dockItems.indexOf(active.id as string);
      const newIndex = workspace.dockItems.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(workspace.dockItems, oldIndex, newIndex);
      workspace.reorderDockItems(reordered);
    },
    [workspace],
  );

  return (
    <>
      <div
        ref={dockRef}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 px-3 py-1.5 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl max-w-[calc(100vw-48px)] overflow-x-auto scrollbar-hide"
        style={{ zIndex: 40 }}
        role="toolbar"
        aria-label="Application dock"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Pinned apps — sortable */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={workspace.dockItems}
            strategy={horizontalListSortingStrategy}
          >
            {pinnedApps.map((app) => (
              <SortableDockItem
                key={app.id}
                app={app}
                isRunning={runningAppIds.has(app.id)}
                isFocused={
                  state.windows.find((w) => w.appId === app.id)?.id ===
                  state.focusedWindowId
                }
                onClick={() => handleAppClick(app.id)}
                onContextMenu={(e) => handleDockItemContextMenu(e, app.id)}
                setIconRef={setIconRef}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Separator */}
        {runningUnpinned.length > 0 && (
          <div className="w-px h-8 bg-border/50 mx-1" />
        )}

        {/* Running but not pinned — not sortable */}
        {runningUnpinned.map((app) => (
          <DockItem
            key={app.id}
            ref={(el) => setIconRef(app.id, el)}
            app={app}
            isRunning={true}
            isFocused={
              state.windows.find((w) => w.appId === app.id)?.id ===
              state.focusedWindowId
            }
            onClick={() => handleAppClick(app.id)}
            onContextMenu={(e) => handleDockItemContextMenu(e, app.id)}
          />
        ))}
      </div>

      {/* Dock Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          items={contextMenu.menuItems}
          position={contextMenu.position}
          onClose={contextMenu.closeMenu}
        />
      )}
    </>
  );
}

// Wrapper for sortable pinned dock items
import type { DesktopApp } from "./apps/AppRegistry";

interface SortableDockItemProps {
  app: DesktopApp;
  isRunning: boolean;
  isFocused: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  setIconRef: (appId: string, el: HTMLButtonElement | null) => void;
}

function SortableDockItem({
  app,
  isRunning,
  isFocused,
  onClick,
  onContextMenu,
  setIconRef,
}: SortableDockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Combine refs: dnd-kit ref + our icon position ref
  const combinedRef = useCallback(
    (el: HTMLButtonElement | null) => {
      setNodeRef(el);
      setIconRef(app.id, el);
    },
    [setNodeRef, setIconRef, app.id],
  );

  return (
    <div style={style} {...attributes} {...listeners}>
      <DockItem
        ref={combinedRef}
        app={app}
        isRunning={isRunning}
        isFocused={isFocused}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
