"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ConfigPageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  itemCount?: number;
}

export function ConfigPageHeader({
  title,
  description,
  actionLabel,
  onAction,
  itemCount,
}: ConfigPageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {itemCount !== undefined && (
          <p className="text-xs text-muted-foreground">
            {itemCount} élément{itemCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      {onAction && (
        <Button onClick={onAction} className="mt-3 sm:mt-0">
          <Plus className="size-4" />
          {actionLabel ?? "Ajouter"}
        </Button>
      )}
    </div>
  );
}
