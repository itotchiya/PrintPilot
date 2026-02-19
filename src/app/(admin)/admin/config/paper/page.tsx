"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfigDialog } from "@/components/admin/ConfigDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigPageHeader } from "@/components/admin/ConfigPageHeader";
import {
  ConfigDataTable,
  type ColumnDef,
} from "@/components/admin/ConfigDataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useConfigData } from "@/hooks/useConfigData";

interface PaperGrammage {
  id: string;
  paperTypeId: string;
  grammage: number;
  pricePerKg: number;
  weightPer1000Sheets: number | null;
  active: boolean;
}

interface PaperType {
  id: string;
  name: string;
  category: "INTERIOR" | "COVER" | "BOTH";
  sortOrder: number;
  active: boolean;
  grammages: PaperGrammage[];
}

type PaperTypeRow = PaperType & Record<string, unknown>;
type GrammageRow = PaperGrammage & Record<string, unknown>;

const CATEGORY_LABELS: Record<PaperType["category"], string> = {
  INTERIOR: "Intérieur",
  COVER: "Couverture",
  BOTH: "Les deux",
};

const CATEGORY_VARIANTS: Record<PaperType["category"], "outline" | "default"> = {
  INTERIOR: "outline",
  COVER: "outline",
  BOTH: "default",
};

const EMPTY_PAPER: Omit<PaperType, "id" | "grammages"> = {
  name: "",
  category: "INTERIOR",
  sortOrder: 0,
  active: true,
};

