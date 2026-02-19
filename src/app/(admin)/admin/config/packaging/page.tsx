"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useConfigData } from "@/hooks/useConfigData";

interface PackagingOption {
  id: string;
  name: string;
  type: string;
  costPerUnit: number;
  costPerOrder: number;
  appliesTo: string[];
  active: boolean;
}

type PackagingRow = PackagingOption & Record<string, unknown>;

const PACKAGING_TYPE_OPTIONS = [
  { value: "CARTON", label: "Carton" },
  { value: "FILM", label: "Film" },
  { value: "ELASTIQUE", label: "Élastique" },
  { value: "CRYSTAL_BOX", label: "Boîte cristal" },
] as const;

const PRODUCT_TYPE_OPTIONS = [
  { value: "BROCHURE", label: "Brochure" },
  { value: "DEPLIANT", label: "Dépliant" },
  { value: "FLYER", label: "Flyer" },
  { value: "CARTE_DE_VISITE", label: "Carte de visite" },
] as const;

const PRODUCT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const EMPTY_FORM: Omit<PackagingOption, "id"> = {
  name: "",
  type: "CARTON",
  costPerUnit: 0,
  costPerOrder: 0,
  appliesTo: [],
  active: true,
};

function toNum(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const n = parseFloat(String(val ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

function formatCost(val: unknown): string {
  const n = toNum(val);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function toAppliesTo(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  return [];
}

export default function PackagingConfigPage() {
  const { data, isLoading, create, update, remove } =
    useConfigData<PackagingOption>("packaging");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Omit<PackagingOption, "id">>(
    EMPTY_FORM
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: PackagingOption) => {
    setEditingId(item.id);
    setFormState({
      name: item.name,
      type: item.type,
      costPerUnit: toNum(item.costPerUnit),
      costPerOrder: toNum(item.costPerOrder),
      appliesTo: toAppliesTo(item.appliesTo),
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

  const toggleAppliesTo = (value: string) => {
    setFormState((f) => ({
      ...f,
      appliesTo: f.appliesTo.includes(value)
        ? f.appliesTo.filter((t) => t !== value)
        : [...f.appliesTo, value],
    }));
  };

  const columns: ColumnDef<PackagingRow>[] = [
    {
      key: "name",
      header: "Nom",
      sortable: true,
    },
    {
      key: "type",
      header: "Type",
      cell: (item) => {
        const opt = PACKAGING_TYPE_OPTIONS.find((o) => o.value === item.type);
        return opt?.label ?? item.type;
      },
    },
    {
      key: "costPerUnit",
      header: "Coût/unité",
      cell: (item) => formatCost(item.costPerUnit),
    },
    {
      key: "costPerOrder",
      header: "Coût/commande",
      cell: (item) => formatCost(item.costPerOrder),
    },
    {
      key: "appliesTo",
      header: "S'applique à",
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {toAppliesTo(item.appliesTo).map((t) => (
            <Badge key={t} variant="outline">
              {PRODUCT_TYPE_LABELS[t] ?? t}
            </Badge>
          ))}
          {toAppliesTo(item.appliesTo).length === 0 && "—"}
        </div>
      ),
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
    ? (data as PackagingOption[]).find((d) => d.id === deleteId)
    : null;

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Conditionnement"
        description="Options d'emballage et coûts associés"
      />

      <ConfigDataTable<PackagingRow>
        data={data as PackagingRow[]}
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
        title={editingId ? "Modifier l'option" : "Ajouter une option"}
        onSubmit={handleSubmit}
        onCancel={() => setShowForm(false)}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="pkg-name">Nom</Label>
          <Input
            id="pkg-name"
            value={formState.name}
            onChange={(e) =>
              setFormState((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pkg-type">Type</Label>
          <Select
            value={formState.type}
            onValueChange={(v) =>
              setFormState((f) => ({ ...f, type: v }))
            }
          >
            <SelectTrigger id="pkg-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PACKAGING_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-cost-unit">Coût/unité (€)</Label>
            <Input
              id="pkg-cost-unit"
              type="number"
              step={0.01}
              min={0}
              value={formState.costPerUnit || ""}
              onChange={(e) =>
                setFormState((f) => ({
                  ...f,
                  costPerUnit: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-cost-order">Coût/commande (€)</Label>
            <Input
              id="pkg-cost-order"
              type="number"
              step={0.01}
              min={0}
              value={formState.costPerOrder || ""}
              onChange={(e) =>
                setFormState((f) => ({
                  ...f,
                  costPerOrder: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>S'applique à</Label>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`pkg-pt-${opt.value}`}
                  checked={formState.appliesTo.includes(opt.value)}
                  onCheckedChange={() => toggleAppliesTo(opt.value)}
                />
                <Label
                  htmlFor={`pkg-pt-${opt.value}`}
                  className="font-normal"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="pkg-active"
            checked={formState.active}
            onCheckedChange={(checked) =>
              setFormState((f) => ({ ...f, active: !!checked }))
            }
          />
          <Label htmlFor="pkg-active">Actif</Label>
        </div>
      </ConfigDialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer l'option"
        description={
          deletingItem
            ? `Supprimer l'option « ${deletingItem.name} » ? Cette action est irréversible.`
            : "Cette action est irréversible. Voulez-vous continuer ?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
