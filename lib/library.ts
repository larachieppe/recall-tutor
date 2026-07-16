import type { GenerateConfig } from "./types";
import type { MasteryMap } from "./mastery";

/** A past input (source the user studied), stored so it can be re-run. */
export interface HistoryItem {
  id: string;
  title: string;
  source: string;
  config: GenerateConfig;
  createdAt: number;
  lastScorePct?: number;
}

export interface Group {
  id: string;
  name: string;
  itemIds: string[]; // ordered
}

export interface Library {
  items: Record<string, HistoryItem>;
  groups: Group[]; // ordered
  /** Per-concept learner model + spaced-repetition schedule. */
  mastery?: MasteryMap;
}

const KEY = "recall.library.v1";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const empty = (): Library => ({ items: {}, groups: [] });

export function loadLibrary(): Library {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Library;
  } catch {
    /* ignore */
  }
  return empty();
}

/** Write to localStorage without notifying the sync layer. */
export function saveLibraryRaw(lib: Library): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(lib));
}

/** Save locally and notify the cloud-sync layer (if signed in) to push. */
export function saveLibrary(lib: Library): void {
  if (typeof window === "undefined") return;
  saveLibraryRaw(lib);
  window.dispatchEvent(new Event("recall:lib-local"));
}

/** Guarantee at least one group exists so there is always a drop target. */
export function ensureDefaultGroup(lib: Library): Library {
  if (lib.groups.length > 0) return lib;
  return { ...lib, groups: [{ id: uid(), name: "My sources", itemIds: [] }] };
}

/**
 * Add an item, or update the existing one with identical source text (so
 * re-studying the same source doesn't create duplicates). New items land at the
 * top of the first group.
 */
export function upsertItem(
  lib: Library,
  input: { title: string; source: string; config: GenerateConfig },
): { lib: Library; id: string } {
  const base = ensureDefaultGroup(lib);
  const existing = Object.values(base.items).find(
    (it) => it.source === input.source,
  );
  if (existing) {
    const items = {
      ...base.items,
      [existing.id]: {
        ...existing,
        title: input.title,
        config: input.config,
        createdAt: Date.now(),
      },
    };
    return { lib: { ...base, items }, id: existing.id };
  }
  const id = uid();
  const item: HistoryItem = { id, ...input, createdAt: Date.now() };
  const groups = base.groups.map((g, i) =>
    i === 0 ? { ...g, itemIds: [id, ...g.itemIds] } : g,
  );
  return { lib: { ...base, items: { ...base.items, [id]: item }, groups }, id };
}

export function setItemScore(
  lib: Library,
  id: string,
  pct: number,
): Library {
  const it = lib.items[id];
  if (!it) return lib;
  return { ...lib, items: { ...lib.items, [id]: { ...it, lastScorePct: pct } } };
}

export function deleteItem(lib: Library, itemId: string): Library {
  const items = { ...lib.items };
  delete items[itemId];
  const groups = lib.groups.map((g) => ({
    ...g,
    itemIds: g.itemIds.filter((id) => id !== itemId),
  }));
  return { ...lib, items, groups };
}

export function addGroup(lib: Library, name: string): Library {
  return {
    ...lib,
    groups: [...lib.groups, { id: uid(), name: name || "New group", itemIds: [] }],
  };
}

export function renameGroup(
  lib: Library,
  groupId: string,
  name: string,
): Library {
  return {
    ...lib,
    groups: lib.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
  };
}

/** Delete a group; its items move to the first remaining group. Keeps ≥1 group. */
export function deleteGroup(lib: Library, groupId: string): Library {
  if (lib.groups.length <= 1) return lib;
  const target = lib.groups.find((g) => g.id === groupId);
  if (!target) return lib;
  const remaining = lib.groups.filter((g) => g.id !== groupId);
  remaining[0] = {
    ...remaining[0],
    itemIds: [...remaining[0].itemIds, ...target.itemIds],
  };
  return { ...lib, groups: remaining };
}

/**
 * Move an item so it sits immediately before `beforeId` in `toGroupId`
 * (or at the end when `beforeId` is null). Removes it from wherever it was.
 */
export function moveItemBefore(
  lib: Library,
  itemId: string,
  toGroupId: string,
  beforeId: string | null,
): Library {
  const groups = lib.groups.map((g) => ({
    ...g,
    itemIds: g.itemIds.filter((id) => id !== itemId),
  }));
  const gi = groups.findIndex((g) => g.id === toGroupId);
  if (gi < 0) return lib;
  const ids = [...groups[gi].itemIds];
  let idx = beforeId ? ids.indexOf(beforeId) : ids.length;
  if (idx < 0) idx = ids.length;
  ids.splice(idx, 0, itemId);
  groups[gi] = { ...groups[gi], itemIds: ids };
  return { ...lib, groups };
}

/** Move a group so it sits immediately before `beforeId` (or last when null). */
export function moveGroupBefore(
  lib: Library,
  groupId: string,
  beforeId: string | null,
): Library {
  const moved = lib.groups.find((g) => g.id === groupId);
  if (!moved) return lib;
  const groups = lib.groups.filter((g) => g.id !== groupId);
  let idx = beforeId ? groups.findIndex((g) => g.id === beforeId) : groups.length;
  if (idx < 0) idx = groups.length;
  groups.splice(idx, 0, moved);
  return { ...lib, groups };
}

export function itemCount(lib: Library): number {
  return Object.keys(lib.items).length;
}