const EMPTY_GRAMMAGE: Omit<PaperGrammage, "id" | "paperTypeId"> = {
  grammage: 0,
  pricePerKg: 0,
  weightPer1000Sheets: null,
  active: true,
};

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export default function PaperConfigPage() {
  const { data, isLoading, refetch, create, update, remove } =
    useConfigData<PaperType>("paper");

  // Paper type form state
  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<PaperType | null>(null);
  const [paperForm, setPaperForm] = useState(EMPTY_PAPER);
  const [isSubmittingPaper, setIsSubmittingPaper] = useState(false);

  // Paper delete state
  const [deletingPaper, setDeletingPaper] = useState<PaperType | null>(null);
  const [isDeletingPaper, setIsDeletingPaper] = useState(false);

  // Grammage form state
  const [grammageDialogOpen, setGrammageDialogOpen] = useState(false);
  const [editingGrammage, setEditingGrammage] = useState<PaperGrammage | null>(null);
  const [grammageForm, setGrammageForm] = useState(EMPTY_GRAMMAGE);
  const [grammageParentId, setGrammageParentId] = useState<string | null>(null);
  const [isSubmittingGrammage, setIsSubmittingGrammage] = useState(false);

  // Grammage delete state
  const [deletingGrammage, setDeletingGrammage] = useState<{
    id: string;
    paperTypeId: string;
  } | null>(null);
  const [isDeletingGrammage, setIsDeletingGrammage] = useState(false);

  // Active tab (for view action: switch to paper type's grammages)
  const [activeTab, setActiveTab] = useState("types");

  // --- Paper Type handlers ---

  const openAddPaper = () => {
    setEditingPaper(null);
    setPaperForm(EMPTY_PAPER);
    setPaperDialogOpen(true);
  };

  const openEditPaper = (paper: PaperType) => {
    setEditingPaper(paper);
    setPaperForm({
      name: paper.name,
      category: paper.category,
      sortOrder: paper.sortOrder,
      active: paper.active,
    });
    setPaperDialogOpen(true);
  };

  const handlePaperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPaper(true);
    try {
      if (editingPaper) {
        await update({ id: editingPaper.id, ...paperForm });
      } else {
        await create(paperForm);
      }
      setPaperDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingPaper(false);
    }
  };

  const handleDeletePaper = async () => {
    if (!deletingPaper) return;
    setIsDeletingPaper(true);
    try {
      await remove(deletingPaper.id);
      setDeletingPaper(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingPaper(false);
    }
  };

  // --- Grammage handlers ---

  const openAddGrammage = (paperTypeId: string) => {
    setEditingGrammage(null);
    setGrammageForm(EMPTY_GRAMMAGE);
    setGrammageParentId(paperTypeId);
    setGrammageDialogOpen(true);
  };

  const openEditGrammage = (grammage: PaperGrammage) => {
    setEditingGrammage(grammage);
    setGrammageForm({
      grammage: grammage.grammage,
      pricePerKg: grammage.pricePerKg,
      weightPer1000Sheets: grammage.weightPer1000Sheets,
      active: grammage.active,
    });
    setGrammageParentId(grammage.paperTypeId);
    setGrammageDialogOpen(true);
  };

  const handleGrammageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grammageParentId) return;
    setIsSubmittingGrammage(true);
    try {
      const url = `/api/admin/config/paper/${grammageParentId}/grammages`;
      const body = editingGrammage
        ? { id: editingGrammage.id, ...grammageForm }
        : grammageForm;
      const res = await fetch(url, {
        method: editingGrammage ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success(
        editingGrammage ? "Grammage mis à jour" : "Grammage créé"
      );
      await refetch();
      setGrammageDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmittingGrammage(false);
    }
  };

  const handleDeleteGrammage = useCallback(async () => {
    if (!deletingGrammage) return;
    setIsDeletingGrammage(true);
    try {
      const res = await fetch(
        `/api/admin/config/paper/${deletingGrammage.paperTypeId}/grammages?id=${deletingGrammage.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur de suppression");
      }
      toast.success("Grammage supprimé");
      await refetch();
      setDeletingGrammage(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setIsDeletingGrammage(false);
    }
  }, [deletingGrammage, refetch]);

  // --- Column definitions ---

  const paperColumns: ColumnDef<PaperTypeRow>[] = [
    { key: "name", header: "Nom", sortable: true },
    {
      key: "category",
      header: "Catégorie",
      cell: (item) => (
        <Badge variant={CATEGORY_VARIANTS[item.category]}>
          {CATEGORY_LABELS[item.category]}
        </Badge>
      ),
    },
    { key: "sortOrder", header: "Ordre" },
    {
      key: "active",
      header: "Statut",
      cell: (item) => <StatusBadge active={item.active} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-[130px]",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab(item.id)}
            title="Voir les grammages"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditPaper(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingPaper(item)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const grammageColumns = (paperTypeId: string): ColumnDef<GrammageRow>[] => [
    { key: "grammage", header: "Grammage (g/m²)", sortable: true },
    {
      key: "pricePerKg",
      header: "Prix/kg (€)",
      cell: (item) => `${toNum(item.pricePerKg).toFixed(3)} €`,
    },
    {
      key: "weightPer1000Sheets",
      header: "Poids/1000 feuilles (kg)",
      cell: (item) =>
        item.weightPer1000Sheets != null
          ? `${toNum(item.weightPer1000Sheets).toFixed(2)} kg`
          : "—",
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditGrammage(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setDeletingGrammage({ id: item.id, paperTypeId })
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Configuration Papiers"
        description="Types de papier, grammages et prix au kg"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="types">Types de papier</TabsTrigger>
          {(data as PaperType[]).map((pt) => (
            <TabsTrigger key={pt.id} value={pt.id}>
              {pt.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Paper types tab */}
        <TabsContent value="types" className="mt-4">
          <ConfigDataTable<PaperTypeRow>
            data={data as PaperTypeRow[]}
            columns={paperColumns}
            searchField="name"
            searchPlaceholder="Rechercher un type de papier…"
            onAdd={openAddPaper}
            addLabel="Ajouter un type"
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Grammage tabs — one per paper type */}
        {(data as PaperType[]).map((pt) => (
          <TabsContent key={pt.id} value={pt.id} className="mt-4">
            <ConfigDataTable<GrammageRow>
              data={pt.grammages as GrammageRow[]}
              columns={grammageColumns(pt.id)}
              onAdd={() => openAddGrammage(pt.id)}
              addLabel="Ajouter un grammage"
              isLoading={isLoading}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Paper type add/edit dialog */}
      <ConfigDialog
        open={paperDialogOpen}
        onOpenChange={setPaperDialogOpen}
        title={editingPaper ? "Modifier le type de papier" : "Ajouter un type de papier"}
        onSubmit={handlePaperSubmit}
        onCancel={() => setPaperDialogOpen(false)}
        isSubmitting={isSubmittingPaper}
      >
        <div className="space-y-2">
          <Label htmlFor="paper-name">Nom</Label>
          <Input
            id="paper-name"
            value={paperForm.name}
            onChange={(e) =>
              setPaperForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paper-category">Catégorie</Label>
          <Select
            value={paperForm.category}
            onValueChange={(v) =>
              setPaperForm((f) => ({
                ...f,
                category: v as PaperType["category"],
              }))
            }
          >
            <SelectTrigger id="paper-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERIOR">Intérieur</SelectItem>
              <SelectItem value="COVER">Couverture</SelectItem>
              <SelectItem value="BOTH">Les deux</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paper-sort">Ordre de tri</Label>
          <Input
            id="paper-sort"
            type="number"
            value={paperForm.sortOrder}
            onChange={(e) =>
              setPaperForm((f) => ({
                ...f,
                sortOrder: parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="paper-active"
            checked={paperForm.active}
            onCheckedChange={(checked) =>
              setPaperForm((f) => ({ ...f, active: checked }))
            }
          />
          <Label htmlFor="paper-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Grammage add/edit dialog */}
      <ConfigDialog
        open={grammageDialogOpen}
        onOpenChange={setGrammageDialogOpen}
        title={editingGrammage ? "Modifier le grammage" : "Ajouter un grammage"}
        onSubmit={handleGrammageSubmit}
        onCancel={() => setGrammageDialogOpen(false)}
        isSubmitting={isSubmittingGrammage}
      >
        <div className="space-y-2">
          <Label htmlFor="gram-value">Grammage (g/m²)</Label>
          <Input
            id="gram-value"
            type="number"
            value={grammageForm.grammage || ""}
            onChange={(e) =>
              setGrammageForm((f) => ({
                ...f,
                grammage: parseFloat(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gram-price">Prix par kg (€)</Label>
          <Input
            id="gram-price"
            type="number"
            step="0.001"
            value={grammageForm.pricePerKg || ""}
            onChange={(e) =>
              setGrammageForm((f) => ({
                ...f,
                pricePerKg: parseFloat(e.target.value) || 0,
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gram-weight">Poids / 1000 feuilles (kg)</Label>
          <Input
            id="gram-weight"
            type="number"
            step="0.01"
            value={grammageForm.weightPer1000Sheets ?? ""}
            onChange={(e) =>
              setGrammageForm((f) => ({
                ...f,
                weightPer1000Sheets: e.target.value
                  ? parseFloat(e.target.value)
                  : null,
              }))
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="gram-active"
            checked={grammageForm.active}
            onCheckedChange={(checked) =>
              setGrammageForm((f) => ({ ...f, active: checked }))
            }
          />
          <Label htmlFor="gram-active">Actif</Label>
        </div>
      </ConfigDialog>

      {/* Paper delete confirmation */}
      <DeleteConfirmDialog
        open={!!deletingPaper}
        onOpenChange={(open) => !open && setDeletingPaper(null)}
        onConfirm={handleDeletePaper}
        title="Supprimer le type de papier"
        description={`Supprimer « ${deletingPaper?.name} » et tous ses grammages ? Cette action est irréversible.`}
        isDeleting={isDeletingPaper}
      />

      {/* Grammage delete confirmation */}
      <DeleteConfirmDialog
        open={!!deletingGrammage}
        onOpenChange={(open) => !open && setDeletingGrammage(null)}
        onConfirm={handleDeleteGrammage}
        title="Supprimer le grammage"
        description="Voulez-vous supprimer ce grammage ? Cette action est irréversible."
        isDeleting={isDeletingGrammage}
      />
    </div>
  );
}
