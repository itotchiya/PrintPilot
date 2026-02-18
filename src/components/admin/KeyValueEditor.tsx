"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Loader2, Pencil } from "lucide-react";

interface KeyValueItem {
  id: string;
  key: string;
  value: number;
  unit?: string | null;
  description?: string | null;
}

interface KeyValueEditorProps {
  items: KeyValueItem[];
  onSave: (id: string, value: number) => Promise<void>;
  isLoading?: boolean;
  title: string;
  description?: string;
}

function SkeletonCard() {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

function EditableValue({
  item,
  onSave,
}: {
  item: KeyValueItem;
  onSave: (id: string, value: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setDraft(String(item.value));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [item.value]);

  const commit = useCallback(async () => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed === item.value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(item.id, parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [draft, item.id, item.value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") setEditing(false);
    },
    [commit],
  );

  if (saving) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Enregistrement…
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          step="any"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-9 w-28 text-right"
          autoFocus
        />
        {item.unit && (
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        )}
        <button
          type="button"
          onClick={commit}
          className="rounded-md p-1 text-primary hover:bg-primary/10"
        >
          <Check className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-1.5",
        "text-sm font-medium text-foreground",
        "transition-colors hover:bg-muted",
      )}
    >
      <span>{item.value}</span>
      {item.unit && (
        <span className="text-muted-foreground">{item.unit}</span>
      )}
      <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function KeyValueEditor({
  items,
  onSave,
  isLoading = false,
  title,
  description,
}: KeyValueEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            Aucun élément trouvé
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium text-foreground">{item.key}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <EditableValue item={item} onSave={onSave} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
