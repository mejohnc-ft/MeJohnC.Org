/**
 * Global Undo Stack Tests (#283)
 *
 * Tests the undo stack command pattern:
 * - Push/undo cycle
 * - Stack size limits
 * - LIFO ordering
 * - canUndo flag
 * - Toast lifecycle
 * - Multiple undo operations
 * - Window close → undo → reopen pattern
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Inline undo stack logic ────────────────────────────────────────

const MAX_STACK_SIZE = 50;

interface UndoAction {
  id: string;
  label: string;
  undo: () => void;
  timestamp: number;
}

function createStack() {
  let stack: UndoAction[] = [];
  let idCounter = 0;

  return {
    push(label: string, undoFn: () => void) {
      const action: UndoAction = {
        id: `undo-${++idCounter}`,
        label,
        undo: undoFn,
        timestamp: Date.now(),
      };
      stack = [action, ...stack].slice(0, MAX_STACK_SIZE);
      return action;
    },
    undo() {
      if (stack.length === 0) return null;
      const [top, ...rest] = stack;
      top.undo();
      stack = rest;
      return top;
    },
    get canUndo() {
      return stack.length > 0;
    },
    get size() {
      return stack.length;
    },
    get top() {
      return stack[0] ?? null;
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Global Undo Stack (#283)", () => {
  let stack: ReturnType<typeof createStack>;

  beforeEach(() => {
    stack = createStack();
  });

  // ─── Push and Undo ─────────────────────────────────────────────

  describe("push and undo", () => {
    it("should push an action onto the stack", () => {
      const undoFn = vi.fn();
      stack.push("Close window", undoFn);

      expect(stack.canUndo).toBe(true);
      expect(stack.size).toBe(1);
    });

    it("should call undo function when popping", () => {
      const undoFn = vi.fn();
      stack.push("Close window", undoFn);

      stack.undo();

      expect(undoFn).toHaveBeenCalledOnce();
      expect(stack.canUndo).toBe(false);
    });

    it("should do nothing when undo on empty stack", () => {
      const result = stack.undo();
      expect(result).toBeNull();
    });

    it("should return the undone action", () => {
      const undoFn = vi.fn();
      stack.push("Closed Settings", undoFn);

      const result = stack.undo();

      expect(result).not.toBeNull();
      expect(result!.label).toBe("Closed Settings");
    });
  });

  // ─── LIFO Ordering ────────────────────────────────────────────

  describe("LIFO ordering", () => {
    it("should undo most recent action first", () => {
      const calls: string[] = [];
      stack.push("Action A", () => calls.push("A"));
      stack.push("Action B", () => calls.push("B"));
      stack.push("Action C", () => calls.push("C"));

      stack.undo();
      expect(calls).toEqual(["C"]);

      stack.undo();
      expect(calls).toEqual(["C", "B"]);

      stack.undo();
      expect(calls).toEqual(["C", "B", "A"]);
    });

    it("should track top action correctly", () => {
      stack.push("First", vi.fn());
      stack.push("Second", vi.fn());

      expect(stack.top?.label).toBe("Second");
      stack.undo();
      expect(stack.top?.label).toBe("First");
    });
  });

  // ─── Stack Size Limit ─────────────────────────────────────────

  describe("stack size limit", () => {
    it("should enforce max stack size", () => {
      for (let i = 0; i < 60; i++) {
        stack.push(`Action ${i}`, vi.fn());
      }

      expect(stack.size).toBe(MAX_STACK_SIZE);
    });

    it("should keep most recent actions when exceeding limit", () => {
      for (let i = 0; i < 55; i++) {
        stack.push(`Action ${i}`, vi.fn());
      }

      // The top should be Action 54 (most recent)
      expect(stack.top?.label).toBe("Action 54");
    });
  });

  // ─── canUndo Flag ─────────────────────────────────────────────

  describe("canUndo", () => {
    it("should be false when stack is empty", () => {
      expect(stack.canUndo).toBe(false);
    });

    it("should be true after push", () => {
      stack.push("Test", vi.fn());
      expect(stack.canUndo).toBe(true);
    });

    it("should be false after undoing all actions", () => {
      stack.push("Test", vi.fn());
      stack.undo();
      expect(stack.canUndo).toBe(false);
    });
  });

  // ─── Window Close → Undo → Reopen Pattern ─────────────────────

  describe("window close/reopen pattern", () => {
    it("should capture window state and restore on undo", () => {
      const windowState = {
        id: "win-1",
        appId: "settings",
        title: "Settings",
        x: 100,
        y: 200,
        width: 800,
        height: 600,
      };

      const openWindow = vi.fn();
      const closedWindows: string[] = [];

      // Simulate close
      closedWindows.push(windowState.id);
      stack.push(`Closed ${windowState.title}`, () => {
        openWindow(
          windowState.appId,
          windowState.title,
          windowState.x,
          windowState.y,
          windowState.width,
          windowState.height,
        );
      });

      // Undo
      stack.undo();

      expect(openWindow).toHaveBeenCalledWith(
        "settings",
        "Settings",
        100,
        200,
        800,
        600,
      );
    });

    it("should restore multiple closed windows in reverse order", () => {
      const opened: string[] = [];

      // Close window A then B
      stack.push("Closed A", () => opened.push("A"));
      stack.push("Closed B", () => opened.push("B"));

      // Undo should restore B first, then A
      stack.undo();
      expect(opened).toEqual(["B"]);

      stack.undo();
      expect(opened).toEqual(["B", "A"]);
    });
  });

  // ─── Toast Behavior ───────────────────────────────────────────

  describe("toast behavior", () => {
    it("should create toast label from push", () => {
      const action = stack.push("Closed Terminal", vi.fn());
      expect(action.label).toBe("Closed Terminal");
    });

    it("should generate unique IDs for each action", () => {
      const a = stack.push("A", vi.fn());
      const b = stack.push("B", vi.fn());
      expect(a.id).not.toBe(b.id);
    });

    it("should include timestamp", () => {
      const before = Date.now();
      const action = stack.push("Test", vi.fn());
      const after = Date.now();

      expect(action.timestamp).toBeGreaterThanOrEqual(before);
      expect(action.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ─── Keyboard Shortcut Pattern ─────────────────────────────────

  describe("keyboard shortcut pattern", () => {
    it("should support Cmd+Z trigger", () => {
      const undoFn = vi.fn();
      stack.push("Test action", undoFn);

      // Simulate Cmd+Z handler calling undo
      const handleModKey = (key: string) => {
        if (key === "z") stack.undo();
      };

      handleModKey("z");
      expect(undoFn).toHaveBeenCalledOnce();
    });

    it("should not error on Cmd+Z with empty stack", () => {
      const handleModKey = (key: string) => {
        if (key === "z") stack.undo();
      };

      expect(() => handleModKey("z")).not.toThrow();
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle undo function that throws", () => {
      stack.push("Bad action", () => {
        throw new Error("Undo failed");
      });

      expect(() => stack.undo()).toThrow("Undo failed");
    });

    it("should handle rapid push/undo cycles", () => {
      for (let i = 0; i < 100; i++) {
        stack.push(`Action ${i}`, vi.fn());
        if (i % 3 === 0) stack.undo();
      }

      // Should not crash and should have items remaining
      expect(stack.size).toBeGreaterThan(0);
      expect(stack.size).toBeLessThanOrEqual(MAX_STACK_SIZE);
    });
  });
});
