"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addGroup,
  deleteGroup,
  deleteItem,
  ensureDefaultGroup,
  loadLibrary,
  moveGroupBefore,
  moveItemBefore,
  renameGroup,
  saveLibrary,
  type HistoryItem,
  type Library,
} from "@/lib/library";
import { QUESTION_TYPE_LABELS } from "@/lib/types";
import { BrandMark, PillButton } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import AuthButton from "@/components/AuthButton";
import SignInPrompt from "@/components/SignInPrompt";

interface Props {
  onOpenItem: (item: HistoryItem) => void;
  onNewSource: () => void;
  busy: boolean;
  busyLabel: string;
  error: string | null;
}

type ItemDrop = { groupId: string; beforeId: string | null };

export default function LibraryScreen({
  onOpenItem,
  onNewSource,
  busy,
  busyLabel,
  error,
}: Props) {
  const [library, setLibrary] = useState<Library>({ items: {}, groups: [] });
  const [query, setQuery] = useState("");

  // drag state
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [itemDrop, setItemDrop] = useState<ItemDrop | null>(null);
  const [groupDropBefore, setGroupDropBefore] = useState<string | null>(null);

  useEffect(() => {
    setLibrary(ensureDefaultGroup(loadLibrary()));
  }, []);

  // Reload when the cloud-sync layer pulls a fresh copy from the server.
  useEffect(() => {
    function reload() {
      setLibrary(ensureDefaultGroup(loadLibrary()));
    }
    window.addEventListener("recall:lib-remote", reload);
    return () => window.removeEventListener("recall:lib-remote", reload);
  }, []);

  function apply(next: Library) {
    setLibrary(next);
    saveLibrary(next);
  }

  const total = useMemo(
    () => library.groups.reduce((n, g) => n + g.itemIds.length, 0),
    [library],
  );

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return library.groups
      .flatMap((g) => g.itemIds)
      .map((id) => library.items[id])
      .filter((it) => it && it.title.toLowerCase().includes(q));
  }, [q, library]);

  function clearDrag() {
    setDragItemId(null);
    setDragGroupId(null);
    setItemDrop(null);
    setGroupDropBefore(null);
  }

  function onDropIntoGroup(groupId: string) {
    if (dragItemId && itemDrop && itemDrop.groupId === groupId) {
      apply(moveItemBefore(library, dragItemId, groupId, itemDrop.beforeId));
    } else if (dragItemId) {
      apply(moveItemBefore(library, dragItemId, groupId, null));
    }
    clearDrag();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-[16px] font-bold tracking-[0.22em]">RECALL</span>
        </div>
        <div className="flex items-center gap-3">
          {AUTH_ENABLED && <AuthButton />}
          <PillButton onClick={onNewSource} variant="light">
            New source
          </PillButton>
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            History
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            {total} source{total === 1 ? "" : "s"} · drag to reorder or move
            between groups
          </p>
        </div>
        <button
          onClick={() => apply(addGroup(library, "New group"))}
          className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:bg-[var(--tint)]"
          style={{ borderColor: "var(--line)", color: "var(--blue)" }}
        >
          + New group
        </button>
      </div>

      {total > 0 && (
        <div className="relative mb-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your sources…"
            aria-label="Search sources by title"
            className="w-full rounded-full border px-5 py-2.5 text-[14px] outline-none transition focus:border-[var(--blue)]"
            style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          />
          {q && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
              {matches.length} match{matches.length === 1 ? "" : "es"} for “{query.trim()}”
            </p>
          )}
        </div>
      )}

      {total === 0 && library.groups.every((g) => g.itemIds.length === 0) && (
        <div
          className="panel rounded-2xl p-8 text-center text-[15px]"
          style={{ color: "var(--muted)" }}
        >
          No sources yet. Study a link or file and it will show up here.
        </div>
      )}

      {busy && (
        <div
          className="mb-4 rounded-2xl px-5 py-4 text-center text-[15px] font-semibold tint"
          style={{ color: "var(--blue)" }}
        >
          {busyLabel || "Generating fresh questions from this source…"}
        </div>
      )}

      {error && (
        <div className="mb-4 flex flex-col items-center">
          <p className="text-center text-[14px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          {AUTH_ENABLED && /sign in/i.test(error) && <SignInPrompt />}
        </div>
      )}

      {q && (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <div
              className="panel rounded-2xl p-8 text-center text-[15px]"
              style={{ color: "var(--muted)" }}
            >
              No sources match “{query.trim()}”.
            </div>
          ) : (
            matches.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                dimmed={false}
                hideGrip
                onDragStartHandle={() => {}}
                onDragOver={() => {}}
                onDrop={() => {}}
                onDragEnd={() => {}}
                onOpen={() => onOpenItem(item)}
                onDelete={() => apply(deleteItem(library, item.id))}
              />
            ))
          )}
        </div>
      )}

      <div className="space-y-4" hidden={!!q}>
        {library.groups.map((group) => (
          <section
            key={group.id}
            className="panel rounded-2xl p-4"
            style={{
              outline:
                dragItemId && itemDrop?.groupId === group.id
                  ? "2px solid var(--blue)"
                  : "none",
              outlineOffset: "2px",
            }}
            onDragOver={(e) => {
              // group-level: append target for items, reorder target for groups
              if (dragItemId) {
                e.preventDefault();
                setItemDrop((d) =>
                  d && d.groupId === group.id ? d : { groupId: group.id, beforeId: null },
                );
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragItemId) onDropIntoGroup(group.id);
            }}
          >
            {/* group header */}
            <GroupHeader
              name={group.name}
              count={group.itemIds.length}
              canDelete={library.groups.length > 1}
              dragging={dragGroupId === group.id}
              groupDropActive={groupDropBefore === group.id}
              onDragStartHandle={() => setDragGroupId(group.id)}
              onHeaderDragOver={(e, half) => {
                if (!dragGroupId || dragGroupId === group.id) return;
                e.preventDefault();
                setGroupDropBefore(
                  half === "top"
                    ? group.id
                    : nextGroupId(library, group.id),
                );
              }}
              onHeaderDrop={(e) => {
                if (!dragGroupId) return;
                e.preventDefault();
                apply(moveGroupBefore(library, dragGroupId, groupDropBefore));
                clearDrag();
              }}
              onDragEnd={clearDrag}
              onRename={(name) => apply(renameGroup(library, group.id, name))}
              onDelete={() => apply(deleteGroup(library, group.id))}
            />

            {/* items */}
            <ul className="mt-3 space-y-2">
              {group.itemIds.length === 0 && (
                <li
                  className="rounded-xl border border-dashed px-3 py-4 text-center text-[13px]"
                  style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                >
                  Drop a source here
                </li>
              )}
              {group.itemIds.map((id) => {
                const item = library.items[id];
                if (!item) return null;
                const showLine =
                  itemDrop?.groupId === group.id && itemDrop.beforeId === id;
                return (
                  <li key={id}>
                    <DropLine active={!!showLine && !!dragItemId} />
                    <ItemRow
                      item={item}
                      dimmed={dragItemId === id}
                      onDragStartHandle={() => setDragItemId(id)}
                      onDragOver={(e, half) => {
                        if (!dragItemId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const ids = group.itemIds;
                        const i = ids.indexOf(id);
                        const beforeId =
                          half === "top"
                            ? id
                            : ids[i + 1] ?? null;
                        setItemDrop({ groupId: group.id, beforeId });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDropIntoGroup(group.id);
                      }}
                      onDragEnd={clearDrag}
                      onOpen={() => onOpenItem(item)}
                      onDelete={() => apply(deleteItem(library, id))}
                    />
                  </li>
                );
              })}
              {/* trailing drop line (append) */}
              <li>
                <DropLine
                  active={
                    !!dragItemId &&
                    itemDrop?.groupId === group.id &&
                    itemDrop.beforeId === null
                  }
                />
              </li>
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function nextGroupId(lib: Library, groupId: string): string | null {
  const i = lib.groups.findIndex((g) => g.id === groupId);
  return lib.groups[i + 1]?.id ?? null;
}

function DropLine({ active }: { active: boolean }) {
  return (
    <div
      className="my-1 h-0.5 rounded-full transition-colors"
      style={{ background: active ? "var(--blue)" : "transparent" }}
    />
  );
}

function Grip() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function halfOf(e: React.DragEvent): "top" | "bottom" {
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientY < rect.top + rect.height / 2 ? "top" : "bottom";
}

function GroupHeader({
  name,
  count,
  canDelete,
  dragging,
  groupDropActive,
  onDragStartHandle,
  onHeaderDragOver,
  onHeaderDrop,
  onDragEnd,
  onRename,
  onDelete,
}: {
  name: string;
  count: number;
  canDelete: boolean;
  dragging: boolean;
  groupDropActive: boolean;
  onDragStartHandle: () => void;
  onHeaderDragOver: (e: React.DragEvent, half: "top" | "bottom") => void;
  onHeaderDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-1 py-1"
      style={{
        borderTop: groupDropActive ? "2px solid var(--blue)" : "2px solid transparent",
        opacity: dragging ? 0.4 : 1,
      }}
      onDragOver={(e) => onHeaderDragOver(e, halfOf(e))}
      onDrop={onHeaderDrop}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "group");
          onDragStartHandle();
        }}
        onDragEnd={onDragEnd}
        className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
        style={{ color: "var(--muted)" }}
        title="Drag to reorder groups"
      >
        <Grip />
      </span>
      <input
        value={name}
        onChange={(e) => onRename(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none"
        style={{ color: "var(--ink)" }}
        aria-label="Group name"
      />
      <span
        className="rounded-full px-2 py-0.5 text-[12px] font-semibold tint"
        style={{ color: "var(--muted)" }}
      >
        {count}
      </span>
      {canDelete && (
        <button
          onClick={onDelete}
          className="px-2 text-[13px] font-semibold"
          style={{ color: "var(--muted)" }}
          title="Delete group (its sources move to the first group)"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ItemRow({
  item,
  dimmed,
  hideGrip,
  onDragStartHandle,
  onDragOver,
  onDrop,
  onDragEnd,
  onOpen,
  onDelete,
}: {
  item: HistoryItem;
  dimmed: boolean;
  hideGrip?: boolean;
  onDragStartHandle: () => void;
  onDragOver: (e: React.DragEvent, half: "top" | "bottom") => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const typeSummary = item.config.types
    .map((t) => QUESTION_TYPE_LABELS[t])
    .join(", ");
  return (
    <div
      ref={rowRef}
      className="flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition"
      style={{
        borderColor: "var(--line)",
        background: "var(--panel)",
        opacity: dimmed ? 0.4 : 1,
      }}
      onDragOver={(e) => !hideGrip && onDragOver(e, halfOf(e))}
      onDrop={hideGrip ? undefined : onDrop}
    >
      {!hideGrip && (
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "item");
            if (rowRef.current)
              e.dataTransfer.setDragImage(rowRef.current, 20, 20);
            onDragStartHandle();
          }}
          onDragEnd={onDragEnd}
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
          style={{ color: "var(--muted)" }}
          title="Drag to reorder or move to another group"
        >
          <Grip />
        </span>
      )}

      <button
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        title="Practice this source again"
      >
        <div className="truncate text-[15px] font-semibold">{item.title}</div>
        <div className="mt-0.5 truncate text-[12px]" style={{ color: "var(--muted)" }}>
          {date} · {item.config.count} q · {item.config.difficulty}
          {typeSummary ? ` · ${typeSummary}` : ""}
        </div>
      </button>

      {typeof item.lastScorePct === "number" && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold tint"
          style={{ color: "var(--blue)" }}
        >
          {item.lastScorePct}%
        </span>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 px-1.5 text-[13px]"
        style={{ color: "var(--muted)" }}
        title="Remove from history"
      >
        ✕
      </button>
    </div>
  );
}
