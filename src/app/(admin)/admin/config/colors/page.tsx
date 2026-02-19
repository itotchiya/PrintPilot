"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useConfigData } from "@/hooks/useConfigData";

interface ColorMode {
  id: string;
  name: string;
  platesPerSide: number;
  hasVarnish: boolean;
  clickMultiplier: number;
  active: boolean;
}

type ColorModeRow = ColorMode & Record<string, unknown>;

const EMPTY_FORM: Omit<ColorMode, "id"> = {
  name: "",
  platesPerSide: 0,
  hasVarnish: false,
  clickMultiplier: 1,
  active: true,
};

function toNum(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const n = parseFloat(String(val ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export default function ColorsConfigPage() {
  const { data, isLoading, create, update, remove } =
    useConfigData<ColorMode>("colors");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Omit<ColorMode, "id">>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: ColorMode) => {
    setEditingId(item.id);
    setFormState({
      name: item.name,
      platesPerSide: item.platesPerSide,
      hasVarnish: item.hasVarnish,
      clickMultiplier: toNum(item.clickMultiplier),
      active: item.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await update({ id: editingId, ...formState });
      } else {
        await create(formState);
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await remove(deleteId);
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<ColorModeRow>[] = [
    {
      key: "name",
      header: "Nom",
      sortable: true,
    },
    {
      key: "platesPerSide",
      header: "Plaques/face",
      cell: (item) => item.platesPerSide,
    },
    {
      key: "hasVarnish",
      header: "Vernis",
      cell: (item) => (item.hasVarnish ? "Oui" : "Non"),
    },
    {
      key: "clickMultiplier",
      header: "Multiplicateur clic",
      cell: (item) => toNum(item.clickMultiplier),
    },
    {
      key: "active",
      header: "Statut",
      cell: (item) => <StatusBadge active={item.active} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(item.id)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const deletingItem = deleteId
    ? (data as ColorMode[]).find((d) => d.id === deleteId)
    : null;

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Modes de couleur"
        description="Modes d'impression et multiplicateurs"
      />

      <ConfigDataTable<ColorModeRow>
        data={data as ColorModeRow[]}
        columns={columns}
        searchField="name"
        searchPlaceholder="Rechercher…"
        onAdd={openAdd}
        addLabel="Ajouter"
        isLoading={isLoading}
      />

      <ConfigDialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editingId ? "Modifier le mode" : "Ajouter un mode"}
        onSubmit={handleSubmit}
        onCancel={() => setShowForm(false)}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="color-name">Nom</Label>
          <Input
            id="color-name"
            value={formState.name}
            onChange={(e) =>
              setFormState((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-plates">Plaques/face</Label>
          <Input
            id="color-plates"
            type="number"
            min={0}
            value={formState.platesPerSide || ""}
            onChange={(e) =>
              setFormState((f) => ({
                ...f,
                platesPerSide: parseInt(e.target.value, 10) || 0,
              }))
            }
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="color-varnish"
            checked={formState.hasVarnish}
            onCheckedChange={(checked) =>
              setFormState((f) => ({ ...f, hasVarnish: !!checked }))
            }
          />
          <Label htmlFor="color-varnish">Vernis</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-multiplier">Multiplicateur clic</Label>
          <Input
            id="color-multiplier"
            type="number"
            step={0.01}
            min={0}
            value={formState.clickMultiplier ?? ""}
            onChange={(e) =>
              setFormState((f) => ({
                ...f,
                clickMultiplier: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="color-active"
            checked={formState.active}
            onCheckedChange={(checked) =>
              setFormState((f) => ({ ...f, active: !!checked }))
            }
          />
          <Label htmlFor="color-active">Actif</Label>
        </div>
      </ConfigDialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le mode"
        description={
          deletingItem
            ? `Supprimer le mode « ${deletingItem.name} » ? Cette action est irréversible.`
            : "Cette action est irréversible. Voulez-vous continuer ?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
