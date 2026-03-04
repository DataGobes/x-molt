import { useState, useMemo, useCallback } from "react";
import type { DateHierarchy } from "../types.js";
import { getMonthName } from "../utils/format.js";

// --- Tree row types ---

export type TreeRowKind = "year" | "month" | "day";

export interface TreeRow {
  kind: TreeRowKind;
  key: string;
  depth: number;
  label: string;
  count?: number;
  expanded?: boolean;
}

export interface SelectedDay {
  year: number;
  month: number;
  day: number;
}

export interface UseDateTreeReturn {
  rows: TreeRow[];
  visibleRows: TreeRow[];
  cursorIndex: number;
  scrollOffset: number;
  selectedDay: SelectedDay | null;
  toggle: (key: string) => void;
  moveUp: () => void;
  moveDown: () => void;
}

// --- Flattening ---

function flattenHierarchy(
  hierarchy: DateHierarchy,
  expanded: Set<string>
): TreeRow[] {
  const rows: TreeRow[] = [];

  for (const year of hierarchy) {
    const yearKey = year.year;
    const yearExpanded = expanded.has(yearKey);
    rows.push({
      kind: "year",
      key: yearKey,
      depth: 0,
      label: `${year.year} (${year.count})`,
      count: year.count,
      expanded: yearExpanded,
    });

    if (!yearExpanded) continue;

    for (const month of year.months) {
      const monthKey = `${year.year}-${month.month}`;
      const monthExpanded = expanded.has(monthKey);
      rows.push({
        kind: "month",
        key: monthKey,
        depth: 1,
        label: `${getMonthName(month.month)} (${month.count})`,
        count: month.count,
        expanded: monthExpanded,
      });

      if (!monthExpanded) continue;

      for (const day of month.days) {
        const dayKey = `${year.year}-${month.month}-${day.day}`;
        rows.push({
          kind: "day",
          key: dayKey,
          depth: 2,
          label: `${day.day} (${day.count})`,
          count: day.count,
        });
      }
    }
  }

  return rows;
}

// --- Hook ---

export function useDateTree(
  hierarchy: DateHierarchy,
  viewportHeight: number
): UseDateTreeReturn {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [cursorIndex, setCursorIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const rows = useMemo(
    () => flattenHierarchy(hierarchy, expanded),
    [hierarchy, expanded]
  );

  const visibleRows = useMemo(
    () => rows.slice(scrollOffset, scrollOffset + viewportHeight),
    [rows, scrollOffset, viewportHeight]
  );

  const selectedDay = useMemo(() => {
    const row = rows[cursorIndex];
    if (!row || row.kind !== "day") return null;
    const parts = row.key.split("-");
    return {
      year: parseInt(parts[0]!, 10),
      month: parseInt(parts[1]!, 10),
      day: parseInt(parts[2]!, 10),
    };
  }, [rows, cursorIndex]);

  const adjustScroll = useCallback(
    (newCursor: number, totalRows: number) => {
      let newOffset = scrollOffset;
      if (newCursor < newOffset) {
        newOffset = newCursor;
      } else if (newCursor >= newOffset + viewportHeight) {
        newOffset = newCursor - viewportHeight + 1;
      }
      newOffset = Math.max(0, Math.min(newOffset, Math.max(0, totalRows - viewportHeight)));
      setScrollOffset(newOffset);
    },
    [scrollOffset, viewportHeight]
  );

  const toggle = useCallback(
    (key: string) => {
      const row = rows.find((r) => r.key === key);
      if (!row || row.kind === "day") return;

      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [rows]
  );

  const moveUp = useCallback(() => {
    setCursorIndex((prev) => {
      const next = Math.max(0, prev - 1);
      adjustScroll(next, rows.length);
      return next;
    });
  }, [adjustScroll, rows.length]);

  const moveDown = useCallback(() => {
    setCursorIndex((prev) => {
      const next = Math.min(rows.length - 1, prev + 1);
      adjustScroll(next, rows.length);
      return next;
    });
  }, [adjustScroll, rows.length]);

  return {
    rows,
    visibleRows,
    cursorIndex,
    scrollOffset,
    selectedDay,
    toggle,
    moveUp,
    moveDown,
  };
}
