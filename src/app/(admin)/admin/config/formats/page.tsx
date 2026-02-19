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

interface FormatPreset {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  orientation: "PORTRAIT" | "LANDSCAPE" | "SQUARE";
  productTypes: string[];
  active: boolean;
}

type FormatRow = FormatPreset & Record<string, unknown>;

const ORIENTATION_LABELS: Record<FormatPreset["orientation"], string> = {
  PORTRAIT: "Portrait",
  LANDSCAPE: "Paysage",
  SQUARE: "Carré",
};

const PRODUCT_TYPE_OPTIONS = [
  { value: "BROCHURE", label: "Brochure" },
  { value: "DEPLIANT", label: "Dépliant" },
  { value: "FLYER", label: "Flyer" },
  { value: "CARTE_DE_VISITE", label: "Carte de visite" },
] as const;

const PRODUCT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const EMPTY_FORMAT: Omit<FormatPreset, "id"> = {
  name: "",
  widthCm: 0,
  heightCm: 0,
  orientation: "PORTRAIT",
  productTypes: [],
  active: true,
};

export default function FormatsConfigPage() {
  const { data, isLoading, create, update, remove } =
    useConfigData<FormatPreset>("formats");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormatPreset | null>(null);
  const [form, setForm] = useState(EMPTY_FORMAT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleting, setDeleting] = useState<FormatPreset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORMAT);
    setDialogOpen(true);
  };

  const openEdit = (item: FormatPreset) => {
    setEditing(item);
    setForm({
      name: item.name,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      orientation: item.orientation,
      productTypes: [...item.productTypes],
      active: item.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await update({ id: editing.id, ...form });
      } else {
        await create(form);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleProductType = (value: string) => {
    setForm((f) => ({
      ...f,
      productTypes: f.productTypes.includes(value)
        ? f.productTypes.filter((t) => t !== value)
        : [...f.productTypes, value],
    }));
  };

  const columns: ColumnDef<FormatRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    {
      key: "dimensions",
      header: "Dimensions (cm)",
      cell: (item) => `${item.widthCm} × ${item.heightCm}`,
    },
    {
      key: "orientation",
      header: "Orientation",
      cell: (item) => ORIENTATION_LABELS[item.orientation],
    },
    {
      key: "productTypes",
      header: "Types de produit",
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.productTypes.map((t) => (
            <Badge key={t} variant="outline">
              {PRODUCT_TYPE_LABELS[t] ?? t}
            </Badge>
          ))}
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
          <Button variant="ghost" size="icon" onClick={() => setDeleting(item)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Configuration Formats"
        description="Formats prédéfinis pour les produits"
      />

      <ConfigDataTable<FormatRow>
        data={data as FormatRow[]}
        columns={columns}
        searchField="name"
        searchPlaceholder="Rechercher un format…"
        onAdd={openAdd}
        addLabel="Ajouter un format"
        isLoading={isLoading}
      />

      {/* Add / Edit dialog */}
      <ConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Modifier le format" : "Ajouter un format"}
        onSubmit={handleSubmit}
        onCancel={() => setDialogOpen(false)}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="fmt-name">Nom</Label>
          <Input
            id="fmt-name"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fmt-width">Largeur (cm)</Label>
            <Input
              id="fmt-width"
              type="number"
              step="0.1"
              value={form.widthCm || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  widthCm: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fmt-height">Hauteur (cm)</Label>
            <Input
              id="fmt-height"
              type="number"
              step="0.1"
              value={form.heightCm || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  heightCm: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fmt-orientation">Orientation</Label>
          <Select
            value={form.orientation}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                orientation: v as FormatPreset["orientation"],
              }))
            }
          >
            <SelectTrigger id="fmt-orientation" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PORTRAIT">Portrait</SelectItem>
              <SelectItem value="LANDSCAPE">Paysage</SelectItem>
              <SelectItem value="SQUARE">Carré</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Types de produit</Label>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`pt-${opt.value}`}
                  checked={form.productTypes.includes(opt.value)}
                  onCheckedChange={() => toggleProductType(opt.value)}
                />
                <Label htmlFor={`pt-${opt.value}`} className="font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="fmt-active"
            checked={form.active}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, active: checked }))
            }
          />
          <Label htmlFor="fmt-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        title="Supprimer le format"
        description={`Supprimer le format « ${deleting?.name} » ? Cette action est irréversible.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
